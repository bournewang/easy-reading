from __future__ import annotations

import hashlib
import hmac
import secrets
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Request

from .config import settings
from .db import db_cursor, parse_dt, row_to_dict, utcnow_iso


def hash_password(password: str, salt: str | None = None) -> str:
    salt_value = salt or secrets.token_hex(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_value.encode("utf-8"), 100_000)
    return f"{salt_value}${derived.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    salt, password_hash = stored_hash.split("$", 1)
    expected = hash_password(password, salt).split("$", 1)[1]
    return hmac.compare_digest(expected, password_hash)


def create_session(user_id: str) -> str:
    token = secrets.token_hex(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.session_ttl_days)
    with db_cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO sessions (id, token, user_id, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (str(uuid.uuid4()), token, user_id, expires_at.isoformat(), utcnow_iso()),
        )
    return token


def delete_session(token: str) -> None:
    with db_cursor() as cursor:
        cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))


def get_user_by_username(username: str) -> dict | None:
    with db_cursor() as cursor:
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        return row_to_dict(cursor.fetchone())


def get_user_by_id(user_id: str) -> dict | None:
    with db_cursor() as cursor:
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        return row_to_dict(cursor.fetchone())


def create_user(username: str, password: str, full_name: str | None) -> dict:
    now = utcnow_iso()
    user_id = str(uuid.uuid4())
    try:
        with db_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO users (
                    id, username, password_hash, full_name, subscription_tier, subscription_expires, created_at, updated_at
                ) VALUES (?, ?, ?, ?, 'free', NULL, ?, ?)
                """,
                (user_id, username, hash_password(password), full_name, now, now),
            )
    except sqlite3.IntegrityError as exc:
        raise ValueError("Username already taken") from exc
    return get_user_by_id(user_id)


def authenticate_user(username: str, password: str) -> dict | None:
    user = get_user_by_username(username)
    if not user:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return user


def get_current_user(request: Request) -> dict | None:
    session_token = request.cookies.get(settings.session_cookie_name)
    if not session_token:
        return None

    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT sessions.*, users.id AS uid, users.username, users.full_name, users.subscription_tier, users.subscription_expires
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ?
            """,
            (session_token,),
        )
        row = cursor.fetchone()

    if row is None:
        return None

    expires_at = parse_dt(row["expires_at"])
    if expires_at and expires_at < datetime.now(timezone.utc):
        delete_session(session_token)
        return None

    return {
        "id": row["uid"],
        "username": row["username"],
        "full_name": row["full_name"],
        "subscription_tier": row["subscription_tier"] or "free",
        "subscription_expires": row["subscription_expires"],
    }
