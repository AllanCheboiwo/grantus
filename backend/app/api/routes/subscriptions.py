"""
Subscription/Payment API routes
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.client import Client, ClientUser
from app.schemas.subscription import (
    CheckoutRequest,
    CheckoutResponse,
    BillingPortalRequest,
    BillingPortalResponse,
    SubscriptionStatusResponse,
    PricesResponse,
    PriceInfo
)
from app.services import stripe_service

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


def get_client_for_user(user: User, db: Session) -> Client:
    """Get the client organization linked to a client user"""
    if user.role != UserRole.client:
        raise HTTPException(status_code=403, detail="Not a client user")
    
    client_user = db.query(ClientUser).filter(ClientUser.user_id == user.id).first()
    if not client_user:
        raise HTTPException(status_code=404, detail="No client organization linked to this user")
    
    client = db.query(Client).filter(Client.id == client_user.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client organization not found")
    
    return client


@router.get("/prices", response_model=PricesResponse)
async def get_prices():
    """Get available subscription prices"""
    prices = stripe_service.get_price_info()
    
    monthly = None
    annual = None
    
    if "monthly" in prices:
        monthly = PriceInfo(**prices["monthly"])
    if "annual" in prices:
        annual = PriceInfo(**prices["annual"])
    
    return PricesResponse(monthly=monthly, annual=annual)


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current subscription status for the logged-in client user"""
    client = get_client_for_user(current_user, db)
    
    # Check if access is from manual override or active subscription
    has_active_subscription = client.subscription_status in ["active", "trialing"]
    is_manual = client.grant_db_access and not has_active_subscription
    
    return SubscriptionStatusResponse(
        has_access=client.grant_db_access,
        status=client.subscription_status,
        current_period_end=client.current_period_end,
        is_manual_override=is_manual,
        stripe_customer_id=client.stripe_customer_id
    )


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    request: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a Stripe Checkout session for subscription"""
    client = get_client_for_user(current_user, db)
    
    # Validate price_id
    valid_prices = [settings.STRIPE_PRICE_MONTHLY, settings.STRIPE_PRICE_ANNUAL]
    if request.price_id not in valid_prices:
        raise HTTPException(status_code=400, detail="Invalid price ID")
    
    # Default URLs
    success_url = request.success_url or f"{settings.FRONTEND_URL}/portal/subscription?success=true"
    cancel_url = request.cancel_url or f"{settings.FRONTEND_URL}/portal/subscription?canceled=true"
    
    try:
        result = stripe_service.create_checkout_session(
            client=client,
            price_id=request.price_id,
            success_url=success_url,
            cancel_url=cancel_url,
            db=db
        )
        return CheckoutResponse(
            session_id=result["session_id"],
            checkout_url=result["checkout_url"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")


@router.post("/portal", response_model=BillingPortalResponse)
async def create_billing_portal_session(
    request: BillingPortalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a Stripe Billing Portal session for managing subscription"""
    client = get_client_for_user(current_user, db)
    
    if not client.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No subscription found")
    
    return_url = request.return_url or f"{settings.FRONTEND_URL}/portal/subscription"
    
    try:
        portal_url = stripe_service.create_billing_portal_session(
            customer_id=client.stripe_customer_id,
            return_url=return_url
        )
        return BillingPortalResponse(portal_url=portal_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create portal session: {str(e)}")


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature"),
    db: Session = Depends(get_db)
):
    """
    Handle Stripe webhook events.
    This endpoint is PUBLIC (no auth) - security is via signature verification.
    """
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")
    
    payload = await request.body()
    
    try:
        event = stripe_service.verify_webhook_signature(payload, stripe_signature)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    event_type = event.get("type")
    event_data = event.get("data", {}).get("object", {})
    
    # Handle different event types
    if event_type == "checkout.session.completed":
        stripe_service.handle_checkout_completed(event_data, db)
    
    elif event_type == "customer.subscription.updated":
        stripe_service.handle_subscription_updated(event_data, db)
    
    elif event_type == "customer.subscription.deleted":
        stripe_service.handle_subscription_deleted(event_data, db)
    
    elif event_type == "invoice.payment_failed":
        stripe_service.handle_invoice_payment_failed(event_data, db)
    
    elif event_type == "invoice.paid":
        stripe_service.handle_invoice_paid(event_data, db)
    
    # Return 200 to acknowledge receipt (required by Stripe)
    return {"status": "received", "type": event_type}
