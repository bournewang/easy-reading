from __future__ import annotations

from datetime import datetime

from ..config import settings
from ..db import db_cursor, row_to_dict, utcnow_iso


USER_FEATURE_TRANSLATION = "translation"
USER_FEATURE_TTS = "tts"


class UserUsageService:
    FEATURE_LIMITS = {
        USER_FEATURE_TRANSLATION: "free_translation_daily_limit",
        USER_FEATURE_TTS: "free_tts_daily_limit",
    }

    def get_limit_for_feature(self, feature: str) -> int:
        setting_name = self.FEATURE_LIMITS.get(feature)
        if not setting_name:
            raise ValueError("Unsupported user usage feature.")
        return int(getattr(settings, setting_name))

    @staticmethod
    def get_usage_date() -> str:
        return datetime.now().date().isoformat()

    def get_usage(self, user_id: int, feature: str) -> dict[str, int | str]:
        usage_date = self.get_usage_date()
        limit = self.get_limit_for_feature(feature)

        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT count
                FROM user_usage
                WHERE user_id = ? AND feature = ? AND usage_date = ?
                """,
                (user_id, feature, usage_date),
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

    def consume(self, user_id: int, feature: str, amount: int = 1) -> dict[str, int | str]:
        if amount <= 0:
            raise ValueError("Usage amount must be positive.")

        usage = self.get_usage(user_id, feature)
        limit = int(usage["dailyLimit"])
        used_count = int(usage["usedCount"])
        next_count = used_count + amount

        if next_count > limit:
            raise ValueError(f"Free plan {feature} limit reached for today. Limit: {limit}/day.")

        usage_date = str(usage["usageDate"])
        now = utcnow_iso()

        with db_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO user_usage (
                    user_id, feature, usage_date, count, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE count = VALUES(count), updated_at = VALUES(updated_at)
                """,
                (user_id, feature, usage_date, next_count, now, now),
            )

        return {
            "feature": feature,
            "dailyLimit": limit,
            "usedCount": next_count,
            "remainingCount": max(0, limit - next_count),
            "usageDate": usage_date,
        }


user_usage_service = UserUsageService()
