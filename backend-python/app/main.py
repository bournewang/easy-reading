from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import urlparse
from fastapi import Depends, FastAPI, Form, HTTPException, Query, Request, Response, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

from .auth import (
    authenticate_user,
    create_session,
    create_user,
    delete_session,
    extract_bearer_token,
    get_current_user,
    get_user_by_id,
    get_user_by_email,
    get_user_by_referral_code,
    get_user_by_username,
    create_password_reset_token,
    consume_password_reset_token,
    send_password_reset_email,
    hash_password,
)
from .config import settings
from .db import init_db, parse_dt, db_cursor, row_to_dict, utcnow_iso
from .models import (
    AnonymousLimitsResponse,
    AnonymousUsageResponse,
    AuthResponse,
    DictionaryEntryModel,
    LoginRequest,
    NewsArticleContentResponse,
    NewsCategoriesResponse,
    NewsListResponse,
    PaymentCreateRequest,
    PaymentNotifyRequest,
    PaymentQueryResponse,
    PricingQuoteRequest,
    PricingQuoteResponse,
    PricingTierResponse,
    ReadingHistoryItemModel,
    ReadingHistorySyncRequest,
    RegisterRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ReferralSummaryResponse,
    ReferralCommissionsResponse,
    AdminUserItem,
    AdminUsersResponse,
    AdminUpdateUserRequest,
    AdminOrderItem,
    AdminOrdersResponse,
    AdminCommissionItem,
    AdminCommissionsResponse,
    AdminUpdateCommissionRequest,
    SubscriptionResponse,
    SubscriptionEntitlementsResponse,
    TtsSynthesizeRequest,
    TtsSynthesizeResponse,
    TranslateRequest,
    TranslateResponse,
    UpdateProfileRequest,
    UserPayload,
    VocabBookSettingsRequest,
    VocabBookSettingsResponse,
    WordbookEntryModel,
    WordbookReplaceRequest,
    WordbookSyncRequest,
)
from .services.anonymous_usage import (
    ANONYMOUS_FEATURE_TRANSLATION,
    ANONYMOUS_FEATURE_TTS,
    anonymous_usage_service,
)
from .services.dictionary import dictionary_service
from .services.dictionary import DictionaryFetchError
from .services.news import NewsSyncError, news_service
from .services.payment import payment_service
from .services.tts import TTSError, tts_service
from .services.translation import TranslationError, translation_service
from .services.user_data import user_data_service
from .services.user_usage import (
    USER_FEATURE_TRANSLATION,
    USER_FEATURE_TTS,
    user_usage_service,
)


app = FastAPI(title="Easy Reading Python Backend", version="0.1.0")


def get_anonymous_id(request: Request) -> str | None:
    anonymous_id = request.headers.get("x-anonymous-id", "").strip()
    if anonymous_id:
        return anonymous_id[:191]

    forwarded_for = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    client_host = request.client.host if request.client else ""
    fallback = forwarded_for or client_host
    return fallback[:191] if fallback else None

def get_registration_domain(request: Request) -> str | None:
    origin = request.headers.get("origin", "").strip()
    if origin:
        parsed_origin = urlparse(origin)
        if parsed_origin.hostname:
            return parsed_origin.hostname[:255]

    referer = request.headers.get("referer", "").strip()
    if referer:
        parsed_referer = urlparse(referer)
        if parsed_referer.hostname:
            return parsed_referer.hostname[:255]

    forwarded_host = request.headers.get("x-forwarded-host", "").strip()
    if forwarded_host:
        return forwarded_host.split(",")[0].strip()[:255]

    host = request.headers.get("host", "").strip()
    if host:
        return host.split(":")[0][:255]

    return None

def apply_cors_headers(request: Request, response: Response) -> None:
    origin = request.headers.get("origin")
    if not origin:
        return

    requested_headers = request.headers.get("access-control-request-headers", "*")
    requested_method = request.headers.get("access-control-request-method", "*")

    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = requested_method if requested_method else "*"
    response.headers["Access-Control-Allow-Headers"] = requested_headers if requested_headers else "*"
    response.headers["Access-Control-Expose-Headers"] = "*"
    response.headers["Vary"] = "Origin"


@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        response = Response(status_code=204)
        apply_cors_headers(request, response)
        return response

    response = await call_next(request)
    apply_cors_headers(request, response)
    return response


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    payment_service.ensure_sample_coupons()


