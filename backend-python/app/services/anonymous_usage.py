from __future__ import annotations

from datetime import datetime

from ..config import settings
from ..db import db_cursor, row_to_dict, utcnow_iso


ANONYMOUS_FEATURE_TRANSLATION = "translation"
ANONYMOUS_FEATURE_TTS = "tts"


class AnonymousUsageService:
    FEATURE_LIMITS = {
        ANONYMOUS_FEATURE_TRANSLATION: "anonymous_translation_daily_limit",
        ANONYMOUS_FEATURE_TTS: "anonymous_tts_daily_limit",
    }

    def get_limits(self) -> dict[str, int]:
        return {
            "translationDailyLimit": settings.anonymous_translation_daily_limit,
            "ttsDailyLimit": settings.anonymous_tts_daily_limit,
            "wordbookLimit": settings.anonymous_wordbook_limit,
            "historyLimit": settings.anonymous_history_limit,
        }

    def get_limit_for_feature(self, feature: str) -> int:
        setting_name = self.FEATURE_LIMITS.get(feature)
        if not setting_name:
            raise ValueError("Unsupported anonymous usage feature.")
        return int(getattr(settings, setting_name))

    @staticmethod
    def get_usage_date() -> str:
        return datetime.now().date().isoformat()

    def get_usage(self, anonymous_id: str, feature: str) -> dict[str, int | str]:
        usage_date = self.get_usage_date()
        limit = self.get_limit_for_feature(feature)

        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT count
                FROM anonymous_usage
                WHERE anonymous_id = ? AND feature = ? AND usage_date = ?
                """,
                (anonymous_id, feature, usage_date),
            )
            row = row_to_dict(cursor.fetchone()) or {}

        used_count = int(row.get("count") or 0)
        remaining_count = max(0, limit - used_count)
        return {
            "feature": feature,
            "dailyLimit": limit,
            "usedCount": used_count,
            "remainingCount": remaining_count,
            "usageDate": usage_date,
        }

    def consume(self, anonymous_id: str, feature: str, amount: int = 1) -> dict[str, int | str]:
        if amount <= 0:
            raise ValueError("Usage amount must be positive.")

        usage = self.get_usage(anonymous_id, feature)
        limit = int(usage["dailyLimit"])
        used_count = int(usage["usedCount"])
        next_count = used_count + amount

        if next_count > limit:
            raise ValueError(
                f"Anonymous {feature} limit reached for today. Limit: {limit}/day."
            )

        usage_date = str(usage["usageDate"])
        now = utcnow_iso()

        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id
                FROM anonymous_usage
                WHERE anonymous_id = ? AND feature = ? AND usage_date = ?
                """,
                (anonymous_id, feature, usage_date),
            )
            existing = row_to_dict(cursor.fetchone())

            if existing:
                cursor.execute(
                    """
                    UPDATE anonymous_usage
                    SET count = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (next_count, now, existing["id"]),
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO anonymous_usage (
                        anonymous_id, feature, usage_date, count, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (anonymous_id, feature, usage_date, next_count, now, now),
                )

        return {
            "feature": feature,
            "dailyLimit": limit,
            "usedCount": next_count,
            "remainingCount": max(0, limit - next_count),
            "usageDate": usage_date,
        }


anonymous_usage_service = AnonymousUsageService()
