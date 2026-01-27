"""
Stripe service for handling subscription payments
"""
import stripe
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.client import Client

# Initialize Stripe with secret key
stripe.api_key = settings.STRIPE_SECRET_KEY


def create_checkout_session(
    client: Client,
    price_id: str,
    success_url: str,
    cancel_url: str,
    db: Session
) -> Dict[str, Any]:
    """
    Create a Stripe Checkout Session for subscription.
    Returns the checkout session URL.
    """
    # Create or retrieve Stripe customer
    if client.stripe_customer_id:
        customer_id = client.stripe_customer_id
    else:
        # Create new Stripe customer
        customer = stripe.Customer.create(
            name=client.name,
            metadata={
                "client_id": str(client.id),
                "entity_type": client.entity_type or ""
            }
        )
        customer_id = customer.id
        # Save customer ID to client
        client.stripe_customer_id = customer_id
        db.commit()
    
    # Create checkout session
    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{
            "price": price_id,
            "quantity": 1,
        }],
        mode="subscription",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "client_id": str(client.id)
        }
    )
    
    return {
        "session_id": session.id,
        "checkout_url": session.url
    }


def create_billing_portal_session(
    customer_id: str,
    return_url: str
) -> str:
    """
    Create a Stripe Billing Portal session for managing subscription.
    Returns the portal URL.
    """
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return session.url


def handle_checkout_completed(session: Dict[str, Any], db: Session) -> None:
    """Handle checkout.session.completed webhook event"""
    client_id = session.get("metadata", {}).get("client_id")
    if not client_id:
        return
    
    client = db.query(Client).filter(Client.id == UUID(client_id)).first()
    if not client:
        return
    
    # Get subscription details
    subscription_id = session.get("subscription")
    if subscription_id:
        subscription = stripe.Subscription.retrieve(subscription_id)
        client.subscription_id = subscription_id
        client.subscription_status = subscription.status
        client.subscription_price_id = subscription["items"]["data"][0]["price"]["id"]
        client.current_period_end = datetime.fromtimestamp(subscription.current_period_end)
        client.grant_db_access = True  # Grant access on successful checkout
        db.commit()


def handle_subscription_updated(subscription: Dict[str, Any], db: Session) -> None:
    """Handle customer.subscription.updated webhook event"""
    subscription_id = subscription.get("id")
    if not subscription_id:
        return
    
    client = db.query(Client).filter(Client.subscription_id == subscription_id).first()
    if not client:
        return
    
    client.subscription_status = subscription.get("status")
    client.current_period_end = datetime.fromtimestamp(subscription.get("current_period_end", 0))
    
    # Update access based on status
    status = subscription.get("status")
    if status in ["active", "trialing"]:
        client.grant_db_access = True
    elif status in ["canceled", "unpaid", "incomplete_expired"]:
        client.grant_db_access = False
    # past_due: keep access during grace period (Stripe retries)
    
    db.commit()


def handle_subscription_deleted(subscription: Dict[str, Any], db: Session) -> None:
    """Handle customer.subscription.deleted webhook event"""
    subscription_id = subscription.get("id")
    if not subscription_id:
        return
    
    client = db.query(Client).filter(Client.subscription_id == subscription_id).first()
    if not client:
        return
    
    client.subscription_status = "canceled"
    client.grant_db_access = False
    db.commit()


def handle_invoice_payment_failed(invoice: Dict[str, Any], db: Session) -> None:
    """Handle invoice.payment_failed webhook event"""
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        return
    
    client = db.query(Client).filter(Client.subscription_id == subscription_id).first()
    if not client:
        return
    
    client.subscription_status = "past_due"
    # Keep access during grace period - Stripe will retry
    db.commit()


def handle_invoice_paid(invoice: Dict[str, Any], db: Session) -> None:
    """Handle invoice.paid webhook event - restore access if was past_due"""
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        return
    
    client = db.query(Client).filter(Client.subscription_id == subscription_id).first()
    if not client:
        return
    
    client.subscription_status = "active"
    client.grant_db_access = True
    db.commit()


def verify_webhook_signature(payload: bytes, sig_header: str) -> Dict[str, Any]:
    """Verify webhook signature and return event data"""
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
        return event
    except ValueError:
        raise ValueError("Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise ValueError("Invalid signature")


def get_price_info() -> Dict[str, Any]:
    """Get price information for display"""
    prices = {}
    
    if settings.STRIPE_PRICE_MONTHLY:
        try:
            price = stripe.Price.retrieve(settings.STRIPE_PRICE_MONTHLY)
            prices["monthly"] = {
                "price_id": price.id,
                "amount": price.unit_amount / 100,  # Convert from cents
                "currency": price.currency,
                "interval": price.recurring.interval if price.recurring else None
            }
        except stripe.error.StripeError:
            pass
    
    if settings.STRIPE_PRICE_ANNUAL:
        try:
            price = stripe.Price.retrieve(settings.STRIPE_PRICE_ANNUAL)
            prices["annual"] = {
                "price_id": price.id,
                "amount": price.unit_amount / 100,
                "currency": price.currency,
                "interval": price.recurring.interval if price.recurring else None
            }
        except stripe.error.StripeError:
            pass
    
    return prices
