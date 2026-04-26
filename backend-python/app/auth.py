from __future__ import annotations

import hashlib
import hmac
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText

from fastapi import Request

from .config import settings
from .db import DBIntegrityError, db_cursor, parse_dt, row_to_dict, utcnow_iso


def hash_password(password: str, salt: str | None = None) -> str:
    salt_value = salt or secrets.token_hex(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_value.encode("utf-8"), 100_000)
    return f"{salt_value}${derived.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    salt, password_hash = stored_hash.split("$", 1)
    expected = hash_password(password, salt).split("$", 1)[1]
    return hmac.compare_digest(expected, password_hash)


def create_session(user_id: int) -> str:
    token = secrets.token_hex(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.session_ttl_days)
    with db_cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO sessions (token, user_id, expires_at, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (token, user_id, expires_at.isoformat(), utcnow_iso()),
        )
    return token


def delete_session(token: str) -> None:
    with db_cursor() as cursor:
        cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))


def extract_bearer_token(request: Request) -> str | None:
    authorization = request.headers.get("authorization", "").strip()
    if authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        if token:
            return token

    session_token = request.cookies.get(settings.session_cookie_name)
    if session_token:
        return session_token

    return None


def get_user_by_username(username: str) -> dict | None:
    with db_cursor() as cursor:
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        return row_to_dict(cursor.fetchone())


def get_user_by_id(user_id: int) -> dict | None:
    with db_cursor() as cursor:
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        return row_to_dict(cursor.fetchone())


def get_user_by_referral_code(referral_code: str | None) -> dict | None:
    normalized = (referral_code or "").strip().upper()
    if not normalized:
        return None

    with db_cursor() as cursor:
        cursor.execute("SELECT * FROM users WHERE referral_code = ?", (normalized,))
        return row_to_dict(cursor.fetchone())


def generate_referral_code(username: str) -> str:
    base = "".join(ch for ch in username.upper() if ch.isalnum())[:6] or "EASY"
    suffix = secrets.token_hex(3).upper()
    return f"{base}{suffix}"