def serialize_user(user: dict) -> UserPayload:
    subscription_expires = parse_dt(user.get("subscription_expires"))
    effective_tier = user.get("subscription_tier") or "free"
    # Defensive check: ensure timezone-aware comparison
    if subscription_expires:
        if subscription_expires.tzinfo is None:
            subscription_expires = subscription_expires.replace(tzinfo=timezone.utc)
        if subscription_expires <= datetime.now(timezone.utc):
            effective_tier = "free"

    return UserPayload(
        id=user["id"],
        username=user["username"],
        email=user.get("email"),
        fullName=user.get("full_name"),
        referralCode=user.get("referral_code"),
        isAdmin=bool(user.get("is_admin")),
        subscriptionTier=effective_tier,
        subscriptionExpires=subscription_expires,
    )


def require_user(user: dict | None = Depends(get_current_user)) -> dict:
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return user


def set_session_cookie(request: Request, response: Response, token: str) -> None:
    forwarded_proto = request.headers.get("x-forwarded-proto", "")
    is_secure = request.url.scheme == "https" or forwarded_proto.split(",")[0].strip() == "https"
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        max_age=settings.session_ttl_days * 24 * 60 * 60,
        path="/",
    )


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.get("/api/public/anonymous-limits", response_model=AnonymousLimitsResponse)
def anonymous_limits() -> AnonymousLimitsResponse:
    return AnonymousLimitsResponse(**anonymous_usage_service.get_limits())


@app.get("/api/pricing", response_model=list[PricingTierResponse])
def pricing_catalog() -> list[PricingTierResponse]:
    return [PricingTierResponse(**tier) for tier in payment_service.get_pricing_catalog()]


@app.post("/api/pricing/quote", response_model=PricingQuoteResponse)
def pricing_quote(payload: PricingQuoteRequest, user: dict = Depends(require_user)) -> PricingQuoteResponse:
    quote = payment_service.quote_pricing(
        user_id=user["id"],
        tier=payload.tier,
        duration=payload.duration,
        promo_code=payload.promoCode,
    )
    return PricingQuoteResponse(**quote)


@app.post("/api/translate")
def translate(payload: TranslateRequest, request: Request, debug: bool = Query(default=False)) -> dict:
    try:
        requested_amount = request.headers.get("x-usage-amount", "1").strip()
        try:
            usage_amount = max(1, min(100, int(requested_amount or "1")))
        except ValueError:
            usage_amount = 1

        user = get_current_user(request)
        if user:
            entitlements = payment_service.get_entitlements(user["id"])
            if not entitlements["hasUnlimitedTranslation"]:
                try:
                    user_usage_service.consume(user["id"], USER_FEATURE_TRANSLATION, amount=usage_amount)
                except ValueError as exc:
                    raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)) from exc
        else:
            anonymous_id = get_anonymous_id(request)
            if not anonymous_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Anonymous translation quota could not be identified.",
                )
            try:
                anonymous_usage_service.consume(anonymous_id, ANONYMOUS_FEATURE_TRANSLATION, amount=usage_amount)
            except ValueError as exc:
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)) from exc

        if debug:
            translated, debug_info = translation_service.translate(
                payload.text,
                payload.target_lang,
                debug=True,
            )
            return {
                "data": translated,
                "success": True,
                "debug": debug_info,
            }

        translated = translation_service.translate(payload.text, payload.target_lang)
        return TranslateResponse(data=translated, success=True).model_dump()
    except TranslationError as exc:
        detail: str | dict = str(exc)
        if debug:
            detail = {
                "message": str(exc),
                "debug": exc.details,
            }
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail) from exc


@app.post("/api/usage/tts", response_model=AnonymousUsageResponse)
def consume_tts_usage(request: Request, amount: int = Query(default=1, ge=1, le=10)) -> AnonymousUsageResponse:
    user = get_current_user(request)
    if user:
        entitlements = payment_service.get_entitlements(user["id"])
        if entitlements["hasUnlimitedTextToSpeech"]:
            return AnonymousUsageResponse(
                feature=USER_FEATURE_TTS,
                dailyLimit=0,
                usedCount=0,
                remainingCount=0,
                usageDate=user_usage_service.get_usage_date(),
            )

        try:
            usage = user_usage_service.consume(user["id"], USER_FEATURE_TTS, amount=amount)
            return AnonymousUsageResponse(**usage)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)) from exc

    anonymous_id = get_anonymous_id(request)
    if not anonymous_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Anonymous TTS quota could not be identified.",
        )

    try:
        usage = anonymous_usage_service.consume(anonymous_id, ANONYMOUS_FEATURE_TTS, amount=amount)
        return AnonymousUsageResponse(**usage)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)) from exc


@app.post("/api/tts/synthesize", response_model=TtsSynthesizeResponse)
def synthesize_tts(payload: TtsSynthesizeRequest) -> TtsSynthesizeResponse:
    try:
        result = tts_service.synthesize(payload.text)
        return TtsSynthesizeResponse(**result)
    except TTSError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@app.post("/api/anonymous-usage/tts", response_model=AnonymousUsageResponse)
