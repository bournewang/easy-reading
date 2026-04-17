from __future__ import annotations

from datetime import datetime, timezone

from fastapi import Depends, FastAPI, Form, HTTPException, Query, Request, Response, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

from .auth import (
    authenticate_user,
    create_session,
    create_user,
    delete_session,
    extract_bearer_token,
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
    PricingQuoteRequest,
    PricingQuoteResponse,
    PricingTierResponse,
    RegisterRequest,
    ReferralSummaryResponse,
    SubscriptionResponse,
    SubscriptionEntitlementsResponse,
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
    payment_service.ensure_sample_coupons()


def serialize_user(user: dict) -> UserPayload:
    return UserPayload(
        id=user["id"],
        username=user["username"],
        fullName=user.get("full_name"),
        referralCode=user.get("referral_code"),
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
        user = get_current_user(request)
        if user:
            entitlements = payment_service.get_entitlements(user["id"])
            if not entitlements["canTranslateSentences"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Sentence translation is available on paid plans.",
                )

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


@app.get("/api/auth/me")
def me(user: dict | None = Depends(get_current_user)) -> dict:
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"user": serialize_user(user).model_dump()}


@app.get("/api/subscription", response_model=SubscriptionResponse)
def subscription(user: dict = Depends(require_user)) -> SubscriptionResponse:
    return SubscriptionResponse(**payment_service.get_subscription_summary(user["id"]))


@app.get("/api/subscription/entitlements", response_model=SubscriptionEntitlementsResponse)
def subscription_entitlements(user: dict = Depends(require_user)) -> SubscriptionEntitlementsResponse:
    return SubscriptionEntitlementsResponse(**payment_service.get_entitlements(user["id"]))


@app.get("/api/referral/summary", response_model=ReferralSummaryResponse)
def referral_summary(user: dict = Depends(require_user)) -> ReferralSummaryResponse:
    return ReferralSummaryResponse(**payment_service.get_referral_summary(user["id"]))


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
def query_order(orderId: str, user: dict = Depends(require_user)) -> PaymentQueryResponse:
    order = payment_service.get_user_order(orderId, user["id"])
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
    if not payment_service.verify_signature(payload.signature, payload.orderId, payload.transactionId or ""):
        raise HTTPException(status_code=403, detail="Invalid payment signature")
    order = payment_service.mark_order_paid(payload.orderId, payload.transactionId)
    return {"success": True, "orderId": order["id"], "status": order["status"]}


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


@app.get("/mock-pay/alipay/{order_id}", response_class=HTMLResponse)
def mock_alipay_page(order_id: str, token: str = Query(default="")) -> HTMLResponse:
    order = payment_service.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order["payment_details"].get("confirmationToken") != token:
        raise HTTPException(status_code=403, detail="Invalid payment token")

    if order["status"] == "success":
        return HTMLResponse(
            f"""
            <html><body style="font-family: sans-serif; padding: 32px;">
                <h1>Payment already completed</h1>
                <p>Order {order['id']} has already been paid.</p>
                <p><a href="{payment_service.append_query_params(order['payment_details'].get('returnUrl'), {'orderId': order['id'], 'status': order['status']}) or '#'}">Return to Easy Reading</a></p>
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
              <p>Order: <strong>{order['id']}</strong></p>
              <p>Plan: <strong>{order['tier']}</strong></p>
              <p>Duration: <strong>{order['duration']} month(s)</strong></p>
              <p>Billing mode: <strong>{billing_mode}</strong></p>
              <p>Amount: <strong>¥{amount}</strong></p>

              <form method="post" action="{settings.app_base_url.rstrip('/')}/mock-pay/alipay/{order['id']}/complete" style="margin-top: 24px;">
                <input type="hidden" name="token" value="{token}" />
                <button type="submit" style="width: 100%; border: 0; border-radius: 999px; padding: 14px 18px; background: #1677ff; color: white; font-size: 16px; font-weight: 600; cursor: pointer;">
                  Complete Mock Payment
                </button>
              </form>

              <form method="post" action="{settings.app_base_url.rstrip('/')}/mock-pay/alipay/{order['id']}/cancel" style="margin-top: 12px;">
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


@app.post("/mock-pay/alipay/{order_id}/complete")
def mock_alipay_complete(order_id: str, token: str = Form(default="")) -> RedirectResponse:
    order = payment_service.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["payment_details"].get("confirmationToken") != token:
        raise HTTPException(status_code=403, detail="Invalid payment token")

    transaction_id = f"ALI{int(datetime.now().timestamp())}{order_id[-6:]}"
    paid_order = payment_service.mark_order_paid(order_id, transaction_id)
    redirect_url = payment_service.append_query_params(
        paid_order["payment_details"].get("returnUrl"),
        {
            "orderId": paid_order["id"],
            "status": paid_order["status"],
        },
    ) or f"{settings.app_base_url.rstrip('/')}/mock-pay/alipay/{paid_order['id']}?token={token}"
    return RedirectResponse(url=redirect_url, status_code=status.HTTP_303_SEE_OTHER)


@app.post("/mock-pay/alipay/{order_id}/cancel")
def mock_alipay_cancel(order_id: str, token: str = Form(default="")) -> RedirectResponse:
    order = payment_service.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["payment_details"].get("confirmationToken") != token:
        raise HTTPException(status_code=403, detail="Invalid payment token")

    redirect_url = payment_service.append_query_params(
        order["payment_details"].get("cancelUrl") or order["payment_details"].get("returnUrl"),
        {
            "orderId": order["id"],
            "status": "cancelled",
        },
    ) or f"{settings.app_base_url.rstrip('/')}/mock-pay/alipay/{order['id']}?token={token}"
    return RedirectResponse(url=redirect_url, status_code=status.HTTP_303_SEE_OTHER)
