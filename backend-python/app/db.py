from __future__ import annotations

import json
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator
from urllib.parse import urlparse

try:
    import pymysql
    from pymysql.cursors import DictCursor
except Exception:  # pragma: no cover - dependency may not be installed yet
    pymysql = None
    DictCursor = None

from .config import settings


if pymysql is not None:
    DBIntegrityError = pymysql.err.IntegrityError
else:  # pragma: no cover - import failure is handled in get_connection()
    class DBIntegrityError(Exception):
        pass


def utcnow_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def parse_dt(value: str | datetime | None) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        # Ensure datetime is timezone-aware; if naive, assume UTC
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    # Parse ISO format string and ensure it's timezone-aware
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class CursorAdapter:
    def __init__(self, cursor: Any) -> None:
        self._cursor = cursor

    def execute(self, sql: str, params: tuple | list | None = None) -> Any:
        translated = sql.replace("?", "%s")
        if params is None:
            return self._cursor.execute(translated)
        return self._cursor.execute(translated, params)

    def fetchone(self) -> Any:
        return self._cursor.fetchone()

    def fetchall(self) -> list[Any]:
        return self._cursor.fetchall()

    def __getattr__(self, item: str) -> Any:
        return getattr(self._cursor, item)


def get_connection() -> Any:
    if pymysql is None:
        raise RuntimeError("PyMySQL is required for MySQL support. Run `pip install -r requirements.txt`.")

    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is required.")
    if not settings.database_url.startswith(("mysql://", "mysql+pymysql://")):
        raise RuntimeError("DATABASE_URL must be a MySQL URL.")

    parsed = urlparse(settings.database_url)
    db_name = parsed.path.lstrip("/")
    try:
        return pymysql.connect(
            host=parsed.hostname or "127.0.0.1",
            port=parsed.port or 3306,
            user=parsed.username or "root",
            password=parsed.password or "",
            database=db_name,
            charset="utf8mb4",
            autocommit=False,
            cursorclass=DictCursor,
        )
    except Exception as exc:
        raise RuntimeError(
            "MySQL connection failed. "
            f"host={parsed.hostname or '127.0.0.1'} "
            f"port={parsed.port or 3306} "
            f"user={parsed.username or 'root'} "
            f"database={db_name or '(missing)'} "
            f"error={exc}"
        ) from exc