def consume_anonymous_tts_usage(request: Request, amount: int = Query(default=1, ge=1, le=10)) -> AnonymousUsageResponse:
    return consume_tts_usage(request, amount)


@app.get("/api/entries")
def list_entries() -> dict:
    return {"items": dictionary_service.list_words()}


@app.get("/api/news", response_model=NewsListResponse)
def list_news(
    category: str | None = Query(default=None),
    source: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
) -> NewsListResponse:
    try:
        payload = news_service.list_news(
            category=category,
            source=source,
            search=search,
            page=page,
            page_size=pageSize,
        )
        response_payload = dict(payload)
        response_payload["lastSyncedAt"] = parse_dt(payload.get("lastSyncedAt"))
        return NewsListResponse(**response_payload)
    except NewsSyncError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@app.get("/api/news-categories", response_model=NewsCategoriesResponse)
def list_news_categories() -> NewsCategoriesResponse:
    try:
        payload = news_service.list_news_categories()
        return NewsCategoriesResponse(
            categories=list(payload.get("categories") or []),
            firstArticleByCategory=dict(payload.get("firstArticleByCategory") or {}),
            lastSyncedAt=parse_dt(payload.get("lastSyncedAt")),
        )
    except NewsSyncError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@app.get("/api/news/{article_id}", response_model=NewsArticleContentResponse)
def get_news_article(article_id: str) -> NewsArticleContentResponse:
    try:
        payload = news_service.get_news_article(article_id)
    except NewsSyncError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    if not payload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="News article not found")

    response_payload = dict(payload)
    response_payload["syncedAt"] = parse_dt(payload.get("syncedAt"))
    return NewsArticleContentResponse(**response_payload)


@app.post("/api/news/sync")
def sync_news() -> dict:
    try:
        synced_at = news_service.sync_if_stale(force=True)
        return {
            "success": True,
            "syncedAt": synced_at,
        }
    except NewsSyncError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@app.get("/api/entries/{word}", response_model=DictionaryEntryModel)
def get_entry(
    word: str,
    force: bool = Query(default=False),
    debug: bool = Query(default=False),
) -> DictionaryEntryModel:
    try:
        return dictionary_service.sync_word(word, force=force, debug=debug)
    except DictionaryFetchError as exc:
        message = str(exc)
        status_code = status.HTTP_502_BAD_GATEWAY
        if "HTTP 404" in message:
            status_code = status.HTTP_404_NOT_FOUND
        detail: str | dict = message
        if debug:
            detail = {
                "message": message,
                "debug": exc.details,
            }
        raise HTTPException(status_code=status_code, detail=detail) from exc
    except ValueError as exc:
        message = str(exc)
        status_code = status.HTTP_400_BAD_REQUEST if "Word is required" in message else status.HTTP_502_BAD_GATEWAY
        raise HTTPException(status_code=status_code, detail=message) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, response: Response) -> AuthResponse:
    if get_user_by_username(payload.username):
        raise HTTPException(status_code=400, detail="Username already taken")

    if payload.email:
        normalized_email = payload.email.strip().lower()
        if get_user_by_email(normalized_email):
            raise HTTPException(status_code=400, detail="Email already registered")
    else:
        normalized_email = None

    normalized_referral_code = payload.referralCode.strip().upper() if payload.referralCode else None
    if normalized_referral_code and not get_user_by_referral_code(normalized_referral_code):
        raise HTTPException(status_code=400, detail="Referral code is invalid")

    try:
        user = create_user(
            payload.username, 
            payload.password, 
            payload.fullName, 
            normalized_referral_code, 
            normalized_email, 
            get_registration_domain(request)
            )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    token = create_session(user["id"])
    set_session_cookie(request, response, token)
    return AuthResponse(message="User created successfully", user=serialize_user(user), token=token)


