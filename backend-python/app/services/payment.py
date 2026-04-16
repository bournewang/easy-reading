from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from decimal import Decimal, InvalidOperation
from datetime import datetime, timedelta, timezone
from functools import cached_property
from typing import Any, Mapping
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from Crypto.PublicKey import RSA as CryptoRSA
from alipay.aop.api.AlipayClientConfig import AlipayClientConfig
from alipay.aop.api.DefaultAlipayClient import DefaultAlipayClient
from alipay.aop.api.domain.AlipayTradePagePayModel import AlipayTradePagePayModel
from alipay.aop.api.domain.AlipayTradeQueryModel import AlipayTradeQueryModel
from alipay.aop.api.request.AlipayTradePagePayRequest import AlipayTradePagePayRequest
from alipay.aop.api.request.AlipayTradeQueryRequest import AlipayTradeQueryRequest
from alipay.aop.api.util.SignatureUtils import get_sign_content, verify_with_rsa

from ..config import settings
from ..db import db_cursor, dumps_json, parse_dt, row_to_dict, utcnow_iso


PRICING_TIERS = {
    "pro": {
        1: 39.0,
        3: 105.0,
        6: 198.0,
        12: 336.0,
    },
}


class PaymentService:
    @staticmethod
    def _decode_key_value(value: str) -> str:
        return value.strip().replace("\\n", "\n").replace("\r\n", "\n")

    @staticmethod
    def _extract_pem_body(pem: str) -> str:
        return "".join(
            line.strip()
            for line in pem.splitlines()
            if line.strip() and not line.startswith("-----BEGIN") and not line.startswith("-----END")
        )

    def _normalize_private_key(self, raw_key: str) -> str:
        decoded = self._decode_key_value(raw_key)
        if not decoded:
            return ""
        if "BEGIN" not in decoded:
            decoded = f"-----BEGIN PRIVATE KEY-----\n{decoded}\n-----END PRIVATE KEY-----"
        private_key = CryptoRSA.import_key(decoded)
        pem = private_key.export_key(format="PEM", pkcs=1).decode("utf-8")
        return self._extract_pem_body(pem)

    def _normalize_public_key(self, raw_key: str) -> str:
        decoded = self._decode_key_value(raw_key)
        if not decoded:
            return ""
        if "BEGIN" not in decoded:
            decoded = f"-----BEGIN PUBLIC KEY-----\n{decoded}\n-----END PUBLIC KEY-----"
        public_key = CryptoRSA.import_key(decoded)
        pem = public_key.public_key().export_key(format="PEM").decode("utf-8")
        return self._extract_pem_body(pem)

    def is_alipay_configured(self) -> bool:
        return bool(
            settings.alipay_app_id
            and settings.alipay_private_key
            and settings.alipay_public_key
            and settings.alipay_notify_url
        )

    @cached_property
    def _alipay_client(self) -> DefaultAlipayClient | None:
        if not self.is_alipay_configured():
            return None

        config = AlipayClientConfig()
        config.app_id = settings.alipay_app_id
        config.app_private_key = self._normalize_private_key(settings.alipay_private_key)
        config.alipay_public_key = self._normalize_public_key(settings.alipay_public_key)
        config.server_url = settings.alipay_gateway_url
        return DefaultAlipayClient(config)

    def get_alipay_provider_config(self) -> dict[str, str | bool]:
        return {
            "appId": settings.alipay_app_id,
            "gatewayUrl": settings.alipay_gateway_url,
            "notifyUrl": settings.alipay_notify_url,
            "returnUrl": settings.alipay_return_url,
            "hasPrivateKey": bool(settings.alipay_private_key),
            "hasPublicKey": bool(settings.alipay_public_key),
            "configured": self.is_alipay_configured(),
        }

    def sign_payload(self, *parts: str) -> str:
        payload = "|".join(parts).encode("utf-8")
        secret = settings.payment_signing_secret.encode("utf-8")
        return hmac.new(secret, payload, hashlib.sha256).hexdigest()

    def verify_signature(self, signature: str | None, *parts: str) -> bool:
        if not signature:
            return False
        expected = self.sign_payload(*parts)
        return hmac.compare_digest(signature, expected)

    def append_query_params(self, url: str | None, params: dict[str, str]) -> str | None:
        if not url:
            return None

        split = urlsplit(url)
        existing = dict(parse_qsl(split.query, keep_blank_values=True))
        existing.update(params)
        return urlunsplit((split.scheme, split.netloc, split.path, urlencode(existing), split.fragment))

    def get_price(self, tier: str, duration: int) -> float:
        try:
            return PRICING_TIERS[tier][duration]
        except KeyError as exc:
            raise ValueError(f"Invalid tier/duration combination: {tier}/{duration}") from exc

    def create_order(
        self,
        *,
        user_id: str,
        payment_method: str,
        tier: str,
        duration: int,
        billing_mode: str = "prepaid",
        return_url: str | None = None,
        cancel_url: str | None = None,
    ) -> dict:
        if billing_mode not in {"prepaid", "recurring"}:
            raise ValueError(f"Invalid billing mode: {billing_mode}")
        if billing_mode == "recurring":
            raise ValueError("Recurring billing is currently disabled.")

        resolved_return_url = return_url
        resolved_cancel_url = cancel_url
        provider_details: dict[str, object] = {}

        if payment_method == "alipay":
            alipay_config = self.get_alipay_provider_config()
            resolved_return_url = return_url or settings.alipay_return_url or None
            provider_details = {
                "provider": "alipay",
                "appId": alipay_config["appId"],
                "gatewayUrl": alipay_config["gatewayUrl"],
                "notifyUrl": alipay_config["notifyUrl"],
                "configured": bool(
                    alipay_config["appId"]
                    and alipay_config["hasPrivateKey"]
                    and alipay_config["hasPublicKey"]
                ),
                "mode": "official" if self.is_alipay_configured() else "mock",
            }

        resolved_amount = self.get_price(tier, duration)
        resolved_order_id = f"{payment_method[:2].upper()}{int(datetime.now().timestamp())}{uuid.uuid4().hex[:8]}"
        now = utcnow_iso()
        confirmation_token = uuid.uuid4().hex
        payment_details = {
            "orderId": resolved_order_id,
            "amount": resolved_amount,
            "tier": tier,
            "duration": duration,
            "billingMode": billing_mode,
            "returnUrl": resolved_return_url,
            "cancelUrl": resolved_cancel_url,
            "confirmationToken": confirmation_token,
            **provider_details,
        }
        with db_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO orders (
                    id, user_id, amount, status, payment_method, tier, duration, payment_details, created_at, updated_at
                ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
                """,
                (
                    resolved_order_id,
                    user_id,
                    resolved_amount,
                    payment_method,
                    tier,
                    duration,
                    dumps_json(payment_details),
                    now,
                    now,
                ),
            )
        return self.get_order(resolved_order_id)

    def get_user_order(self, order_id: str, user_id: str) -> dict | None:
        order = self.get_order(order_id)
        if not order or order["user_id"] != user_id:
            return None
        return order

    def get_order(self, order_id: str) -> dict | None:
        with db_cursor() as cursor:
            cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
            row = row_to_dict(cursor.fetchone())
        if not row:
            return None
        row["payment_details"] = json.loads(row["payment_details"])
        return row

    def build_alipay_payment_url(self, order: dict) -> str:
        if order["payment_details"].get("mode") == "official":
            return self.build_official_alipay_payment_url(order)
        token = order["payment_details"].get("confirmationToken")
        return f"{settings.app_base_url.rstrip('/')}/mock-pay/alipay/{order['id']}?token={token}"

    def build_official_alipay_payment_url(self, order: dict) -> str:
        client = self._alipay_client
        if not client:
            raise ValueError("Alipay is not fully configured.")

        model = AlipayTradePagePayModel()
        model.out_trade_no = order["id"]
        model.total_amount = f"{Decimal(str(order['amount'])):.2f}"
        model.subject = f"Easy Reading Pro {order['duration']}-month plan"
        model.body = f"Easy Reading Pro subscription for {order['duration']} month(s)"
        model.product_code = "FAST_INSTANT_TRADE_PAY"
        model.timeout_express = "15m"
        model.passback_params = order["user_id"]

        request = AlipayTradePagePayRequest()
        request.biz_model = model
        request.notify_url = order["payment_details"].get("notifyUrl") or settings.alipay_notify_url
        request.return_url = order["payment_details"].get("returnUrl") or settings.alipay_return_url
        return client.page_execute(request, http_method="GET")

    def build_wechat_code_url(self, order: dict) -> str:
        token = order["payment_details"].get("confirmationToken")
        return f"{settings.app_base_url.rstrip('/')}/mock-pay/wechat/{order['id']}?token={token}"

    def _parse_alipay_query_response(self, response_content: str) -> dict[str, Any]:
        parsed = json.loads(response_content)
        if not isinstance(parsed, dict):
            raise ValueError("Unexpected Alipay response shape.")
        return parsed

    def sync_alipay_order_status(self, order: dict) -> dict:
        if order["payment_method"] != "alipay" or order["status"] == "success":
            return order
        if order["payment_details"].get("mode") != "official":
            return order

        client = self._alipay_client
        if not client:
            return order

        model = AlipayTradeQueryModel()
        model.out_trade_no = order["id"]
        request = AlipayTradeQueryRequest()
        request.biz_model = model

        try:
            response = self._parse_alipay_query_response(client.execute(request))
        except Exception:
            return order

        if response.get("code") != "10000":
            return order

        trade_status = response.get("trade_status")
        if trade_status in {"TRADE_SUCCESS", "TRADE_FINISHED"}:
            return self.mark_order_paid(order["id"], response.get("trade_no"))
        return order

    def verify_alipay_notification(self, payload: Mapping[str, str]) -> dict[str, Any]:
        client = self._alipay_client
        if not client:
            raise ValueError("Alipay is not fully configured.")

        sign = payload.get("sign")
        if not sign:
            raise ValueError("Missing Alipay signature.")

        sign_payload = {
            key: value
            for key, value in payload.items()
            if key not in {"sign", "sign_type"} and value not in {None, ""}
        }
        sign_content = get_sign_content(sign_payload).encode("utf-8")
        verified = verify_with_rsa(
            self._normalize_public_key(settings.alipay_public_key),
            sign_content,
            sign,
        )
        if not verified:
            raise ValueError("Invalid Alipay signature.")

        order_id = payload.get("out_trade_no")
        if not order_id:
            raise ValueError("Missing Alipay order ID.")

        order = self.get_order(order_id)
        if not order:
            raise ValueError("Order not found.")

        if payload.get("app_id") and payload.get("app_id") != settings.alipay_app_id:
            raise ValueError("Alipay app ID mismatch.")

        total_amount = payload.get("total_amount")
        if total_amount:
            try:
                notified_amount = Decimal(total_amount)
                expected_amount = Decimal(str(order["amount"]))
            except InvalidOperation as exc:
                raise ValueError("Invalid Alipay amount.") from exc
            if notified_amount != expected_amount:
                raise ValueError("Alipay amount mismatch.")

        trade_status = payload.get("trade_status", "")
        if trade_status in {"TRADE_SUCCESS", "TRADE_FINISHED"}:
            order = self.mark_order_paid(order_id, payload.get("trade_no"))

        return {
            "order": order,
            "tradeStatus": trade_status,
        }

    def mark_order_paid(self, order_id: str, transaction_id: str | None = None) -> dict:
        order = self.get_order(order_id)
        if not order:
            raise ValueError("Order not found.")
        if order["status"] == "success":
            return order

        details = order["payment_details"]
        details["transactionId"] = transaction_id or uuid.uuid4().hex
        details["paidAt"] = datetime.now(timezone.utc).isoformat()
        now = utcnow_iso()

        with db_cursor() as cursor:
            cursor.execute(
                """
                UPDATE orders
                SET status = 'success', payment_details = ?, updated_at = ?
                WHERE id = ?
                """,
                (dumps_json(details), now, order_id),
            )

        self.activate_subscription(order)
        return self.get_order(order_id)

    def activate_subscription(self, order: dict) -> None:
        user_id = order["user_id"]
        tier = order["tier"]
        duration_months = int(order["duration"])
        details = order["payment_details"]
        billing_mode = details.get("billingMode", "prepaid")
        auto_renew = 1 if billing_mode == "recurring" else 0

        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT *
                FROM subscriptions
                WHERE user_id = ? AND status IN ('active', 'canceling')
                ORDER BY current_period_end DESC
                LIMIT 1
                """,
                (user_id,),
            )
            current = row_to_dict(cursor.fetchone())

        now = datetime.now(timezone.utc)
        current_expiry = parse_dt(current["current_period_end"]) if current else None
        base = current_expiry if current_expiry and current_expiry > now else now
        extended = base + timedelta(days=30 * duration_months)
        started_at = parse_dt(current["started_at"]) if current else now
        subscription_id = current["id"] if current else str(uuid.uuid4())
        current_period_start = base if current_expiry and current_expiry and current_expiry > now else now
        now_iso = utcnow_iso()

        with db_cursor() as cursor:
            if current:
                cursor.execute(
                    """
                    UPDATE subscriptions
                    SET tier = ?, status = ?, billing_mode = ?, interval_months = ?, auto_renew = ?,
                        cancel_at_period_end = 0, current_period_start = ?, current_period_end = ?,
                        canceled_at = NULL, latest_order_id = ?, payment_method = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        tier,
                        "active",
                        billing_mode,
                        duration_months,
                        auto_renew,
                        current_period_start.isoformat(),
                        extended.isoformat(),
                        order["id"],
                        order["payment_method"],
                        now_iso,
                        subscription_id,
                    ),
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO subscriptions (
                        id, user_id, tier, status, billing_mode, interval_months, auto_renew,
                        cancel_at_period_end, started_at, current_period_start, current_period_end,
                        canceled_at, latest_order_id, payment_method, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL, ?, ?, ?, ?)
                    """,
                    (
                        subscription_id,
                        user_id,
                        tier,
                        "active",
                        billing_mode,
                        duration_months,
                        auto_renew,
                        started_at.isoformat(),
                        current_period_start.isoformat(),
                        extended.isoformat(),
                        order["id"],
                        order["payment_method"],
                        now_iso,
                        now_iso,
                    ),
                )

            cursor.execute(
                """
                UPDATE users
                SET subscription_tier = ?, subscription_expires = ?, updated_at = ?
                WHERE id = ?
                """,
                (tier, extended.isoformat(), now_iso, user_id),
            )

    def get_current_subscription(self, user_id: str) -> dict | None:
        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT *
                FROM subscriptions
                WHERE user_id = ?
                ORDER BY current_period_end DESC, updated_at DESC
                LIMIT 1
                """,
                (user_id,),
            )
            return row_to_dict(cursor.fetchone())

    def get_subscription_summary(self, user_id: str) -> dict:
        subscription = self.get_current_subscription(user_id)
        if not subscription:
            return {
                "subscriptionId": None,
                "tier": "free",
                "expiresAt": None,
                "active": False,
                "billingMode": None,
                "intervalMonths": None,
                "autoRenew": False,
                "cancelAtPeriodEnd": False,
            }

        expires_at = parse_dt(subscription["current_period_end"])
        active = bool(expires_at and expires_at > datetime.now(timezone.utc))
        return {
            "subscriptionId": subscription["id"],
            "tier": subscription["tier"] if active else "free",
            "expiresAt": expires_at,
            "active": active,
            "billingMode": subscription["billing_mode"],
            "intervalMonths": subscription["interval_months"],
            "autoRenew": bool(subscription["auto_renew"]) and active,
            "cancelAtPeriodEnd": bool(subscription["cancel_at_period_end"]) and active,
        }

    def cancel_subscription(self, user_id: str) -> dict:
        subscription = self.get_current_subscription(user_id)
        if not subscription:
            raise ValueError("No subscription found.")

        expires_at = parse_dt(subscription["current_period_end"])
        if not expires_at or expires_at <= datetime.now(timezone.utc):
            raise ValueError("Subscription is not active.")
        if subscription["billing_mode"] != "recurring":
            raise ValueError("Only recurring subscriptions can be canceled.")

        with db_cursor() as cursor:
            cursor.execute(
                """
                UPDATE subscriptions
                SET status = 'canceling', cancel_at_period_end = 1, auto_renew = 0, updated_at = ?
                WHERE id = ?
                """,
                (utcnow_iso(), subscription["id"]),
            )

        return self.get_subscription_summary(user_id)

    def reactivate_subscription(self, user_id: str) -> dict:
        subscription = self.get_current_subscription(user_id)
        if not subscription:
            raise ValueError("No subscription found.")

        expires_at = parse_dt(subscription["current_period_end"])
        if not expires_at or expires_at <= datetime.now(timezone.utc):
            raise ValueError("Subscription is not active.")
        if subscription["billing_mode"] != "recurring":
            raise ValueError("Only recurring subscriptions can be reactivated.")

        with db_cursor() as cursor:
            cursor.execute(
                """
                UPDATE subscriptions
                SET status = 'active', cancel_at_period_end = 0, auto_renew = 1, canceled_at = NULL, updated_at = ?
                WHERE id = ?
                """,
                (utcnow_iso(), subscription["id"]),
            )

        return self.get_subscription_summary(user_id)

    def get_entitlements(self, user_id: str) -> dict:
        subscription = self.get_subscription_summary(user_id)
        is_paid = subscription["active"] and subscription["tier"] == "pro"
        return {
            "tier": subscription["tier"],
            "active": subscription["active"],
            "canUseWordBook": True,
            "canTranslateSentences": is_paid,
            "canUseTextToSpeech": is_paid,
        }


payment_service = PaymentService()
