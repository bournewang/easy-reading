from __future__ import annotations

from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.responses import JSONResponse

from .auth import (
    authenticate_user,
    create_session,
    create_user,
    delete_session,
    get_current_user,
    get_user_by_username,
)
from .config import settings
from .db import init_db, parse_dt
from .models import (
    AuthResponse,
    DictionaryEntryModel,
    LoginRequest,
    PaymentCreateRequest,
    PaymentNotifyRequest,
    PaymentQueryResponse,
    RegisterRequest,
    SubscriptionResponse,
    TranslateRequest,
    TranslateResponse,
    UserPayload,
)
from .services.dictionary import dictionary_service
from .services.dictionary import DictionaryFetchError
from .services.payment import payment_service
from .services.translation import TranslationError, translation_service


app = FastAPI(title="Easy Reading Python Backend", version="0.1.0")


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


def serialize_user(user: dict) -> UserPayload:
    return UserPayload(
        id=user["id"],
        username=user["username"],
        fullName=user.get("full_name"),
        subscriptionTier=user.get("subscription_tier") or "free",
        subscriptionExpires=parse_dt(user.get("subscription_expires")),
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


@app.post("/api/translate")
def translate(payload: TranslateRequest, debug: bool = Query(default=False)) -> dict:
    try:
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


@app.get("/api/entries")
def list_entries() -> dict:
    return {"items": dictionary_service.list_words()}


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

    try:
        user = create_user(payload.username, payload.password, payload.fullName)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    token = create_session(user["id"])
    set_session_cookie(request, response, token)
    return AuthResponse(message="User created successfully", user=serialize_user(user))


@app.post("/api/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, request: Request, response: Response) -> AuthResponse:
    user = authenticate_user(payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_session(user["id"])
    set_session_cookie(request, response, token)
    return AuthResponse(message="Logged in successfully", user=serialize_user(user))


@app.post("/api/auth/logout")
def logout(request: Request, response: Response) -> dict:
    session_token = request.cookies.get(settings.session_cookie_name)
    if session_token:
        delete_session(session_token)
    response.delete_cookie(settings.session_cookie_name, path="/")
    return {"message": "Logged out successfully"}


@app.get("/api/auth/me")
def me(user: dict | None = Depends(get_current_user)) -> dict:
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"user": serialize_user(user).model_dump()}


@app.get("/api/subscription", response_model=SubscriptionResponse)
def subscription(user: dict = Depends(require_user)) -> SubscriptionResponse:
    expires_at = parse_dt(user.get("subscription_expires"))
    active = bool(expires_at and expires_at > datetime.now(timezone.utc))
    return SubscriptionResponse(
        tier=user.get("subscription_tier") or "free",
        expiresAt=expires_at,
        active=active,
    )


@app.post("/api/payment/wechat/create", response_model=PaymentQueryResponse)
def create_wechat_order(payload: PaymentCreateRequest, user: dict = Depends(require_user)) -> PaymentQueryResponse:
    order = payment_service.create_order(
        user_id=user["id"],
        payment_method="wechat",
        tier=payload.tier,
        duration=payload.duration,
    )
    return PaymentQueryResponse(
        orderId=order["id"],
        amount=order["amount"],
        status=order["status"],
        codeUrl=f"{settings.app_base_url.rstrip('/')}/mock-pay/wechat/{order['id']}",
        createdAt=parse_dt(order["created_at"]),
        updatedAt=parse_dt(order["updated_at"]),
    )


@app.post("/api/payment/alipay/create", response_model=PaymentQueryResponse)
def create_alipay_order(payload: PaymentCreateRequest, user: dict = Depends(require_user)) -> PaymentQueryResponse:
    order = payment_service.create_order(
        user_id=user["id"],
        payment_method="alipay",
        tier=payload.tier,
        duration=payload.duration,
        amount=payload.amount,
        order_id=payload.orderId,
    )
    return PaymentQueryResponse(
        orderId=order["id"],
        amount=order["amount"],
        status=order["status"],
        paymentUrl=f"{settings.app_base_url.rstrip('/')}/mock-pay/alipay/{order['id']}",
        createdAt=parse_dt(order["created_at"]),
        updatedAt=parse_dt(order["updated_at"]),
    )


@app.get("/api/payment/query-order", response_model=PaymentQueryResponse)
def query_order(orderId: str) -> PaymentQueryResponse:
    order = payment_service.get_order(orderId)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    code_url = None
    payment_url = None
    if order["payment_method"] == "wechat":
        code_url = f"{settings.app_base_url.rstrip('/')}/mock-pay/wechat/{order['id']}"
    if order["payment_method"] == "alipay":
        payment_url = f"{settings.app_base_url.rstrip('/')}/mock-pay/alipay/{order['id']}"

    return PaymentQueryResponse(
        orderId=order["id"],
        amount=order["amount"],
        status=order["status"],
        codeUrl=code_url,
        paymentUrl=payment_url,
        createdAt=parse_dt(order["created_at"]),
        updatedAt=parse_dt(order["updated_at"]),
    )


@app.post("/api/payment/wechat/notify")
def wechat_notify(payload: PaymentNotifyRequest) -> dict:
    order = payment_service.mark_order_paid(payload.orderId, payload.transactionId)
    return {"success": True, "orderId": order["id"], "status": order["status"]}


@app.post("/api/payment/alipay/notify")
def alipay_notify(payload: PaymentNotifyRequest) -> dict:
    order = payment_service.mark_order_paid(payload.orderId, payload.transactionId)
    return {"success": True, "orderId": order["id"], "status": order["status"]}