def create_user(username: str, password: str, full_name: str | None, referral_code: str | None = None, email: str | None = None, registration_domain: str | None = None) -> dict:
    now = utcnow_iso()
    user_referral_code = generate_referral_code(username)
    referrer = get_user_by_referral_code(referral_code)
    referred_by_user_id = referrer["id"] if referrer else None
    normalized_email = email.strip().lower() if email and email.strip() else None

    if referral_code and not referrer:
        raise ValueError("Referral code is invalid")

    try:
        with db_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO users (
                    username, password_hash, full_name, email, referral_code, referred_by_user_id,registration_domain,
                    subscription_tier, subscription_expires, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'free', NULL, ?, ?)
                """,
                (username, hash_password(password), full_name, normalized_email, user_referral_code, referred_by_user_id, registration_domain, now, now),
            )
            user_id = int(cursor.lastrowid)
    except DBIntegrityError as exc:
        if "email" in str(exc).lower():
            raise ValueError("Email already registered") from exc
        raise ValueError("Username already taken") from exc
    return get_user_by_id(user_id)


def get_user_by_email(email: str) -> dict | None:
    normalized = email.strip().lower()
    if not normalized:
        return None
    with db_cursor() as cursor:
        cursor.execute("SELECT * FROM users WHERE email = ?", (normalized,))
        return row_to_dict(cursor.fetchone())


def authenticate_user(username_or_email: str, password: str) -> dict | None:
    # Try username first, then email
    user = get_user_by_username(username_or_email)
    if not user and "@" in username_or_email:
        user = get_user_by_email(username_or_email)
    if not user:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return user


def get_current_user(request: Request) -> dict | None:
    session_token = extract_bearer_token(request)
    if not session_token:
        return None

    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT sessions.*, users.id AS uid, users.username, users.full_name, users.subscription_tier, users.subscription_expires
                , users.email
                , users.referral_code
                , COALESCE(users.is_admin, 0) AS is_admin
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

    subscription_expires = parse_dt(row["subscription_expires"])
    effective_subscription_tier = row["subscription_tier"] or "free"
    if subscription_expires and subscription_expires <= datetime.now(timezone.utc):
        effective_subscription_tier = "free"
        with db_cursor() as cursor:
            cursor.execute(
                """
                UPDATE users
                SET subscription_tier = 'free', updated_at = ?
                WHERE id = ?
                """,
                (utcnow_iso(), row["uid"]),
            )

    return {
        "id": row["uid"],
        "username": row["username"],
        "email": row.get("email"),
        "full_name": row["full_name"],
        "referral_code": row["referral_code"],
        "is_admin": bool(row.get("is_admin")),
        "subscription_tier": effective_subscription_tier,
        "subscription_expires": row["subscription_expires"],
    }


# ── Password reset ────────────────────────────────────────────────────────────

def create_password_reset_token(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(minutes=settings.password_reset_ttl_minutes)
    ).isoformat().replace("+00:00", "Z")
    now = utcnow_iso()
    with db_cursor() as cursor:
        # Invalidate any existing unused tokens for this user
        cursor.execute(
            "UPDATE password_reset_tokens SET used=1 WHERE user_id=? AND used=0",
            (user_id,),
        )
        cursor.execute(
            """
            INSERT INTO password_reset_tokens (user_id, token, expires_at, used, created_at)
            VALUES (?, ?, ?, 0, ?)
            """,
            (user_id, token, expires_at, now),
        )
    return token


def consume_password_reset_token(token: str) -> dict | None:
    """Validate token and return the user dict if valid, else None."""
    with db_cursor() as cursor:
        cursor.execute(
            "SELECT * FROM password_reset_tokens WHERE token=? AND used=0",
            (token,),
        )
        row = row_to_dict(cursor.fetchone())
        if not row:
            return None

        expires_at = parse_dt(row["expires_at"])
        if expires_at and expires_at < datetime.now(timezone.utc):
            return None

        cursor.execute(
            "UPDATE password_reset_tokens SET used=1 WHERE id=?",
            (row["id"],),
        )

    return get_user_by_id(int(row["user_id"]))


def send_password_reset_email(email: str, reset_url: str) -> None:
    """Send reset email via Resend SDK, falling back to SMTP, then console log."""
    subject = "Reset your Easy Reading password"
    html_body = f"""
    <p>Hi,</p>
    <p>Click the button below to reset your password.
       The link expires in <strong>{settings.password_reset_ttl_minutes} minutes</strong>.</p>
    <p style="margin: 24px 0;">
      <a href="{reset_url}"
         style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
        Reset password
      </a>
    </p>
    <p>Or copy this link into your browser:<br>
       <a href="{reset_url}">{reset_url}</a></p>
    <p>If you didn't request this, you can ignore this email.</p>
    <p>— Easy Reading</p>
    """
    text_body = (
        f"Reset your Easy Reading password\n\n"
        f"Click the link below (expires in {settings.password_reset_ttl_minutes} minutes):\n\n"
        f"{reset_url}\n\n"
        f"If you didn't request this, ignore this email.\n\n— Easy Reading"
    )

    # 1. Resend SDK (preferred)
    if settings.resend_api_key:
        import resend
        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": settings.resend_from_email,
            "to": email,
            "subject": subject,
            "html": html_body,
        })
        return

    # 2. SMTP fallback
    if settings.smtp_host:
        msg = MIMEText(text_body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from or settings.smtp_user
        msg["To"] = email
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as smtp:
            smtp.ehlo()
            smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.sendmail(msg["From"], [email], msg.as_string())
        return

    # 3. Dev mode — print to console
    print(f"\n[DEV] Password reset link for {email}:\n{reset_url}\n")