@app.post("/api/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, request: Request, response: Response) -> AuthResponse:
    user = authenticate_user(payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_session(user["id"])
    set_session_cookie(request, response, token)
    return AuthResponse(message="Logged in successfully", user=serialize_user(user), token=token)


@app.post("/api/auth/logout")
def logout(request: Request, response: Response) -> dict:
    session_token = extract_bearer_token(request)
    if session_token:
        delete_session(session_token)
    response.delete_cookie(settings.session_cookie_name, path="/")
    return {"message": "Logged out successfully"}


@app.post("/api/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest) -> dict:
    """Always returns 200 to avoid leaking whether an email is registered."""
    email = payload.email.strip().lower()
    user = get_user_by_email(email)
    if user:
        token = create_password_reset_token(user["id"])
        reset_url = (
            f"{settings.website_base_url.rstrip('/')}/reset-password?token={token}"
        )
        try:
            send_password_reset_email(email, reset_url)
        except Exception as exc:
            # Log but don't expose the error
            print(f"[WARN] Failed to send password reset email to {email}: {exc}")
    return {"message": "If that email is registered, a reset link has been sent."}


@app.post("/api/auth/reset-password")
def reset_password(payload: ResetPasswordRequest) -> dict:
    user = consume_password_reset_token(payload.token)
    if not user:
        raise HTTPException(status_code=400, detail="Reset link is invalid or has expired.")
    now = utcnow_iso()
    with db_cursor() as cursor:
        cursor.execute(
            "UPDATE users SET password_hash=?, updated_at=? WHERE id=?",
            (hash_password(payload.password), now, user["id"]),
        )
    return {"message": "Password updated successfully."}


@app.get("/api/auth/me")
def me(user: dict | None = Depends(get_current_user)) -> dict:
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"user": serialize_user(user).model_dump()}


@app.put("/api/auth/profile")
def update_profile(
    payload: UpdateProfileRequest,
    user: dict = Depends(require_user),
) -> dict:
    normalized_email = payload.email.strip().lower()
    if not normalized_email:
        raise HTTPException(status_code=400, detail="Email is required")

    existing_email_user = get_user_by_email(normalized_email)
    if existing_email_user and int(existing_email_user["id"]) != int(user["id"]):
        raise HTTPException(status_code=400, detail="Email already registered")

    now = utcnow_iso()
    with db_cursor() as cursor:
        cursor.execute(
            "UPDATE users SET email = ?, updated_at = ? WHERE id = ?",
            (normalized_email, now, user["id"]),
        )

    updated_user = get_user_by_id(user["id"])
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": serialize_user(updated_user).model_dump()}


@app.get("/api/history", response_model=list[ReadingHistoryItemModel])
def list_reading_history(user: dict = Depends(require_user)) -> list[ReadingHistoryItemModel]:
    items = user_data_service.list_history(user["id"])
    return [ReadingHistoryItemModel(**item) for item in items]


@app.post("/api/history", response_model=ReadingHistoryItemModel)
def save_reading_history_item(
    payload: ReadingHistoryItemModel,
    user: dict = Depends(require_user),
) -> ReadingHistoryItemModel:
    item = user_data_service.upsert_history_item(user["id"], payload.model_dump())
    return ReadingHistoryItemModel(**item)


@app.post("/api/history/sync", response_model=list[ReadingHistoryItemModel])
def sync_reading_history(
    payload: ReadingHistorySyncRequest,
    user: dict = Depends(require_user),
) -> list[ReadingHistoryItemModel]:
    items = user_data_service.sync_history(
        user["id"],
        [item.model_dump() for item in payload.items],
    )
    return [ReadingHistoryItemModel(**item) for item in items]


@app.get("/api/wordbook", response_model=list[WordbookEntryModel])
def list_wordbook(user: dict = Depends(require_user)) -> list[WordbookEntryModel]:
    items = user_data_service.list_wordbook(user["id"])
    return [WordbookEntryModel(**item) for item in items]


@app.put("/api/wordbook", response_model=list[WordbookEntryModel])
def replace_wordbook(
    payload: WordbookReplaceRequest,
    user: dict = Depends(require_user),
) -> list[WordbookEntryModel]:
    items = user_data_service.replace_wordbook(user["id"], payload.words)
    return [WordbookEntryModel(**item) for item in items]


@app.post("/api/wordbook/sync", response_model=list[WordbookEntryModel])
def sync_wordbook(
    payload: WordbookSyncRequest,
    user: dict = Depends(require_user),
) -> list[WordbookEntryModel]:
    items = user_data_service.sync_wordbook(user["id"], payload.words)
    return [WordbookEntryModel(**item) for item in items]


@app.post("/api/wordbook/{word}", response_model=WordbookEntryModel)
def add_wordbook_word(word: str, user: dict = Depends(require_user)) -> WordbookEntryModel:
    try:
        item = user_data_service.add_word(user["id"], word)
        return WordbookEntryModel(**item)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.delete("/api/wordbook/{word}")
def delete_wordbook_word(word: str, user: dict = Depends(require_user)) -> dict:
    user_data_service.remove_word(user["id"], word)
    return {"success": True}


@app.get("/api/vocab-book-settings", response_model=VocabBookSettingsResponse)
def get_vocab_book_settings(user: dict = Depends(require_user)) -> VocabBookSettingsResponse:
    selected_book_ids = user_data_service.list_vocab_book_settings(user["id"])
    return VocabBookSettingsResponse(selectedBookIds=selected_book_ids)


@app.put("/api/vocab-book-settings", response_model=VocabBookSettingsResponse)
def replace_vocab_book_settings(
    payload: VocabBookSettingsRequest,
    user: dict = Depends(require_user),
) -> VocabBookSettingsResponse:
    selected_book_ids = user_data_service.replace_vocab_book_settings(
        user["id"],
        payload.selectedBookIds,
    )
    return VocabBookSettingsResponse(selectedBookIds=selected_book_ids)


@app.get("/api/subscription", response_model=SubscriptionResponse)
def subscription(user: dict = Depends(require_user)) -> SubscriptionResponse:
    return SubscriptionResponse(**payment_service.get_subscription_summary(user["id"]))


@app.get("/api/subscription/entitlements", response_model=SubscriptionEntitlementsResponse)
def subscription_entitlements(user: dict = Depends(require_user)) -> SubscriptionEntitlementsResponse:
    return SubscriptionEntitlementsResponse(**payment_service.get_entitlements(user["id"]))


@app.get("/api/referral/summary", response_model=ReferralSummaryResponse)
def referral_summary(user: dict = Depends(require_user)) -> ReferralSummaryResponse:
    return ReferralSummaryResponse(**payment_service.get_referral_summary(user["id"]))


@app.get("/api/referral/commissions", response_model=ReferralCommissionsResponse)
def referral_commissions(
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(require_user),
) -> ReferralCommissionsResponse:
    result = payment_service.get_referral_commissions(user["id"], page=page, page_size=pageSize)
    return ReferralCommissionsResponse(**result)


@app.post("/api/subscription/cancel", response_model=SubscriptionResponse)
def cancel_subscription(user: dict = Depends(require_user)) -> SubscriptionResponse:
    try:
        summary = payment_service.cancel_subscription(user["id"])
        return SubscriptionResponse(**summary)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/subscription/reactivate", response_model=SubscriptionResponse)
def reactivate_subscription(user: dict = Depends(require_user)) -> SubscriptionResponse:
    try:
        summary = payment_service.reactivate_subscription(user["id"])
        return SubscriptionResponse(**summary)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/payment/wechat/create", response_model=PaymentQueryResponse)
def create_wechat_order(payload: PaymentCreateRequest, user: dict = Depends(require_user)) -> PaymentQueryResponse:
    try:
        order = payment_service.create_order(
            user_id=user["id"],
            payment_method="wechat",
            tier=payload.tier,
            duration=payload.duration,
            billing_mode=payload.billingMode,
            return_url=payload.returnUrl,
            cancel_url=payload.cancelUrl,
            promo_code=payload.promoCode,
        )
        return PaymentQueryResponse(
            orderId=order["id"],
            orderNo=order["order_no"],
            amount=order["amount"],
            originalAmount=order.get("original_amount"),
            saleAmount=order.get("sale_amount"),
            discountAmount=order.get("discount_amount"),
            status=order["status"],
            tier=order["tier"],
            duration=order["duration"],
            billingMode=order["payment_details"].get("billingMode"),
            promoCode=order["payment_details"].get("promoCode") or order.get("coupon_code") or order.get("referral_code"),
            codeUrl=payment_service.build_wechat_code_url(order),
            createdAt=parse_dt(order["created_at"]),
            updatedAt=parse_dt(order["updated_at"]),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/payment/alipay/create", response_model=PaymentQueryResponse)
def create_alipay_order(payload: PaymentCreateRequest, user: dict = Depends(require_user)) -> PaymentQueryResponse:
    try:
        order = payment_service.create_order(
            user_id=user["id"],
            payment_method="alipay",
            tier=payload.tier,
            duration=payload.duration,
            billing_mode=payload.billingMode,
            return_url=payload.returnUrl,
            cancel_url=payload.cancelUrl,
            promo_code=payload.promoCode,
        )
        return PaymentQueryResponse(
            orderId=order["id"],
            orderNo=order["order_no"],
            amount=order["amount"],
            originalAmount=order.get("original_amount"),
            saleAmount=order.get("sale_amount"),
            discountAmount=order.get("discount_amount"),
            status=order["status"],
            tier=order["tier"],
            duration=order["duration"],
            billingMode=order["payment_details"].get("billingMode"),
            promoCode=order["payment_details"].get("promoCode") or order.get("coupon_code") or order.get("referral_code"),
            paymentUrl=payment_service.build_alipay_payment_url(order),
            createdAt=parse_dt(order["created_at"]),
            updatedAt=parse_dt(order["updated_at"]),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/payment/query-order", response_model=PaymentQueryResponse)
def query_order(orderNo: str | None = None, orderId: int | None = None, user: dict = Depends(require_user)) -> PaymentQueryResponse:
    if orderNo:
        order = payment_service.get_user_order(orderNo, user["id"])
    elif orderId is not None:
        order = payment_service.get_order(orderId)
        if order and order["user_id"] != user["id"]:
            order = None
    else:
        raise HTTPException(status_code=400, detail="orderNo is required")
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["payment_method"] == "alipay":
        order = payment_service.sync_alipay_order_status(order)

    code_url = None
    payment_url = None
    if order["payment_method"] == "wechat":
        code_url = payment_service.build_wechat_code_url(order)
    if order["payment_method"] == "alipay":
        payment_url = payment_service.build_alipay_payment_url(order)

    return PaymentQueryResponse(
        orderId=order["id"],
        orderNo=order["order_no"],
        amount=order["amount"],
        originalAmount=order.get("original_amount"),
        saleAmount=order.get("sale_amount"),
        discountAmount=order.get("discount_amount"),
        status=order["status"],
        tier=order["tier"],
        duration=order["duration"],
        billingMode=order["payment_details"].get("billingMode"),
        promoCode=order["payment_details"].get("promoCode") or order.get("coupon_code") or order.get("referral_code"),
        codeUrl=code_url,
        paymentUrl=payment_url,
        createdAt=parse_dt(order["created_at"]),
        updatedAt=parse_dt(order["updated_at"]),
    )


@app.post("/api/payment/wechat/notify")
def wechat_notify(payload: PaymentNotifyRequest) -> dict:
    order_ref = payload.orderNo if payload.orderNo is not None else payload.orderId
    if order_ref is None:
        raise HTTPException(status_code=400, detail="orderNo is required")
    signature_ref = payload.orderNo or str(payload.orderId)
    if not payment_service.verify_signature(payload.signature, signature_ref, payload.transactionId or ""):
        raise HTTPException(status_code=403, detail="Invalid payment signature")
    order = payment_service.mark_order_paid(order_ref, payload.transactionId)
    return {"success": True, "orderId": order["id"], "orderNo": order["order_no"], "status": order["status"]}


@app.post("/api/payment/alipay/notify")
async def alipay_notify(request: Request) -> Response:
    form = await request.form()
    payload = {key: str(value) for key, value in form.multi_items()}
    try:
        result = payment_service.verify_alipay_notification(payload)
    except ValueError as exc:
        return Response(content=f"failure: {exc}", media_type="text/plain", status_code=400)

    order = result["order"]
    return Response(content="success", media_type="text/plain", status_code=200)


@app.get("/mock-pay/alipay/{order_no}", response_class=HTMLResponse)
def mock_alipay_page(order_no: str, token: str = Query(default="")) -> HTMLResponse:
    order = payment_service.get_order_by_no(order_no)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order["payment_details"].get("confirmationToken") != token:
        raise HTTPException(status_code=403, detail="Invalid payment token")

    if order["status"] == "success":
        return HTMLResponse(
            f"""
            <html><body style="font-family: sans-serif; padding: 32px;">
                <h1>Payment already completed</h1>
                <p>Order {order['order_no']} has already been paid.</p>
                <p><a href="{payment_service.append_query_params(order['payment_details'].get('returnUrl'), {'orderNo': order['order_no'], 'status': order['status']}) or '#'}">Return to Easy Reading</a></p>
            </body></html>
            """
        )

    amount = f"{float(order['amount']):.2f}"
    billing_mode = order["payment_details"].get("billingMode", "prepaid")
    return HTMLResponse(
        f"""
        <html>
          <body style="font-family: sans-serif; padding: 32px; background: #f8fafc; color: #0f172a;">
            <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 24px; padding: 32px; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);">
              <h1 style="margin-top: 0;">Mock Alipay Checkout</h1>
              <p>Order: <strong>{order['order_no']}</strong></p>
              <p>Plan: <strong>{order['tier']}</strong></p>
              <p>Duration: <strong>{order['duration']} month(s)</strong></p>
              <p>Billing mode: <strong>{billing_mode}</strong></p>
              <p>Amount: <strong>¥{amount}</strong></p>

              <form method="post" action="{settings.app_base_url.rstrip('/')}/mock-pay/alipay/{order['order_no']}/complete" style="margin-top: 24px;">
                <input type="hidden" name="token" value="{token}" />
                <button type="submit" style="width: 100%; border: 0; border-radius: 999px; padding: 14px 18px; background: #1677ff; color: white; font-size: 16px; font-weight: 600; cursor: pointer;">
                  Complete Mock Payment
                </button>
              </form>

              <form method="post" action="{settings.app_base_url.rstrip('/')}/mock-pay/alipay/{order['order_no']}/cancel" style="margin-top: 12px;">
                <input type="hidden" name="token" value="{token}" />
                <button type="submit" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 999px; padding: 14px 18px; background: white; color: #334155; font-size: 16px; font-weight: 600; cursor: pointer;">
                  Cancel
                </button>
              </form>
            </div>
          </body>
        </html>
        """
    )


@app.post("/mock-pay/alipay/{order_no}/complete")
def mock_alipay_complete(order_no: str, token: str = Form(default="")) -> RedirectResponse:
    order = payment_service.get_order_by_no(order_no)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["payment_details"].get("confirmationToken") != token:
        raise HTTPException(status_code=403, detail="Invalid payment token")

    transaction_id = f"ALI{int(datetime.now().timestamp())}{order_no[-6:]}"
    paid_order = payment_service.mark_order_paid(order_no, transaction_id)
    redirect_url = payment_service.append_query_params(
        paid_order["payment_details"].get("returnUrl"),
        {
            "orderNo": paid_order["order_no"],
            "status": paid_order["status"],
        },
    ) or f"{settings.app_base_url.rstrip('/')}/mock-pay/alipay/{paid_order['order_no']}?token={token}"
    return RedirectResponse(url=redirect_url, status_code=status.HTTP_303_SEE_OTHER)


@app.post("/mock-pay/alipay/{order_no}/cancel")
def mock_alipay_cancel(order_no: str, token: str = Form(default="")) -> RedirectResponse:
    order = payment_service.get_order_by_no(order_no)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["payment_details"].get("confirmationToken") != token:
        raise HTTPException(status_code=403, detail="Invalid payment token")

    redirect_url = payment_service.append_query_params(
        order["payment_details"].get("cancelUrl") or order["payment_details"].get("returnUrl"),
        {
            "orderNo": order["order_no"],
            "status": "cancelled",
        },
    ) or f"{settings.app_base_url.rstrip('/')}/mock-pay/alipay/{order['order_no']}?token={token}"
    return RedirectResponse(url=redirect_url, status_code=status.HTTP_303_SEE_OTHER)


# ── Admin routes ──────────────────────────────────────────────────────────────

def require_admin(user: dict = Depends(require_user)) -> dict:
    if not user.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


@app.get("/api/admin/users", response_model=AdminUsersResponse)
def admin_list_users(
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    _admin: dict = Depends(require_admin),
) -> AdminUsersResponse:
    offset = (page - 1) * pageSize
    with db_cursor() as cursor:
        if search:
            like = f"%{search}%"
            cursor.execute(
                "SELECT COUNT(*) AS count FROM users WHERE username LIKE ? OR full_name LIKE ?",
                (like, like),
            )
        else:
            cursor.execute("SELECT COUNT(*) AS count FROM users")
        total = int((row_to_dict(cursor.fetchone()) or {}).get("count", 0))

        if search:
            like = f"%{search}%"
            cursor.execute(
                "SELECT * FROM users WHERE username LIKE ? OR full_name LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?",
                (like, like, pageSize, offset),
            )
        else:
            cursor.execute("SELECT * FROM users ORDER BY id DESC LIMIT ? OFFSET ?", (pageSize, offset))
        rows = [row_to_dict(r) for r in cursor.fetchall()]

    items = [
        AdminUserItem(
            id=r["id"],
            username=r["username"],
            fullName=r.get("full_name"),
            subscriptionTier=r.get("subscription_tier") or "free",
            subscriptionExpires=r.get("subscription_expires"),
            isAdmin=bool(r.get("is_admin")),
            commissionRate=float(r["commission_rate"]) if r.get("commission_rate") is not None else None,
            referralCode=r.get("referral_code"),
            createdAt=r.get("created_at"),
        )
        for r in rows
    ]
    total_pages = max(1, (total + pageSize - 1) // pageSize)
    return AdminUsersResponse(items=items, page=page, pageSize=pageSize, total=total, totalPages=total_pages)


@app.patch("/api/admin/users/{user_id}", response_model=AdminUserItem)
def admin_update_user(
    user_id: int,
    payload: AdminUpdateUserRequest,
    _admin: dict = Depends(require_admin),
) -> AdminUserItem:
    now = utcnow_iso()
    updates: list[str] = []
    values: list = []

    if payload.subscriptionTier is not None:
        updates.append("subscription_tier = ?")
        values.append(payload.subscriptionTier)
    if payload.subscriptionExpires is not None:
        updates.append("subscription_expires = ?")
        values.append(payload.subscriptionExpires or None)
    if payload.isAdmin is not None:
        updates.append("is_admin = ?")
        values.append(1 if payload.isAdmin else 0)
    if payload.commissionRate is not None:
        updates.append("commission_rate = ?")
        values.append(payload.commissionRate)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates.append("updated_at = ?")
    values.append(now)
    values.append(user_id)

    with db_cursor() as cursor:
        cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", values)
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = row_to_dict(cursor.fetchone())

    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    return AdminUserItem(
        id=row["id"],
        username=row["username"],
        fullName=row.get("full_name"),
        subscriptionTier=row.get("subscription_tier") or "free",
        subscriptionExpires=row.get("subscription_expires"),
        isAdmin=bool(row.get("is_admin")),
        commissionRate=float(row["commission_rate"]) if row.get("commission_rate") is not None else None,
        referralCode=row.get("referral_code"),
        createdAt=row.get("created_at"),
    )


@app.get("/api/admin/orders", response_model=AdminOrdersResponse)
def admin_list_orders(
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    _admin: dict = Depends(require_admin),
) -> AdminOrdersResponse:
    offset = (page - 1) * pageSize
    with db_cursor() as cursor:
        if status_filter:
            cursor.execute(
                "SELECT COUNT(*) AS count FROM orders WHERE status = ?", (status_filter,)
            )
        else:
            cursor.execute("SELECT COUNT(*) AS count FROM orders")
        total = int((row_to_dict(cursor.fetchone()) or {}).get("count", 0))

        if status_filter:
            cursor.execute(
                """
                SELECT o.*, u.username FROM orders o
                JOIN users u ON u.id = o.user_id
                WHERE o.status = ? ORDER BY o.id DESC LIMIT ? OFFSET ?
                """,
                (status_filter, pageSize, offset),
            )
        else:
            cursor.execute(
                """
                SELECT o.*, u.username FROM orders o
                JOIN users u ON u.id = o.user_id
                ORDER BY o.id DESC LIMIT ? OFFSET ?
                """,
                (pageSize, offset),
            )
        rows = [row_to_dict(r) for r in cursor.fetchall()]

    items = [
        AdminOrderItem(
            id=r["id"],
            orderNo=r["order_no"],
            userId=r["user_id"],
            username=r["username"],
            amount=float(r["amount"]),
            originalAmount=float(r.get("original_amount") or r["amount"]),
            status=r["status"],
            tier=r["tier"],
            duration=r["duration"],
            paymentMethod=r["payment_method"],
            promoCode=r.get("coupon_code") or r.get("referral_code"),
            createdAt=r.get("created_at"),
        )
        for r in rows
    ]
    total_pages = max(1, (total + pageSize - 1) // pageSize)
    return AdminOrdersResponse(items=items, page=page, pageSize=pageSize, total=total, totalPages=total_pages)


@app.get("/api/admin/commissions", response_model=AdminCommissionsResponse)
def admin_list_commissions(
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    _admin: dict = Depends(require_admin),
) -> AdminCommissionsResponse:
    offset = (page - 1) * pageSize
    with db_cursor() as cursor:
        if status_filter:
            cursor.execute(
                "SELECT COUNT(*) AS count FROM referral_commissions WHERE status = ?", (status_filter,)
            )
        else:
            cursor.execute("SELECT COUNT(*) AS count FROM referral_commissions")
        total = int((row_to_dict(cursor.fetchone()) or {}).get("count", 0))

        base_query = """
            SELECT rc.*, referrer.username AS referrer_username, referred.username AS referred_username,
                   o.amount AS order_amount
            FROM referral_commissions rc
            JOIN users referrer ON referrer.id = rc.referrer_user_id
            JOIN users referred ON referred.id = rc.referred_user_id
            JOIN orders o ON o.id = rc.order_id
        """
        if status_filter:
            cursor.execute(
                base_query + " WHERE rc.status = ? ORDER BY rc.id DESC LIMIT ? OFFSET ?",
                (status_filter, pageSize, offset),
            )
        else:
            cursor.execute(base_query + " ORDER BY rc.id DESC LIMIT ? OFFSET ?", (pageSize, offset))
        rows = [row_to_dict(r) for r in cursor.fetchall()]

    items = [
        AdminCommissionItem(
            id=r["id"],
            referrerUsername=r["referrer_username"],
            referredUsername=r["referred_username"],
            commissionAmount=float(r["commission_amount"]),
            commissionRate=float(r["commission_rate"]),
            status=r["status"],
            orderAmount=float(r["order_amount"]),
            createdAt=r.get("created_at"),
        )
        for r in rows
    ]
    total_pages = max(1, (total + pageSize - 1) // pageSize)
    return AdminCommissionsResponse(items=items, page=page, pageSize=pageSize, total=total, totalPages=total_pages)


@app.patch("/api/admin/commissions/{commission_id}")
def admin_update_commission(
    commission_id: int,
    payload: AdminUpdateCommissionRequest,
    _admin: dict = Depends(require_admin),
) -> dict:
    allowed = {"pending", "paid"}
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail=f"status must be one of {allowed}")
    now = utcnow_iso()
    with db_cursor() as cursor:
        cursor.execute(
            "UPDATE referral_commissions SET status = ?, updated_at = ? WHERE id = ?",
            (payload.status, now, commission_id),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Commission not found")
    return {"success": True}
