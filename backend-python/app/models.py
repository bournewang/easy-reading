from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1)
    target_lang: str = "Chinese"


class TranslateResponse(BaseModel):
    data: str
    success: bool = True


class TtsSynthesizeRequest(BaseModel):
    text: str = Field(min_length=1)


class TtsSynthesizeResponse(BaseModel):
    audioUrl: str
    requestId: str | None = None
    voice: str | None = None
    model: str | None = None


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=6, max_length=256)
    email: str | None = Field(default=None, max_length=191)
    fullName: str | None = Field(default=None, max_length=128)
    referralCode: str | None = Field(default=None, max_length=64)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=191)  # accepts email too
    password: str = Field(min_length=6, max_length=256)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=3, max_length=191)


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=6, max_length=256)


class UpdateProfileRequest(BaseModel):
    email: str = Field(min_length=3, max_length=191)


class UserPayload(BaseModel):
    id: int
    username: str
    email: str | None = None
    fullName: str | None = None
    referralCode: str | None = None
    isAdmin: bool = False
    subscriptionTier: str = "free"
    subscriptionExpires: datetime | None = None


class AuthResponse(BaseModel):
    message: str
    user: UserPayload
    token: str
    tokenType: str = "Bearer"


class DefinitionModel(BaseModel):
    definition: str
    translation: str | None = None
    example: str | None = None
    synonyms: list[str] = Field(default_factory=list)
    antonyms: list[str] = Field(default_factory=list)
    definition_zh: str | None = None


class MeaningModel(BaseModel):
    partOfSpeech: str | None = None
    definitions: list[DefinitionModel] = Field(default_factory=list)
    synonyms: list[str] = Field(default_factory=list)
    antonyms: list[str] = Field(default_factory=list)


class PhoneticModel(BaseModel):
    text: str | None = None
    audio: str | None = None
    sourceUrl: str | None = None
    license: dict[str, Any] | None = None


class DictionaryEntryModel(BaseModel):
    word: str
    phonetics: list[PhoneticModel] = Field(default_factory=list)
    meanings: list[MeaningModel] = Field(default_factory=list)
    sourceUrls: list[str] = Field(default_factory=list)
    meta: dict[str, Any] | None = None


class PaymentCreateRequest(BaseModel):
    tier: str
    duration: int
    billingMode: str = "prepaid"
    returnUrl: str | None = None
    cancelUrl: str | None = None
    promoCode: str | None = None


class PricingDurationOptionResponse(BaseModel):
    months: int
    originalPrice: float
    salePrice: float
    savings: int | None = None
    default: bool = False


class PricingTierResponse(BaseModel):
    id: str
    isPopular: bool = False
    originalMonthlyPrice: float | None = None
    saleMonthlyPrice: float | None = None
    durationOptions: list[PricingDurationOptionResponse] = Field(default_factory=list)


class PricingQuoteRequest(BaseModel):
    tier: str
    duration: int
    promoCode: str | None = None


class PricingQuoteResponse(BaseModel):
    tier: str
    duration: int
    originalAmount: float
    saleAmount: float
    discountAmount: float
    finalAmount: float
    promoCode: str | None = None
    couponDiscountAmount: float = 0
    referralCode: str | None = None
    referralDiscountAmount: float = 0
    commissionAmount: float = 0
    commissionRate: float = 0
    paymentMode: str = "prepaid"


class ReadingHistoryItemModel(BaseModel):
    key: str
    kind: str
    routeUrl: str
    title: str
    subtitle: str
    sourceUrl: str | None = None
    wordCount: int = 0
    readingTime: int = 0
    timestamp: int = 0


class ReadingHistorySyncRequest(BaseModel):
    items: list[ReadingHistoryItemModel] = Field(default_factory=list)


class WordbookEntryModel(BaseModel):
    word: str
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class WordbookReplaceRequest(BaseModel):
    words: list[str] = Field(default_factory=list)


class WordbookSyncRequest(BaseModel):
    words: list[str] = Field(default_factory=list)


class VocabBookSettingsResponse(BaseModel):
    selectedBookIds: list[str] = Field(default_factory=list)


class VocabBookSettingsRequest(BaseModel):
    selectedBookIds: list[str] = Field(default_factory=list)


class AnonymousLimitsResponse(BaseModel):
    translationDailyLimit: int
    ttsDailyLimit: int
    wordbookLimit: int
    historyLimit: int


class AnonymousUsageResponse(BaseModel):
    feature: str
    dailyLimit: int
    usedCount: int
    remainingCount: int
    usageDate: str


