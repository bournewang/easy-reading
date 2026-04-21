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
    "free": {
        "isPopular": False,
        "originalPricePerMonth": 0.0,
        "durationOptions": [],
    },
    "pro": {
        "isPopular": True,
        "originalPricePerMonth": 59.0,
        "durationOptions": [
            {"months": 1, "salePricePerMonth": 39.0},
            {"months": 3, "salePricePerMonth": 33.0, "default": True},
            {"months": 6, "salePricePerMonth": 28.0},
            {"months": 12, "salePricePerMonth": 24.0},
        ],
    },
}

DEFAULT_REFERRAL_DISCOUNT_RATE = 0.10
DEFAULT_REFERRAL_DISCOUNT_CAP = 50.0
DEFAULT_COMMISSION_RATE = 0.15


class PaymentService:
    SAMPLE_COUPONS = (
        {
            "code": "WELCOME10",
            "description": "10% off for new checkout tests",
            "discount_type": "percent",
            "discount_value": 10.0,
            "min_amount": 0.0,
            "max_discount_amount": None,
            "max_redemptions": None,
            "per_user_limit": 1,
        },
        {
            "code": "SAVE30",
            "description": "Flat 30 yuan off for marketing tests",
            "discount_type": "fixed",
            "discount_value": 30.0,
            "min_amount": 100.0,
            "max_discount_amount": None,
            "max_redemptions": None,
            "per_user_limit": 1,
        },
        {
            "code": "SPRING20",
            "description": "20% off capped at 80 yuan",
            "discount_type": "percent",
            "discount_value": 20.0,
            "min_amount": 0.0,
            "max_discount_amount": 80.0,
            "max_redemptions": None,
            "per_user_limit": 2,
        },
    )

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

    def ensure_sample_coupons(self) -> None:
        now = utcnow_iso()
        with db_cursor() as cursor:
            for coupon in self.SAMPLE_COUPONS:
                cursor.execute("SELECT id FROM coupons WHERE code = ?", (coupon["code"],))
                existing = row_to_dict(cursor.fetchone())
                if existing:
                    continue
                cursor.execute(
                    """
                    INSERT INTO coupons (
                        code, description, discount_type, discount_value, min_amount,
                        max_discount_amount, max_redemptions, per_user_limit, active,
                        starts_at, ends_at, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, NULL, ?, ?)
                    """,
                    (
                        coupon["code"],
                        coupon["description"],
                        coupon["discount_type"],
                        coupon["discount_value"],
                        coupon["min_amount"],
                        coupon["max_discount_amount"],
                        coupon["max_redemptions"],
                        coupon["per_user_limit"],
                        now,
                        now,
                    ),
                )

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
        return float(self.get_duration_option(tier, duration)["salePrice"])

    def get_duration_option(self, tier: str, duration: int) -> dict[str, Any]:
        try:
            tier_config = PRICING_TIERS[tier]
        except KeyError as exc:
            raise ValueError(f"Invalid tier/duration combination: {tier}/{duration}") from exc
        duration_options = tier_config["durationOptions"]
        for option in duration_options:
            if option["months"] == duration:
                return self.expand_duration_option(tier_config, option)
        raise ValueError(f"Invalid tier/duration combination: {tier}/{duration}")

    @staticmethod
    def expand_duration_option(tier_config: dict[str, Any], option: dict[str, Any]) -> dict[str, Any]:
        months = int(option["months"])
        original_price_per_month = float(tier_config.get("originalPricePerMonth") or 0.0)
        sale_price_per_month = float(option["salePricePerMonth"])
        original_price = round(original_price_per_month * months, 2)
        sale_price = round(sale_price_per_month * months, 2)
        return {
            "months": months,
            "originalPricePerMonth": original_price_per_month,
            "salePricePerMonth": sale_price_per_month,
            "originalPrice": original_price,
            "salePrice": sale_price,
            "savings": PaymentService.calculate_savings_percentage(original_price, sale_price),
            "default": bool(option.get("default", False)),
        }

    def _normalize_promo_code(self, promo_code: str | None) -> str | None:
        if not promo_code:
            return None
        normalized = promo_code.strip().upper()
        return normalized or None

    def get_coupon(self, promo_code: str | None) -> dict | None:
        normalized = self._normalize_promo_code(promo_code)
        if not normalized:
            return None
        with db_cursor() as cursor:
            cursor.execute("SELECT * FROM coupons WHERE code = ?", (normalized,))
            return row_to_dict(cursor.fetchone())

    def get_user_by_referral_code(self, promo_code: str | None) -> dict | None:
        normalized = self._normalize_promo_code(promo_code)
        if not normalized:
            return None
        with db_cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE referral_code = ?", (normalized,))
            return row_to_dict(cursor.fetchone())

    def get_user_referrer(self, user_id: int) -> dict | None:
        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT referrer.*
                FROM users AS referred
                JOIN users AS referrer ON referrer.id = referred.referred_by_user_id
                WHERE referred.id = ?
                """,
                (user_id,),
            )
            return row_to_dict(cursor.fetchone())

    def has_successful_order(self, user_id: int) -> bool:
        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*) AS count
                FROM orders
                WHERE user_id = ? AND status = 'success'
                """,
                (user_id,),
            )
            row = row_to_dict(cursor.fetchone()) or {}
        return int(row.get("count", 0)) > 0

    def validate_coupon(self, promo_code: str | None, *, user_id: int, sale_amount: float) -> tuple[dict | None, float]:
        coupon = self.get_coupon(promo_code)
        if not coupon:
            return None, 0.0
        if not coupon.get("active"):
            raise ValueError("This coupon code is not active.")

        now = datetime.now(timezone.utc)
        starts_at = parse_dt(coupon.get("starts_at"))
        ends_at = parse_dt(coupon.get("ends_at"))
        if starts_at and starts_at > now:
            raise ValueError("This coupon code is not active yet.")
        if ends_at and ends_at < now:
            raise ValueError("This coupon code has expired.")
        if float(coupon.get("min_amount") or 0) > sale_amount:
            raise ValueError("This coupon code requires a higher order amount.")

        with db_cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) AS count FROM coupon_redemptions WHERE coupon_id = ? AND status = 'redeemed'",
                (coupon["id"],),
            )
            total_usage = (row_to_dict(cursor.fetchone()) or {}).get("count", 0)
            cursor.execute(
                """
                SELECT COUNT(*) AS count
                FROM coupon_redemptions
                WHERE coupon_id = ? AND user_id = ? AND status = 'redeemed'
                """,
                (coupon["id"], user_id),
            )
            user_usage = (row_to_dict(cursor.fetchone()) or {}).get("count", 0)

        max_redemptions = coupon.get("max_redemptions")
        per_user_limit = coupon.get("per_user_limit")
        if max_redemptions is not None and int(total_usage) >= int(max_redemptions):
            raise ValueError("This coupon code has reached its redemption limit.")
        if per_user_limit is not None and int(user_usage) >= int(per_user_limit):
            raise ValueError("You have already used this coupon code.")

        if coupon["discount_type"] == "percent":
            coupon_discount = sale_amount * (float(coupon["discount_value"]) / 100.0)
        else:
            coupon_discount = float(coupon["discount_value"])

        max_discount_amount = coupon.get("max_discount_amount")
        if max_discount_amount is not None:
            coupon_discount = min(coupon_discount, float(max_discount_amount))

        return coupon, round(max(coupon_discount, 0.0), 2)

    def resolve_promo_code(self, promo_code: str | None, *, user_id: int, sale_amount: float) -> dict[str, Any]:
        normalized = self._normalize_promo_code(promo_code)
        if not normalized:
            return {
                "promoCode": None,
                "coupon": None,
                "couponDiscountAmount": 0.0,
                "referrer": None,
                "referralDiscountAmount": 0.0,
            }

        coupon = self.get_coupon(normalized)
        if coupon:
            coupon, coupon_discount_amount = self.validate_coupon(
                normalized,
                user_id=user_id,
                sale_amount=sale_amount,
            )
            return {
                "promoCode": normalized,
                "coupon": coupon,
                "couponDiscountAmount": round(coupon_discount_amount, 2),
                "referrer": None,
                "referralDiscountAmount": 0.0,
            }

        referrer = self.get_user_by_referral_code(normalized)
        if referrer:
            if referrer["id"] == user_id:
                raise ValueError("You cannot use your own promo code.")
            if self.has_successful_order(user_id):
                raise ValueError("Referral promo codes are only available for a first purchase.")
            referral_discount_amount = round(sale_amount * DEFAULT_REFERRAL_DISCOUNT_RATE, 2)
            return {
                "promoCode": normalized,
                "coupon": None,
                "couponDiscountAmount": 0.0,
                "referrer": referrer,
                "referralDiscountAmount": min(referral_discount_amount, DEFAULT_REFERRAL_DISCOUNT_CAP),
            }

        raise ValueError("This promo code is invalid.")

    def quote_pricing(
        self,
        *,
        user_id: int,
        tier: str,
        duration: int,
        promo_code: str | None = None,
    ) -> dict[str, Any]:
        option = self.get_duration_option(tier, duration)
        original_amount = float(option["originalPrice"])
        sale_amount = float(option["salePrice"])
        base_discount_amount = round(max(original_amount - sale_amount, 0.0), 2)

        resolved_promo = self.resolve_promo_code(promo_code, user_id=user_id, sale_amount=sale_amount)
        referrer = resolved_promo["referrer"]
        referral_discount_amount = float(resolved_promo["referralDiscountAmount"])
        coupon = resolved_promo["coupon"]
        coupon_discount_amount = float(resolved_promo["couponDiscountAmount"])
        final_amount = round(max(sale_amount - referral_discount_amount - coupon_discount_amount, 0.0), 2)
        commission_amount = round(final_amount * DEFAULT_COMMISSION_RATE, 2) if referrer else 0.0

        return {
            "tier": tier,
            "duration": duration,
            "originalAmount": original_amount,
            "saleAmount": sale_amount,
            "discountAmount": round(base_discount_amount + referral_discount_amount + coupon_discount_amount, 2),
            "finalAmount": final_amount,
            "promoCode": resolved_promo["promoCode"],
            "couponCode": coupon["code"] if coupon else None,
            "couponId": coupon["id"] if coupon else None,
            "couponDiscountAmount": round(coupon_discount_amount, 2),
            "referralCode": referrer["referral_code"] if referrer else None,
            "referrerUserId": referrer["id"] if referrer else None,
            "referralDiscountAmount": referral_discount_amount,
            "commissionAmount": commission_amount,
            "commissionRate": DEFAULT_COMMISSION_RATE if referrer else 0.0,
            "paymentMode": "prepaid",
        }

    def get_pricing_catalog(self) -> list[dict[str, Any]]:
        tiers: list[dict[str, Any]] = []
        for tier_id, config in PRICING_TIERS.items():
            duration_options = [
                self.expand_duration_option(config, option)
                for option in config["durationOptions"]
            ]
            original_monthly_price = None
            sale_monthly_price = None
            if duration_options:
                original_monthly_price = float(config.get("originalPricePerMonth") or 0.0)
                sale_monthly_price = min(option["salePricePerMonth"] for option in duration_options)
            tiers.append(
                {
                    "id": tier_id,
                    "isPopular": bool(config.get("isPopular", False)),
                    "originalMonthlyPrice": original_monthly_price,
                    "saleMonthlyPrice": sale_monthly_price,
                    "durationOptions": duration_options,
                }
            )
        return tiers

    @staticmethod
    def calculate_savings_percentage(original_price: float, sale_price: float) -> int | None:
        if original_price <= 0 or sale_price >= original_price:
            return None
        savings_ratio = (original_price - sale_price) / original_price
        return round(savings_ratio * 100)

    @staticmethod
    def format_order_no(order_id: int, created_at: datetime | None = None) -> str:
        order_date = created_at or datetime.now()
        return f"{order_date.strftime('%Y%m%d')}-{order_id:05d}"

    @staticmethod
    def _hydrate_order(row: dict[str, Any] | None) -> dict | None:
        if not row:
            return None
        row["payment_details"] = json.loads(row["payment_details"])
        return row

    def create_order(
        self,
        *,
        user_id: int,
        payment_method: str,
        tier: str,
        duration: int,
        billing_mode: str = "prepaid",
        return_url: str | None = None,
        cancel_url: str | None = None,
        promo_code: str | None = None,
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

        quote = self.quote_pricing(
            user_id=user_id,
            tier=tier,
            duration=duration,
            promo_code=promo_code,
        )
        now = utcnow_iso()
        confirmation_token = uuid.uuid4().hex
        payment_details = {
            "amount": quote["finalAmount"],
            "tier": tier,
            "duration": duration,
            "billingMode": billing_mode,
            "returnUrl": resolved_return_url,
            "cancelUrl": resolved_cancel_url,
            "confirmationToken": confirmation_token,
            "originalAmount": quote["originalAmount"],
            "saleAmount": quote["saleAmount"],
            "discountAmount": quote["discountAmount"],
            "promoCode": quote["promoCode"],
            "couponCode": quote["couponCode"],
            "couponId": quote["couponId"],
            "couponDiscountAmount": quote["couponDiscountAmount"],
            "referralCode": quote["referralCode"],
            "referrerUserId": quote["referrerUserId"],
            "referralDiscountAmount": quote["referralDiscountAmount"],
            "commissionAmount": quote["commissionAmount"],
            "commissionRate": quote["commissionRate"],
            **provider_details,
        }
        with db_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO orders (
                    order_no, user_id, original_amount, sale_amount, discount_amount, amount, status, payment_method,
                    tier, duration, coupon_code, referral_code, payment_details, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    f"TEMP-{confirmation_token}",
                    user_id,
                    quote["originalAmount"],
                    quote["saleAmount"],
                    quote["discountAmount"],
                    quote["finalAmount"],
                    payment_method,
                    tier,
                    duration,
                    quote["couponCode"] or quote["promoCode"],
                    quote["referralCode"],
                    dumps_json(payment_details),
                    now,
                    now,
                ),
            )
            order_id = int(cursor.lastrowid)
            order_no = self.format_order_no(order_id, datetime.now())
            payment_details["orderId"] = order_id
            payment_details["orderNo"] = order_no
            cursor.execute(
                """
                UPDATE orders
                SET order_no = ?, payment_details = ?
                WHERE id = ?
                """,
                (order_no, dumps_json(payment_details), order_id),
            )
        return self.get_order(order_id)

    def get_user_order(self, order_no: str, user_id: int) -> dict | None:
        order = self.get_order_by_no(order_no)
        if not order or order["user_id"] != user_id:
            return None
        return order

    def get_order(self, order_id: int) -> dict | None:
        with db_cursor() as cursor:
            cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
            return self._hydrate_order(row_to_dict(cursor.fetchone()))

    def get_order_by_no(self, order_no: str) -> dict | None:
        with db_cursor() as cursor:
            cursor.execute("SELECT * FROM orders WHERE order_no = ?", (order_no,))
            return self._hydrate_order(row_to_dict(cursor.fetchone()))

    def build_alipay_payment_url(self, order: dict) -> str:
        if order["payment_details"].get("mode") == "official":
            return self.build_official_alipay_payment_url(order)
        token = order["payment_details"].get("confirmationToken")
        return f"{settings.app_base_url.rstrip('/')}/mock-pay/alipay/{order['order_no']}?token={token}"

    def _mark_coupon_redeemed(self, order: dict) -> None:
        coupon_id = order["payment_details"].get("couponId")
        coupon_code = order["payment_details"].get("couponCode")
        discount_amount = float(order["payment_details"].get("couponDiscountAmount") or 0)
        if not coupon_id or not coupon_code or discount_amount <= 0:
            return
        now = utcnow_iso()
        with db_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO coupon_redemptions (
                    coupon_id, code, user_id, order_id, discount_amount, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, 'redeemed', ?, ?)
                """,
                (coupon_id, coupon_code, order["user_id"], order["id"], discount_amount, now, now),
            )

    def _record_referral_commission(self, order: dict) -> None:
        referrer_user_id = order["payment_details"].get("referrerUserId")
        referral_code = order["payment_details"].get("referralCode")
        commission_amount = float(order["payment_details"].get("commissionAmount") or 0)
        commission_rate = float(order["payment_details"].get("commissionRate") or 0)

        if not referrer_user_id or not referral_code:
            registered_referrer = self.get_user_referrer(int(order["user_id"]))
            if registered_referrer:
                referrer_user_id = registered_referrer["id"]
                referral_code = registered_referrer.get("referral_code")
                commission_rate = DEFAULT_COMMISSION_RATE
                commission_amount = round(float(order["amount"] or 0) * DEFAULT_COMMISSION_RATE, 2)

        if not referrer_user_id or not referral_code or commission_amount <= 0:
            return
        now = utcnow_iso()
        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id FROM referral_commissions WHERE order_id = ?
                """,
                (order["id"],),
            )
            if cursor.fetchone():
                return
            cursor.execute(
                """
                INSERT INTO referral_commissions (
                    order_id, referrer_user_id, referred_user_id, referral_code,
                    commission_rate, commission_amount, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
                """,
                (
                    order["id"],
                    referrer_user_id,
                    order["user_id"],
                    referral_code,
                    commission_rate,
                    commission_amount,
                    now,
                    now,
                ),
            )
            cursor.execute(
                """
                UPDATE users
                SET referred_by_user_id = COALESCE(referred_by_user_id, ?), updated_at = ?
                WHERE id = ?
                """,
                (referrer_user_id, now, order["user_id"]),
            )

    def build_official_alipay_payment_url(self, order: dict) -> str:
        client = self._alipay_client
        if not client:
            raise ValueError("Alipay is not fully configured.")

        model = AlipayTradePagePayModel()
        model.out_trade_no = order["order_no"]
        model.total_amount = f"{Decimal(str(order['amount'])):.2f}"
        model.subject = f"Easy Reading Pro {order['duration']}-month plan"
        model.body = f"Easy Reading Pro subscription for {order['duration']} month(s)"
        model.product_code = "FAST_INSTANT_TRADE_PAY"
        model.timeout_express = "15m"
        model.passback_params = str(order["user_id"])

        request = AlipayTradePagePayRequest()
        request.biz_model = model
        request.notify_url = order["payment_details"].get("notifyUrl") or settings.alipay_notify_url
        request.return_url = order["payment_details"].get("returnUrl") or settings.alipay_return_url
        return client.page_execute(request, http_method="GET")

    def build_wechat_code_url(self, order: dict) -> str:
        token = order["payment_details"].get("confirmationToken")
        return f"{settings.app_base_url.rstrip('/')}/mock-pay/wechat/{order['order_no']}?token={token}"

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
        model.out_trade_no = order["order_no"]
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
            return self.mark_order_paid(order["order_no"], response.get("trade_no"))
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

        order_no = payload.get("out_trade_no")
        if not order_no:
            raise ValueError("Missing Alipay order ID.")

        order = self.get_order_by_no(order_no)
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
            order = self.mark_order_paid(order_no, payload.get("trade_no"))

        return {
            "order": order,
            "tradeStatus": trade_status,
        }

    def mark_order_paid(self, order_ref: str | int, transaction_id: str | None = None) -> dict:
        order = self.get_order_by_no(order_ref) if isinstance(order_ref, str) else self.get_order(order_ref)
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
                (dumps_json(details), now, order["id"]),
            )

        self.activate_subscription(order)
        paid_order = self.get_order(order["id"])
        if paid_order:
            self._mark_coupon_redeemed(paid_order)
            self._record_referral_commission(paid_order)
            return paid_order
        return order

    def activate_subscription(self, order: dict) -> None:
        user_id = int(order["user_id"])
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
                        current["id"],
                    ),
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO subscriptions (
                        user_id, tier, status, billing_mode, interval_months, auto_renew,
                        cancel_at_period_end, started_at, current_period_start, current_period_end,
                        canceled_at, latest_order_id, payment_method, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL, ?, ?, ?, ?)
                    """,
                    (
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

    def get_current_subscription(self, user_id: int) -> dict | None:
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

    def get_subscription_summary(self, user_id: int) -> dict:
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

    def cancel_subscription(self, user_id: int) -> dict:
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

    def reactivate_subscription(self, user_id: int) -> dict:
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

    def get_entitlements(self, user_id: int) -> dict:
        subscription = self.get_subscription_summary(user_id)
        is_paid = subscription["active"] and subscription["tier"] == "pro"
        return {
            "tier": subscription["tier"],
            "active": subscription["active"],
            "canUseWordBook": True,
            "canTranslateSentences": True,
            "canUseTextToSpeech": True,
            "hasUnlimitedTranslation": is_paid,
            "hasUnlimitedTextToSpeech": is_paid,
            "translationDailyLimit": None if is_paid else settings.free_translation_daily_limit,
            "ttsDailyLimit": None if is_paid else settings.free_tts_daily_limit,
        }

    def get_referral_summary(self, user_id: int) -> dict[str, Any]:
        with db_cursor() as cursor:
            cursor.execute("SELECT referral_code FROM users WHERE id = ?", (user_id,))
            user = row_to_dict(cursor.fetchone())
            if not user or not user.get("referral_code"):
                raise ValueError("User referral profile not found.")

            cursor.execute("SELECT COUNT(*) AS count FROM users WHERE referred_by_user_id = ?", (user_id,))
            total_referrals = int((row_to_dict(cursor.fetchone()) or {}).get("count", 0))
            cursor.execute(
                "SELECT COUNT(*) AS count FROM referral_commissions WHERE referrer_user_id = ?",
                (user_id,),
            )
            successful_referrals = int((row_to_dict(cursor.fetchone()) or {}).get("count", 0))
            cursor.execute(
                """
                SELECT
                    COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) AS pending_commission,
                    COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) AS paid_commission,
                    COALESCE(SUM(commission_amount), 0) AS total_commission
                FROM referral_commissions
                WHERE referrer_user_id = ?
                """,
                (user_id,),
            )
            totals = row_to_dict(cursor.fetchone()) or {}

        referral_code = str(user["referral_code"])
        return {
            "referralCode": referral_code,
            "referralLink": f"{settings.app_base_url.rstrip('/')}/register?ref={referral_code}",
            "totalReferrals": total_referrals,
            "successfulReferrals": successful_referrals,
            "pendingCommission": float(totals.get("pending_commission") or 0),
            "paidCommission": float(totals.get("paid_commission") or 0),
            "totalCommission": float(totals.get("total_commission") or 0),
        }


payment_service = PaymentService()
