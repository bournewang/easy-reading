from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone

from ..config import settings
from ..db import db_cursor, dumps_json, parse_dt, row_to_dict, utcnow_iso


PRICING_TIERS = {
    "pro": {
        1: 39.0,
        3: 105.0,
        6: 198.0,
        12: 336.0,
    },
    "premium": {
        1: 49.0,
        3: 135.0,
        6: 258.0,
        12: 438.0,
    },
}


class PaymentService:
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
        amount: float | None = None,
        order_id: str | None = None,
    ) -> dict:
        resolved_amount = amount if amount is not None else self.get_price(tier, duration)
        resolved_order_id = order_id or f"{payment_method[:2].upper()}{int(datetime.now().timestamp())}{uuid.uuid4().hex[:8]}"
        now = utcnow_iso()
        payment_details = {
            "orderId": resolved_order_id,
            "amount": resolved_amount,
            "tier": tier,
            "duration": duration,
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

    def get_order(self, order_id: str) -> dict | None:
        with db_cursor() as cursor:
            cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
            row = row_to_dict(cursor.fetchone())
        if not row:
            return None
        row["payment_details"] = json.loads(row["payment_details"])
        return row

    def mark_order_paid(self, order_id: str, transaction_id: str | None = None) -> dict:
        order = self.get_order(order_id)
        if not order:
            raise ValueError("Order not found.")

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

        self.extend_user_subscription(order["user_id"], order["tier"], int(order["duration"]))
        return self.get_order(order_id)

    def extend_user_subscription(self, user_id: str, tier: str, duration_months: int) -> None:
        with db_cursor() as cursor:
            cursor.execute(
                "SELECT subscription_expires FROM users WHERE id = ?",
                (user_id,),
            )
            current = row_to_dict(cursor.fetchone())

        now = datetime.now(timezone.utc)
        current_expiry = parse_dt(current["subscription_expires"]) if current else None
        base = current_expiry if current_expiry and current_expiry > now else now
        extended = base + timedelta(days=30 * duration_months)

        with db_cursor() as cursor:
            cursor.execute(
                """
                UPDATE users
                SET subscription_tier = ?, subscription_expires = ?, updated_at = ?
                WHERE id = ?
                """,
                (tier, extended.isoformat(), utcnow_iso(), user_id),
            )


payment_service = PaymentService()
