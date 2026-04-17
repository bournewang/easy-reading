from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Iterator
from urllib.parse import urlparse

try:
    import pymysql
    from pymysql.cursors import DictCursor
except Exception:  # pragma: no cover - dependency may not be installed yet
    pymysql = None
    DictCursor = None

from .config import settings


DBIntegrityError = sqlite3.IntegrityError


def utcnow_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def parse_dt(value: str | datetime | None) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def using_mysql() -> bool:
    return settings.database_url.startswith("mysql://") or settings.database_url.startswith("mysql+pymysql://")


def _translate_sql(sql: str) -> str:
    if using_mysql():
        return sql.replace("?", "%s")
    return sql


class CursorAdapter:
    def __init__(self, cursor: Any) -> None:
        self._cursor = cursor

    def execute(self, sql: str, params: tuple | list | None = None) -> Any:
        translated = _translate_sql(sql)
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
    if using_mysql():
        if pymysql is None:
            raise RuntimeError("PyMySQL is required for MySQL support. Run `pip install -r requirements.txt`.")

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

    conn = sqlite3.connect(settings.database_path)
    conn.row_factory = sqlite3.Row
    return conn


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
    if using_mysql():
        _init_mysql()
        return

    _init_sqlite()


def _sqlite_has_column(cursor: CursorAdapter, table_name: str, column_name: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    return any(column["name"] == column_name for column in columns)


def _mysql_has_column(cursor: CursorAdapter, table_name: str, column_name: str) -> bool:
    cursor.execute(
        """
        SELECT COUNT(*) AS count
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
        """,
        (table_name, column_name),
    )
    row = row_to_dict(cursor.fetchone()) or {}
    return bool(row.get("count"))


def _init_sqlite() -> None:
    with db_cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                full_name TEXT,
                referral_code TEXT UNIQUE,
                referred_by_user_id TEXT,
                subscription_tier TEXT DEFAULT 'free',
                subscription_expires TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                token TEXT NOT NULL UNIQUE,
                user_id TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                original_amount REAL NOT NULL DEFAULT 0,
                sale_amount REAL NOT NULL DEFAULT 0,
                discount_amount REAL NOT NULL DEFAULT 0,
                amount REAL NOT NULL,
                status TEXT NOT NULL,
                payment_method TEXT NOT NULL,
                tier TEXT NOT NULL,
                duration INTEGER NOT NULL,
                coupon_code TEXT,
                referral_code TEXT,
                payment_details TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS subscriptions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                tier TEXT NOT NULL,
                status TEXT NOT NULL,
                billing_mode TEXT NOT NULL,
                interval_months INTEGER NOT NULL,
                auto_renew INTEGER NOT NULL DEFAULT 0,
                cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
                started_at TEXT NOT NULL,
                current_period_start TEXT NOT NULL,
                current_period_end TEXT NOT NULL,
                canceled_at TEXT,
                latest_order_id TEXT,
                payment_method TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS coupons (
                id TEXT PRIMARY KEY,
                code TEXT NOT NULL UNIQUE,
                description TEXT,
                discount_type TEXT NOT NULL,
                discount_value REAL NOT NULL,
                min_amount REAL NOT NULL DEFAULT 0,
                max_discount_amount REAL,
                max_redemptions INTEGER,
                per_user_limit INTEGER,
                active INTEGER NOT NULL DEFAULT 1,
                starts_at TEXT,
                ends_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS coupon_redemptions (
                id TEXT PRIMARY KEY,
                coupon_id TEXT NOT NULL,
                code TEXT NOT NULL,
                user_id TEXT NOT NULL,
                order_id TEXT,
                discount_amount REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS referral_commissions (
                id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                referrer_user_id TEXT NOT NULL,
                referred_user_id TEXT NOT NULL,
                referral_code TEXT NOT NULL,
                commission_rate REAL NOT NULL DEFAULT 0,
                commission_amount REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        if not _sqlite_has_column(cursor, "users", "referral_code"):
            cursor.execute("ALTER TABLE users ADD COLUMN referral_code TEXT")
        if not _sqlite_has_column(cursor, "users", "referred_by_user_id"):
            cursor.execute("ALTER TABLE users ADD COLUMN referred_by_user_id TEXT")
        if not _sqlite_has_column(cursor, "orders", "original_amount"):
            cursor.execute("ALTER TABLE orders ADD COLUMN original_amount REAL NOT NULL DEFAULT 0")
        if not _sqlite_has_column(cursor, "orders", "sale_amount"):
            cursor.execute("ALTER TABLE orders ADD COLUMN sale_amount REAL NOT NULL DEFAULT 0")
        if not _sqlite_has_column(cursor, "orders", "discount_amount"):
            cursor.execute("ALTER TABLE orders ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0")
        if not _sqlite_has_column(cursor, "orders", "coupon_code"):
            cursor.execute("ALTER TABLE orders ADD COLUMN coupon_code TEXT")
        if not _sqlite_has_column(cursor, "orders", "referral_code"):
            cursor.execute("ALTER TABLE orders ADD COLUMN referral_code TEXT")


def _init_mysql() -> None:
    global DBIntegrityError
    if pymysql is not None:
        DBIntegrityError = pymysql.err.IntegrityError

    with db_cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(64) PRIMARY KEY,
                username VARCHAR(191) NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                full_name VARCHAR(255) NULL,
                referral_code VARCHAR(64) NULL UNIQUE,
                referred_by_user_id VARCHAR(64) NULL,
                subscription_tier VARCHAR(64) DEFAULT 'free',
                subscription_expires DATETIME NULL,
                created_at VARCHAR(64) NOT NULL,
                updated_at VARCHAR(64) NOT NULL
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id VARCHAR(64) PRIMARY KEY,
                token VARCHAR(191) NOT NULL UNIQUE,
                user_id VARCHAR(64) NOT NULL,
                expires_at VARCHAR(64) NOT NULL,
                created_at VARCHAR(64) NOT NULL,
                INDEX idx_sessions_user_id (user_id)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS orders (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64) NOT NULL,
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
                INDEX idx_orders_user_id (user_id)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS subscriptions (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64) NOT NULL,
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
                latest_order_id VARCHAR(64) NULL,
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
                id VARCHAR(64) PRIMARY KEY,
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
                id VARCHAR(64) PRIMARY KEY,
                coupon_id VARCHAR(64) NOT NULL,
                code VARCHAR(64) NOT NULL,
                user_id VARCHAR(64) NOT NULL,
                order_id VARCHAR(64) NULL,
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
                id VARCHAR(64) PRIMARY KEY,
                order_id VARCHAR(64) NOT NULL,
                referrer_user_id VARCHAR(64) NOT NULL,
                referred_user_id VARCHAR(64) NOT NULL,
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
        if not _mysql_has_column(cursor, "users", "referral_code"):
            cursor.execute("ALTER TABLE users ADD COLUMN referral_code VARCHAR(64) NULL UNIQUE")
        if not _mysql_has_column(cursor, "users", "referred_by_user_id"):
            cursor.execute("ALTER TABLE users ADD COLUMN referred_by_user_id VARCHAR(64) NULL")
        if not _mysql_has_column(cursor, "orders", "original_amount"):
            cursor.execute("ALTER TABLE orders ADD COLUMN original_amount DOUBLE NOT NULL DEFAULT 0")
        if not _mysql_has_column(cursor, "orders", "sale_amount"):
            cursor.execute("ALTER TABLE orders ADD COLUMN sale_amount DOUBLE NOT NULL DEFAULT 0")
        if not _mysql_has_column(cursor, "orders", "discount_amount"):
            cursor.execute("ALTER TABLE orders ADD COLUMN discount_amount DOUBLE NOT NULL DEFAULT 0")
        if not _mysql_has_column(cursor, "orders", "coupon_code"):
            cursor.execute("ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(64) NULL")
        if not _mysql_has_column(cursor, "orders", "referral_code"):
            cursor.execute("ALTER TABLE orders ADD COLUMN referral_code VARCHAR(64) NULL")


def row_to_dict(row: Any | None) -> dict[str, Any] | None:
    if row is None:
        return None
    if isinstance(row, dict):
        return row
    return {key: row[key] for key in row.keys()}


def dumps_json(payload: Any) -> str:
    return json.dumps(payload, ensure_ascii=False)
