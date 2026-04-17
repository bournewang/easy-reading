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


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=6, max_length=256)
    fullName: str | None = Field(default=None, max_length=128)


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=6, max_length=256)


class UserPayload(BaseModel):
    id: str
    username: str
    fullName: str | None = None
    referralCode: str | None = None
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


class PaymentQueryResponse(BaseModel):
    orderId: str
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
    orderId: str
    transactionId: str | None = None
    signature: str | None = None


class SubscriptionResponse(BaseModel):
    subscriptionId: str | None = None
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


class ReferralSummaryResponse(BaseModel):
    referralCode: str
    referralLink: str
    totalReferrals: int = 0
    successfulReferrals: int = 0
    pendingCommission: float = 0
    paidCommission: float = 0
    totalCommission: float = 0
