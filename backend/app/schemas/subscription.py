"""
Pydantic schemas for subscription/payment endpoints
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CheckoutRequest(BaseModel):
    """Request to create a checkout session"""
    price_id: str  # monthly or annual price ID
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CheckoutResponse(BaseModel):
    """Response with checkout session details"""
    session_id: str
    checkout_url: str


class BillingPortalRequest(BaseModel):
    """Request to create a billing portal session"""
    return_url: Optional[str] = None


class BillingPortalResponse(BaseModel):
    """Response with billing portal URL"""
    portal_url: str


class SubscriptionStatusResponse(BaseModel):
    """Current subscription status for a client"""
    has_access: bool
    status: Optional[str] = None  # active, canceled, past_due, etc.
    current_period_end: Optional[datetime] = None
    is_manual_override: bool = False
    stripe_customer_id: Optional[str] = None


class PriceInfo(BaseModel):
    """Price information for display"""
    price_id: str
    amount: float
    currency: str
    interval: Optional[str] = None


class PricesResponse(BaseModel):
    """Available subscription prices"""
    monthly: Optional[PriceInfo] = None
    annual: Optional[PriceInfo] = None
