from __future__ import annotations

from typing import Any

from ..db import db_cursor, row_to_dict, utcnow_iso


class UserDataService:
    @staticmethod
    def _normalize_history_item(item: dict[str, Any]) -> dict[str, Any]:
        route_url = str(item.get("routeUrl") or "").strip()
        if not route_url:
            raise ValueError("routeUrl is required")

        title = str(item.get("title") or "").strip()
        subtitle = str(item.get("subtitle") or "").strip()
        kind = str(item.get("kind") or "").strip()
        if not title or not subtitle or not kind:
            raise ValueError("kind, title, and subtitle are required")

        return {
            "key": str(item.get("key") or route_url).strip() or route_url,
            "kind": kind,
            "routeUrl": route_url,
            "title": title,
            "subtitle": subtitle,
            "sourceUrl": str(item.get("sourceUrl") or "").strip() or None,
            "wordCount": int(item.get("wordCount") or 0),
            "readingTime": int(item.get("readingTime") or 0),
            "timestamp": int(item.get("timestamp") or 0),
        }

    @staticmethod
    def _history_row_to_payload(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "key": row["history_key"],
            "kind": row["kind"],
            "routeUrl": row["route_url"],
            "title": row["title"],
            "subtitle": row["subtitle"],
            "sourceUrl": row.get("source_url"),
            "wordCount": int(row.get("word_count") or 0),
            "readingTime": int(row.get("reading_time") or 0),
            "timestamp": int(row.get("timestamp") or 0),
        }

    @staticmethod
    def _normalize_word(word: str) -> str | None:
        normalized = str(word or "").strip().lower()
        return normalized or None

    def list_history(self, user_id: int) -> list[dict[str, Any]]:
        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT *
                FROM reading_history
                WHERE user_id = ?
                ORDER BY timestamp DESC, updated_at DESC
                """,
                (user_id,),
            )
            rows = cursor.fetchall()

        return [self._history_row_to_payload(row_to_dict(row) or {}) for row in rows]

    def upsert_history_item(self, user_id: int, item: dict[str, Any]) -> dict[str, Any]:
        normalized = self._normalize_history_item(item)
        now = utcnow_iso()

        with db_cursor() as cursor:
            cursor.execute(
                "SELECT id FROM reading_history WHERE user_id = ? AND history_key = ?",
                (user_id, normalized["key"]),
            )
            existing = row_to_dict(cursor.fetchone())

            if existing:
                cursor.execute(
                    """
                    UPDATE reading_history
                    SET kind = ?, route_url = ?, title = ?, subtitle = ?, source_url = ?,
                        word_count = ?, reading_time = ?, timestamp = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        normalized["kind"],
                        normalized["routeUrl"],
                        normalized["title"],
                        normalized["subtitle"],
                        normalized["sourceUrl"],
                        normalized["wordCount"],
                        normalized["readingTime"],
                        normalized["timestamp"],
                        now,
                        existing["id"],
                    ),
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO reading_history (
                        user_id, history_key, kind, route_url, title, subtitle, source_url,
                        word_count, reading_time, timestamp, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        user_id,
                        normalized["key"],
                        normalized["kind"],
                        normalized["routeUrl"],
                        normalized["title"],
                        normalized["subtitle"],
                        normalized["sourceUrl"],
                        normalized["wordCount"],
                        normalized["readingTime"],
                        normalized["timestamp"],
                        now,
                        now,
                    ),
                )

        return normalized

    def sync_history(self, user_id: int, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        for item in items:
            self.upsert_history_item(user_id, item)
        return self.list_history(user_id)

    def list_wordbook(self, user_id: int) -> list[dict[str, Any]]:
        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT word, created_at, updated_at
                FROM wordbook_entries
                WHERE user_id = ?
                ORDER BY updated_at DESC, word ASC
                """,
                (user_id,),
            )
            rows = cursor.fetchall()

        items: list[dict[str, Any]] = []
        for row in rows:
            payload = row_to_dict(row) or {}
            word = payload.get("word")
            if not word:
                continue
            items.append(
                {
                    "word": word,
                    "createdAt": payload.get("created_at"),
                    "updatedAt": payload.get("updated_at"),
                }
            )

        return items

    def add_word(self, user_id: int, word: str) -> dict[str, Any]:
        normalized = self._normalize_word(word)
        if not normalized:
            raise ValueError("word is required")

        now = utcnow_iso()
        with db_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO wordbook_entries (user_id, word, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at)
                """,
                (user_id, normalized, now, now),
            )
            cursor.execute(
                """
                SELECT word, created_at, updated_at
                FROM wordbook_entries
                WHERE user_id = ? AND word = ?
                """,
                (user_id, normalized),
            )
            saved = row_to_dict(cursor.fetchone()) or {}

        return {
            "word": saved.get("word", normalized),
            "createdAt": saved.get("created_at", now),
            "updatedAt": saved.get("updated_at", now),
        }

    def remove_word(self, user_id: int, word: str) -> None:
        normalized = self._normalize_word(word)
        if not normalized:
            return

        with db_cursor() as cursor:
            cursor.execute(
                "DELETE FROM wordbook_entries WHERE user_id = ? AND word = ?",
                (user_id, normalized),
            )

    def replace_wordbook(self, user_id: int, words: list[str]) -> list[dict[str, Any]]:
        normalized_words = sorted({word for word in (self._normalize_word(word) for word in words) if word})
        current = self.list_wordbook(user_id)
        current_words = {item["word"] for item in current}
        next_words = set(normalized_words)

        for word in current_words - next_words:
            self.remove_word(user_id, word)
        for word in next_words - current_words:
            self.add_word(user_id, word)

        return self.list_wordbook(user_id)

    def sync_wordbook(self, user_id: int, words: list[str]) -> list[dict[str, Any]]:
        for word in words:
            normalized = self._normalize_word(word)
            if normalized:
                self.add_word(user_id, normalized)
        return self.list_wordbook(user_id)


user_data_service = UserDataService()