class PaymentQueryResponse(BaseModel):
    orderId: int
    orderNo: str
    amount: float
    originalAmount: float | None = None
    saleAmount: float | None = None
    discountAmount: float | None = None
    status: str
    tier: str | None = None
    duration: int | None = None
    billingMode: str | None = None
    promoCode: str | None = None
    codeUrl: str | None = None
    paymentUrl: str | None = None
    createdAt: datetime
    updatedAt: datetime


class PaymentNotifyRequest(BaseModel):
    orderId: int | None = None
    orderNo: str | None = None
    transactionId: str | None = None
    signature: str | None = None


class SubscriptionResponse(BaseModel):
    subscriptionId: int | None = None
    tier: str
    expiresAt: datetime | None = None
    active: bool
    billingMode: str | None = None
    intervalMonths: int | None = None
    autoRenew: bool = False
    cancelAtPeriodEnd: bool = False


class SubscriptionEntitlementsResponse(BaseModel):
    tier: str
    active: bool
    canUseWordBook: bool
    canTranslateSentences: bool
    canUseTextToSpeech: bool
    hasUnlimitedTranslation: bool = False
    hasUnlimitedTextToSpeech: bool = False
    translationDailyLimit: int | None = None
    ttsDailyLimit: int | None = None


class ReferralSummaryResponse(BaseModel):
    referralCode: str
    referralLink: str
    totalReferrals: int = 0
    successfulReferrals: int = 0
    pendingCommission: float = 0
    paidCommission: float = 0
    totalCommission: float = 0


class ReferralCommissionItem(BaseModel):
    id: int
    orderId: int
    referredUserId: int
    referredUsername: str
    referralCode: str
    commissionRate: float
    commissionAmount: float
    status: str
    orderTier: str | None = None
    orderDuration: int | None = None
    orderAmount: float = 0
    createdAt: str | None = None


class ReferralCommissionsResponse(BaseModel):
    items: list[ReferralCommissionItem] = Field(default_factory=list)
    page: int = 1
    pageSize: int = 20
    total: int = 0
    totalPages: int = 1


class NewsItemModel(BaseModel):
    id: str
    title: str
    url: str
    category: str
    description: str = ""
    imageUrl: str | None = None
    source: str
    readingTime: int = 0


# ── Admin models ─────────────────────────────────────────────────────────────

class AdminUserItem(BaseModel):
    id: int
    username: str
    fullName: str | None = None
    subscriptionTier: str
    subscriptionExpires: str | None = None
    isAdmin: bool = False
    commissionRate: float | None = None
    referralCode: str | None = None
    createdAt: str | None = None


class AdminUsersResponse(BaseModel):
    items: list[AdminUserItem] = Field(default_factory=list)
    page: int = 1
    pageSize: int = 20
    total: int = 0
    totalPages: int = 1


class AdminUpdateUserRequest(BaseModel):
    subscriptionTier: str | None = None
    subscriptionExpires: str | None = None
    isAdmin: bool | None = None
    commissionRate: float | None = None


class AdminOrderItem(BaseModel):
    id: int
    orderNo: str
    userId: int
    username: str
    amount: float
    originalAmount: float
    status: str
    tier: str
    duration: int
    paymentMethod: str
    promoCode: str | None = None
    createdAt: str | None = None


class AdminOrdersResponse(BaseModel):
    items: list[AdminOrderItem] = Field(default_factory=list)
    page: int = 1
    pageSize: int = 20
    total: int = 0
    totalPages: int = 1


class AdminCommissionItem(BaseModel):
    id: int
    referrerUsername: str
    referredUsername: str
    commissionAmount: float
    commissionRate: float
    status: str
    orderAmount: float
    createdAt: str | None = None


class AdminCommissionsResponse(BaseModel):
    items: list[AdminCommissionItem] = Field(default_factory=list)
    page: int = 1
    pageSize: int = 20
    total: int = 0
    totalPages: int = 1


class AdminUpdateCommissionRequest(BaseModel):
    status: str


class NewsListResponse(BaseModel):
    items: list[NewsItemModel] = Field(default_factory=list)
    page: int = 1
    pageSize: int = 20
    total: int = 0
    totalPages: int = 0
    categories: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)
    lastSyncedAt: datetime | None = None


class NewsCategoriesResponse(BaseModel):
    categories: list[str] = Field(default_factory=list)
    firstArticleByCategory: dict[str, str] = Field(default_factory=dict)
    lastSyncedAt: datetime | None = None


class NewsArticleContentResponse(BaseModel):
    id: str
    article: dict[str, Any]
    syncedAt: datetime | None = None
