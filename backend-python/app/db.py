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


def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
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


def _init_sqlite() -> None:
    with db_cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                full_name TEXT,
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
                amount REAL NOT NULL,
                status TEXT NOT NULL,
                payment_method TEXT NOT NULL,
                tier TEXT NOT NULL,
                duration INTEGER NOT NULL,
                payment_details TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )


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
                amount DOUBLE NOT NULL,
                status VARCHAR(64) NOT NULL,
                payment_method VARCHAR(64) NOT NULL,
                tier VARCHAR(64) NOT NULL,
                duration INT NOT NULL,
                payment_details LONGTEXT NOT NULL,
                created_at VARCHAR(64) NOT NULL,
                updated_at VARCHAR(64) NOT NULL,
                INDEX idx_orders_user_id (user_id)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """
        )


def row_to_dict(row: Any | None) -> dict[str, Any] | None:
    if row is None:
        return None
    if isinstance(row, dict):
        return row
    return {key: row[key] for key in row.keys()}


def dumps_json(payload: Any) -> str:
    return json.dumps(payload, ensure_ascii=False)