@contextmanager
def db_cursor() -> Iterator[CursorAdapter]:
    conn = get_connection()
    try:
        cursor = CursorAdapter(conn.cursor())
        yield cursor
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with db_cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(191) NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                full_name VARCHAR(255) NULL,
                referral_code VARCHAR(64) NULL UNIQUE,
                referred_by_user_id BIGINT NULL,
                subscription_tier VARCHAR(64) DEFAULT 'free',
                subscription_expires VARCHAR(64) NULL,
                created_at VARCHAR(64) NOT NULL,
                updated_at VARCHAR(64) NOT NULL
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                token VARCHAR(191) NOT NULL UNIQUE,
                user_id BIGINT NOT NULL,
                expires_at VARCHAR(64) NOT NULL,
                created_at VARCHAR(64) NOT NULL,
                INDEX idx_sessions_user_id (user_id)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )
        ensure_column(cursor, "users", "referral_code", "ALTER TABLE users ADD COLUMN referral_code VARCHAR(64) NULL UNIQUE")
        ensure_column(cursor, "users", "referred_by_user_id", "ALTER TABLE users ADD COLUMN referred_by_user_id BIGINT NULL")
        ensure_column(cursor, "users", "commission_rate", "ALTER TABLE users ADD COLUMN commission_rate DOUBLE NULL COMMENT 'Custom commission rate override. NULL means use system default.'")
        ensure_column(cursor, "users", "is_admin", "ALTER TABLE users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0")
        ensure_column(cursor, "users", "email", "ALTER TABLE users ADD COLUMN email VARCHAR(191) NULL UNIQUE")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT NOT NULL,
                token VARCHAR(191) NOT NULL UNIQUE,
                expires_at VARCHAR(64) NOT NULL,
                used TINYINT(1) NOT NULL DEFAULT 0,
                created_at VARCHAR(64) NOT NULL,
                INDEX idx_prt_user_id (user_id),
                INDEX idx_prt_token (token)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS orders (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                order_no VARCHAR(64) NOT NULL UNIQUE,
                user_id BIGINT NOT NULL,
                original_amount DOUBLE NOT NULL DEFAULT 0,
                sale_amount DOUBLE NOT NULL DEFAULT 0,
                discount_amount DOUBLE NOT NULL DEFAULT 0,
                amount DOUBLE NOT NULL,
                status VARCHAR(64) NOT NULL,
                payment_method VARCHAR(64) NOT NULL,
                tier VARCHAR(64) NOT NULL,
                duration INT NOT NULL,
                coupon_code VARCHAR(64) NULL,
                referral_code VARCHAR(64) NULL,
                payment_details LONGTEXT NOT NULL,
                created_at VARCHAR(64) NOT NULL,
                updated_at VARCHAR(64) NOT NULL,
                INDEX idx_orders_order_no (order_no),
                INDEX idx_orders_user_id (user_id)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )
        ensure_column(cursor, "orders", "order_no", "ALTER TABLE orders ADD COLUMN order_no VARCHAR(64) NULL")
        ensure_column(
            cursor,
            "orders",
            "original_amount",
            "ALTER TABLE orders ADD COLUMN original_amount DOUBLE NOT NULL DEFAULT 0",
        )
        ensure_column(
            cursor,
            "orders",
            "sale_amount",
            "ALTER TABLE orders ADD COLUMN sale_amount DOUBLE NOT NULL DEFAULT 0",
        )
        ensure_column(
            cursor,
            "orders",
            "discount_amount",
            "ALTER TABLE orders ADD COLUMN discount_amount DOUBLE NOT NULL DEFAULT 0",
        )
        ensure_column(cursor, "orders", "coupon_code", "ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(64) NULL")
        ensure_column(cursor, "orders", "referral_code", "ALTER TABLE orders ADD COLUMN referral_code VARCHAR(64) NULL")
        cursor.execute(
            """
            UPDATE orders
            SET order_no = CONCAT(
                DATE_FORMAT(
                    COALESCE(
                        STR_TO_DATE(created_at, '%Y-%m-%dT%H:%i:%sZ'),
                        UTC_TIMESTAMP()
                    ),
                    '%Y%m%d'
                ),
                '-',
                LPAD(CAST(id AS CHAR), 5, '0')
            )
            WHERE order_no IS NULL OR order_no = ''
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS subscriptions (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT NOT NULL,
                tier VARCHAR(64) NOT NULL,
                status VARCHAR(64) NOT NULL,
                billing_mode VARCHAR(64) NOT NULL,
                interval_months INT NOT NULL,
                auto_renew TINYINT(1) NOT NULL DEFAULT 0,
                cancel_at_period_end TINYINT(1) NOT NULL DEFAULT 0,
                started_at VARCHAR(64) NOT NULL,
                current_period_start VARCHAR(64) NOT NULL,
                current_period_end VARCHAR(64) NOT NULL,
                canceled_at VARCHAR(64) NULL,
                latest_order_id BIGINT NULL,
                payment_method VARCHAR(64) NULL,
                created_at VARCHAR(64) NOT NULL,
                updated_at VARCHAR(64) NOT NULL,
                INDEX idx_subscriptions_user_id (user_id)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS coupons (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(64) NOT NULL UNIQUE,
                description VARCHAR(255) NULL,
                discount_type VARCHAR(32) NOT NULL,
                discount_value DOUBLE NOT NULL,
                min_amount DOUBLE NOT NULL DEFAULT 0,
                max_discount_amount DOUBLE NULL,
                max_redemptions INT NULL,
                per_user_limit INT NULL,
                active TINYINT(1) NOT NULL DEFAULT 1,
                starts_at VARCHAR(64) NULL,
                ends_at VARCHAR(64) NULL,
                created_at VARCHAR(64) NOT NULL,
                updated_at VARCHAR(64) NOT NULL
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS coupon_redemptions (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                coupon_id BIGINT NOT NULL,
                code VARCHAR(64) NOT NULL,
                user_id BIGINT NOT NULL,
                order_id BIGINT NULL,
                discount_amount DOUBLE NOT NULL DEFAULT 0,
                status VARCHAR(64) NOT NULL,
                created_at VARCHAR(64) NOT NULL,
                updated_at VARCHAR(64) NOT NULL,
                INDEX idx_coupon_redemptions_coupon_id (coupon_id),
                INDEX idx_coupon_redemptions_user_id (user_id)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS referral_commissions (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                order_id BIGINT NOT NULL,
                referrer_user_id BIGINT NOT NULL,
                referred_user_id BIGINT NOT NULL,
                referral_code VARCHAR(64) NOT NULL,
                commission_rate DOUBLE NOT NULL DEFAULT 0,
                commission_amount DOUBLE NOT NULL DEFAULT 0,
                status VARCHAR(64) NOT NULL,
                created_at VARCHAR(64) NOT NULL,
                updated_at VARCHAR(64) NOT NULL,
                INDEX idx_referral_commissions_referrer (referrer_user_id),
                INDEX idx_referral_commissions_referred (referred_user_id)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS reading_history (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT NOT NULL,
                history_key VARCHAR(255) NOT NULL,
                kind VARCHAR(64) NOT NULL,
                route_url VARCHAR(1024) NOT NULL,
                title VARCHAR(255) NOT NULL,
                subtitle VARCHAR(255) NOT NULL,
                source_url VARCHAR(1024) NULL,
                word_count INT NOT NULL DEFAULT 0,
                reading_time INT NOT NULL DEFAULT 0,
                timestamp BIGINT NOT NULL DEFAULT 0,
                created_at VARCHAR(64) NOT NULL,
                updated_at VARCHAR(64) NOT NULL,
                UNIQUE KEY uniq_reading_history_user_key (user_id, history_key),
                INDEX idx_reading_history_user_id (user_id)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS wordbook_entries (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT NOT NULL,
                word VARCHAR(191) NOT NULL,
                created_at VARCHAR(64) NOT NULL,
                updated_at VARCHAR(64) NOT NULL,
                UNIQUE KEY uniq_wordbook_user_word (user_id, word),
                INDEX idx_wordbook_user_id (user_id)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS vocab_book_settings (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT NOT NULL UNIQUE,
                selected_book_ids LONGTEXT NOT NULL,
                created_at VARCHAR(64) NOT NULL,
                updated_at VARCHAR(64) NOT NULL,
                INDEX idx_vocab_book_settings_user_id (user_id)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS anonymous_usage (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                anonymous_id VARCHAR(191) NOT NULL,
                feature VARCHAR(64) NOT NULL,
                usage_date VARCHAR(32) NOT NULL,
                count INT NOT NULL DEFAULT 0,
                created_at VARCHAR(64) NOT NULL,
                updated_at VARCHAR(64) NOT NULL,
                UNIQUE KEY uniq_anonymous_usage_scope (anonymous_id, feature, usage_date),
                INDEX idx_anonymous_usage_id (anonymous_id)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS user_usage (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT NOT NULL,
                feature VARCHAR(64) NOT NULL,
                usage_date VARCHAR(32) NOT NULL,
                count INT NOT NULL DEFAULT 0,
                created_at VARCHAR(64) NOT NULL,
                updated_at VARCHAR(64) NOT NULL,
                UNIQUE KEY uniq_user_usage_scope (user_id, feature, usage_date),
                INDEX idx_user_usage_user_id (user_id)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS news (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                article_id VARCHAR(255) NOT NULL UNIQUE,
                slug VARCHAR(255) NULL UNIQUE,
                title VARCHAR(512) NOT NULL,
                url VARCHAR(2048) NOT NULL,
                category VARCHAR(128) NOT NULL,
                description TEXT NULL,
                image_url VARCHAR(2048) NULL,
                source VARCHAR(255) NOT NULL,
                site_name VARCHAR(255) NULL,
                word_count INT NOT NULL DEFAULT 0,
                reading_time INT NOT NULL DEFAULT 0,
                article_payload LONGTEXT NULL,
                synced_at VARCHAR(64) NOT NULL,
                created_at VARCHAR(64) NOT NULL,
                updated_at VARCHAR(64) NOT NULL,
                INDEX idx_news_category (category),
                INDEX idx_news_source (source),
                INDEX idx_news_synced_at (synced_at)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )
        ensure_column(cursor, "news", "slug", "ALTER TABLE news ADD COLUMN slug VARCHAR(255) NULL UNIQUE")
        ensure_column(cursor, "news", "site_name", "ALTER TABLE news ADD COLUMN site_name VARCHAR(255) NULL")
        ensure_column(cursor, "news", "word_count", "ALTER TABLE news ADD COLUMN word_count INT NOT NULL DEFAULT 0")
        ensure_column(cursor, "news", "article_payload", "ALTER TABLE news ADD COLUMN article_payload LONGTEXT NULL")
        ensure_auto_increment_bigint_primary_key(cursor, "orders", "id")


def ensure_column(cursor: CursorAdapter, table_name: str, column_name: str, alter_sql: str) -> None:
    cursor.execute(
        """
        SELECT COUNT(*) AS count
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
        """,
        (table_name, column_name),
    )
    row = row_to_dict(cursor.fetchone()) or {}
    if not row.get("count"):
        cursor.execute(alter_sql)


def ensure_auto_increment_bigint_primary_key(
    cursor: CursorAdapter,
    table_name: str,
    column_name: str,
) -> None:
    cursor.execute(
        """
        SELECT DATA_TYPE, COLUMN_KEY, EXTRA
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
        """,
        (table_name, column_name),
    )
    row = row_to_dict(cursor.fetchone()) or {}
    data_type = str(row.get("DATA_TYPE") or "").lower()
    column_key = str(row.get("COLUMN_KEY") or "").upper()
    extra = str(row.get("EXTRA") or "").lower()

    if data_type == "bigint" and column_key == "PRI" and "auto_increment" in extra:
        return

    raise RuntimeError(
        f"Incompatible schema for `{table_name}.{column_name}`. "
        "This project now requires BIGINT AUTO_INCREMENT primary keys for orders. "
        "Please reset the payment tables or rebuild the database, then restart the backend."
    )


def row_to_dict(row: Any | None) -> dict[str, Any] | None:
    if row is None:
        return None
    if isinstance(row, dict):
        return row
    return {key: row[key] for key in row.keys()}


def dumps_json(payload: Any) -> str:
    return json.dumps(payload, ensure_ascii=False)
