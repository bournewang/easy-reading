from __future__ import annotations

import json
import re
import threading
import unicodedata
from datetime import datetime, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from ..config import settings
from ..db import db_cursor, dumps_json, row_to_dict, utcnow_iso


class NewsSyncError(Exception):
    pass


class NewsService:
    def __init__(self) -> None:
        self._sync_lock = threading.Lock()

    @staticmethod
    def _base_slug(title: str) -> str:
        normalized = unicodedata.normalize("NFKD", title)
        ascii_title = normalized.encode("ascii", "ignore").decode("ascii").lower()
        slug = re.sub(r"[^a-z0-9]+", "-", ascii_title).strip("-")
        return slug or "news-article"

    def _build_unique_slug(self, title: str, existing_slugs: set[str]) -> str:
        base_slug = self._base_slug(title)
        candidate = base_slug
        suffix = 2

        while candidate in existing_slugs:
            candidate = f"{base_slug}-{suffix}"
            suffix += 1

        existing_slugs.add(candidate)
        return candidate

    def _get_existing_article_ids(self) -> set[str]:
        with db_cursor() as cursor:
            cursor.execute("SELECT article_id FROM news")
            rows = cursor.fetchall()

        return {
            str(row.get("article_id") or "").strip()
            for raw_row in rows
            for row in [row_to_dict(raw_row) or {}]
            if str(row.get("article_id") or "").strip()
        }

    def _get_existing_slugs(self) -> set[str]:
        with db_cursor() as cursor:
            cursor.execute("SELECT slug FROM news WHERE slug IS NOT NULL AND slug != ''")
            rows = cursor.fetchall()

        return {
            str(row.get("slug") or "").strip()
            for raw_row in rows
            for row in [row_to_dict(raw_row) or {}]
            if str(row.get("slug") or "").strip()
        }

    @staticmethod
    def _normalize_article(article: dict[str, Any]) -> dict[str, Any]:
        article_id = str(article.get("id") or "").strip()
        title = str(article.get("title") or "").strip()
        url = str(article.get("url") or "").strip()

        if not article_id or not title or not url:
            raise NewsSyncError("Each news item must include id, title, and url.")

        reading_time = article.get("readingTime") or 0
        try:
            reading_time_value = max(0, int(reading_time))
        except (TypeError, ValueError):
            reading_time_value = 0

        return {
            "id": article_id,
            "title": title,
            "url": url,
            "category": str(article.get("category") or "general").strip() or "general",
            "description": str(article.get("description") or "").strip(),
            "imageUrl": str(article.get("imageUrl") or "").strip() or None,
            "source": str(article.get("source") or "").strip() or "Unknown",
            "readingTime": reading_time_value,
        }

    def _fetch_remote_articles(self) -> list[dict[str, Any]]:
        request = Request(
            settings.news_feed_url,
            headers={
                "Accept": "application/json",
                "User-Agent": "easy-reading-backend/0.1.0",
            },
        )

        try:
            with urlopen(request, timeout=settings.news_sync_timeout_seconds) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            raise NewsSyncError(f"News feed request failed with HTTP {exc.code}.") from exc
        except URLError as exc:
            raise NewsSyncError(f"News feed request failed: {exc.reason}.") from exc
        except json.JSONDecodeError as exc:
            raise NewsSyncError("News feed returned invalid JSON.") from exc

        if not isinstance(payload, list):
            raise NewsSyncError("News feed must return a JSON array.")

        articles = [self._normalize_article(item) for item in payload if isinstance(item, dict)]
        if not articles:
            raise NewsSyncError("News feed returned no articles.")

        return articles

    @staticmethod
    def _normalize_article_payload(payload: dict[str, Any], article: dict[str, Any]) -> dict[str, Any]:
        title = str(payload.get("title") or article["title"]).strip()
        site_name = str(payload.get("site_name") or article["source"] or "Unknown Site").strip()
        url = str(payload.get("url") or article["url"]).strip()
        raw_word_count = payload.get("word_count") or 0
        raw_reading_time = payload.get("reading_time") or 0

        try:
          word_count = max(0, int(raw_word_count))
        except (TypeError, ValueError):
          word_count = 0

        try:
          reading_time = max(0, int(raw_reading_time))
        except (TypeError, ValueError):
          reading_time = 0

        if not reading_time and word_count:
            reading_time = max(1, (word_count + 149) // 150)

        paragraphs = payload.get("paragraphs")
        if not isinstance(paragraphs, dict) or not paragraphs:
            raise NewsSyncError(f"Article extractor returned no paragraphs for {article['url']}.")

        normalized = {
            "title": title,
            "site_name": site_name,
            "url": url,
            "word_count": word_count,
            "paragraphs": paragraphs,
            "unfamiliar_words": payload.get("unfamiliar_words") or [],
            "reading_time": reading_time,
            "created_at": str(payload.get("created_at") or utcnow_iso()),
        }
        return normalized

    def _fetch_article_payload(self, article: dict[str, Any]) -> dict[str, Any]:
        if not settings.article_extractor_url:
            raise NewsSyncError("ARTICLE_EXTRACTOR_URL is required for syncing article content.")

        extractor_url = f"{settings.article_extractor_url}?{urlencode({'url': article['url']})}"
        request = Request(
            extractor_url,
            headers={
                "Accept": "application/json",
                "User-Agent": "easy-reading-backend/0.1.0",
            },
        )

        try:
            with urlopen(request, timeout=settings.news_sync_timeout_seconds) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            raise NewsSyncError(f"Article extractor failed with HTTP {exc.code} for {article['url']}.") from exc
        except URLError as exc:
            raise NewsSyncError(f"Article extractor request failed for {article['url']}: {exc.reason}.") from exc
        except json.JSONDecodeError as exc:
            raise NewsSyncError(f"Article extractor returned invalid JSON for {article['url']}.") from exc

        if not isinstance(payload, dict):
            raise NewsSyncError(f"Article extractor returned an invalid payload for {article['url']}.")

        return self._normalize_article_payload(payload, article)

    def get_last_synced_at(self) -> str | None:
        with db_cursor() as cursor:
            cursor.execute("SELECT MAX(synced_at) AS last_synced_at FROM news")
            row = row_to_dict(cursor.fetchone()) or {}
        return row.get("last_synced_at")

    def sync_if_stale(self, *, force: bool = False) -> str | None:
        last_synced_at = self.get_last_synced_at()
        today = datetime.now(timezone.utc).date()
        if not force and last_synced_at:
            try:
                synced_date = datetime.fromisoformat(last_synced_at.replace("Z", "+00:00")).date()
            except ValueError:
                synced_date = None
            if synced_date == today:
                return last_synced_at

        with self._sync_lock:
            last_synced_at = self.get_last_synced_at()
            if not force and last_synced_at:
                try:
                    synced_date = datetime.fromisoformat(last_synced_at.replace("Z", "+00:00")).date()
                except ValueError:
                    synced_date = None
                if synced_date == today:
                    return last_synced_at

            articles = self._fetch_remote_articles()
            synced_at = utcnow_iso()
            existing_article_ids = self._get_existing_article_ids()
            existing_slugs = self._get_existing_slugs()

            with db_cursor() as cursor:
                inserted_count = 0
                skipped_count = 0
                for article in articles:
                    if article["id"] in existing_article_ids:
                        skipped_count += 1
                        print(
                            "[news-sync] skipped existing article "
                            f"id={article['id']} url={article['url']}"
                        )
                        continue

                    print(
                        f"[news-sync] parsing article id={article['id']} source={article['source']} url={article['url']}"
                    )
                    try:
                        article_payload = self._fetch_article_payload(article)
                    except Exception as exc:
                        skipped_count += 1
                        print(
                            "[news-sync] skipped article "
                            f"id={article['id']} url={article['url']} error={exc}"
                        )
                        continue
                    print(
                        "[news-sync] parsed article "
                        f"id={article['id']} title={article_payload['title']!r} "
                        f"site={article_payload['site_name']!r} "
                        f"word_count={article_payload['word_count']} "
                        f"paragraphs={len(article_payload['paragraphs'])}"
                    )
                    final_title = str(article_payload.get("title") or article["title"]).strip() or article["title"]
                    final_slug = self._build_unique_slug(final_title, existing_slugs)
                    cursor.execute(
                        """
                        INSERT INTO news (
                            article_id, slug, title, url, category, description, image_url, source,
                            site_name, word_count, reading_time, article_payload,
                            synced_at, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            article["id"],
                            final_slug,
                            final_title,
                            article["url"],
                            article["category"],
                            article["description"],
                            article["imageUrl"],
                            article["source"],
                            article_payload["site_name"],
                            article_payload["word_count"],
                            article_payload["reading_time"] or article["readingTime"],
                            dumps_json(article_payload),
                            synced_at,
                            synced_at,
                            synced_at,
                        ),
                    )
                    print(
                        "[news-sync] inserted article "
                        f"id={article['id']} category={article['category']} "
                        f"slug={final_slug} title={final_title!r} "
                        f"reading_time={article_payload['reading_time'] or article['readingTime']} "
                        f"synced_at={synced_at}"
                    )
                    existing_article_ids.add(article["id"])
                    inserted_count += 1

                print(
                    f"[news-sync] completed synced_at={synced_at} inserted={inserted_count} skipped={skipped_count}"
                )

            return synced_at

    def list_news(
        self,
        *,
        category: str | None = None,
        source: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        last_synced_at = self.get_last_synced_at()

        filters: list[str] = []
        params: list[Any] = []

        normalized_category = (category or "").strip()
        if normalized_category:
            filters.append("category = ?")
            params.append(normalized_category)

        normalized_source = (source or "").strip()
        if normalized_source:
            filters.append("source = ?")
            params.append(normalized_source)

        normalized_search = (search or "").strip().lower()
        if normalized_search:
            filters.append("(LOWER(title) LIKE ? OR LOWER(description) LIKE ?)")
            search_term = f"%{normalized_search}%"
            params.extend([search_term, search_term])

        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
        safe_page = max(1, page)
        safe_page_size = max(1, min(100, page_size))
        offset = (safe_page - 1) * safe_page_size

        with db_cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) AS total FROM news {where_clause}", tuple(params))
            total_row = row_to_dict(cursor.fetchone()) or {}
            total = int(total_row.get("total") or 0)

            cursor.execute(
                f"""
                SELECT article_id, title, url, category, description, image_url, source, site_name, word_count, reading_time, synced_at
                       , slug
                FROM news
                {where_clause}
                ORDER BY synced_at DESC, slug ASC, article_id ASC
                LIMIT ? OFFSET ?
                """,
                tuple([*params, safe_page_size, offset]),
            )
            rows = cursor.fetchall()

            cursor.execute("SELECT DISTINCT category FROM news WHERE category IS NOT NULL AND category != '' ORDER BY category ASC")
            category_rows = cursor.fetchall()

            cursor.execute("SELECT DISTINCT source FROM news WHERE source IS NOT NULL AND source != '' ORDER BY source ASC")
            source_rows = cursor.fetchall()

        items = [
            {
                "id": row.get("slug") or row["article_id"],
                "title": row["title"],
                "url": row["url"],
                "category": row["category"],
                "description": row.get("description") or "",
                "imageUrl": row.get("image_url"),
                "source": row.get("source") or "Unknown",
                "readingTime": int(row.get("reading_time") or 0),
            }
            for raw_row in rows
            for row in [row_to_dict(raw_row) or {}]
        ]

        total_pages = max(1, (total + safe_page_size - 1) // safe_page_size) if total else 0

        return {
            "items": items,
            "page": safe_page,
            "pageSize": safe_page_size,
            "total": total,
            "totalPages": total_pages,
            "categories": [row_to_dict(row)["category"] for row in category_rows if row_to_dict(row)],
            "sources": [row_to_dict(row)["source"] for row in source_rows if row_to_dict(row)],
            "lastSyncedAt": last_synced_at,
        }

    def list_news_categories(self) -> dict[str, Any]:
        last_synced_at = self.get_last_synced_at()

        with db_cursor() as cursor:
            cursor.execute(
                "SELECT DISTINCT category FROM news WHERE category IS NOT NULL AND category != '' ORDER BY category ASC"
            )
            category_rows = cursor.fetchall()

            cursor.execute(
                """
                SELECT n.category, COALESCE(n.slug, n.article_id) AS article_id
                FROM news n
                WHERE n.category IS NOT NULL
                  AND n.category != ''
                  AND n.synced_at = (
                    SELECT MAX(n2.synced_at)
                    FROM news n2
                    WHERE n2.category = n.category
                      AND n2.category IS NOT NULL
                      AND n2.category != ''
                  )
                ORDER BY n.category ASC, COALESCE(n.slug, n.article_id) ASC
                """
            )
            first_article_rows = cursor.fetchall()

        categories = [row_to_dict(row)["category"] for row in category_rows if row_to_dict(row)]

        first_article_by_category: dict[str, str] = {}
        for raw_row in first_article_rows:
            row = row_to_dict(raw_row) or {}
            category = row.get("category")
            article_id = row.get("article_id")
            if category and article_id and category not in first_article_by_category:
                first_article_by_category[category] = article_id

        return {
            "categories": categories,
            "firstArticleByCategory": first_article_by_category,
            "lastSyncedAt": last_synced_at,
        }

    def get_news_article(self, article_id: str) -> dict[str, Any] | None:
        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT article_id, slug, article_payload, synced_at
                FROM news
                WHERE slug = ? OR article_id = ?
                LIMIT 1
                """,
                (article_id, article_id),
            )
            row = row_to_dict(cursor.fetchone()) or {}

        payload = row.get("article_payload")
        if not payload:
            return None

        try:
            article = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise NewsSyncError(f"Stored article payload is invalid for {article_id}.") from exc

        if not isinstance(article, dict):
            raise NewsSyncError(f"Stored article payload has invalid shape for {article_id}.")

        return {
            "id": row.get("slug") or row.get("article_id"),
            "article": article,
            "syncedAt": row.get("synced_at"),
        }


news_service = NewsService()
