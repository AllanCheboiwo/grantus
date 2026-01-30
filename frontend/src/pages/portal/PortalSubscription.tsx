import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { subscriptionApi, portalApi } from '../../services/api';
import type { SubscriptionStatus, Prices, Client } from '../../types';
import {
  CheckCircleIcon,
  SparklesIcon,
  CreditCardIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function PortalSubscription() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [prices, setPrices] = useState<Prices | null>(null);
  const [clientInfo, setClientInfo] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    
    // Handle return from Stripe
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription activated! Welcome to the Grant Database.');
    } else if (searchParams.get('canceled') === 'true') {
      toast('Checkout canceled', { icon: '👋' });
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      const [statusData, pricesData, client] = await Promise.all([
        subscriptionApi.getStatus(),
        subscriptionApi.getPrices(),
        portalApi.getMyClient(),
      ]);
      setStatus(statusData);
      setPrices(pricesData);
      setClientInfo(client);
    } catch (error) {
      toast.error('Failed to load subscription info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async (priceId: string) => {
    setIsCheckingOut(priceId);
    try {
      const { checkout_url } = await subscriptionApi.createCheckout(priceId);
      window.location.href = checkout_url;
    } catch (error) {
      toast.error('Failed to start checkout');
      setIsCheckingOut(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const { portal_url } = await subscriptionApi.createBillingPortal();
      window.location.href = portal_url;
    } catch (error) {
      toast.error('Failed to open billing portal');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  const hasAccess = status?.has_access;
  const isActive = status?.status === 'active' || status?.status === 'trialing';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Subscription</h1>
        <p className="mt-2 text-gray-600">
          Manage your Grant Database access and billing.
        </p>
      </div>

      {/* Current Status */}
      {hasAccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-green-900">Access Active</h2>
              <p className="text-green-700 text-sm mt-1">
                {status?.is_manual_override 
                  ? 'Your organization has been granted complimentary access to the Grant Database.'
                  : isActive && status?.current_period_end
                    ? `Your subscription is active. Next billing date: ${format(new Date(status.current_period_end), 'MMMM d, yyyy')}`
                    : 'You have access to the Grant Database.'}
              </p>
              {!status?.is_manual_override && status?.stripe_customer_id && (
                <button
                  onClick={handleManageBilling}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white border border-green-300 rounded-lg text-sm font-medium text-green-700 hover:bg-green-50"
                >
                  <CreditCardIcon className="w-4 h-4" />
                  Manage Billing
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Past Due Warning */}
      {status?.status === 'past_due' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <ArrowPathIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-amber-900">Payment Issue</h2>
              <p className="text-amber-700 text-sm mt-1">
                We couldn't process your last payment. Please update your payment method to continue using the Grant Database.
              </p>
              <button
                onClick={handleManageBilling}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 rounded-lg text-sm font-medium text-white hover:bg-amber-700"
              >
                <CreditCardIcon className="w-4 h-4" />
                Update Payment Method
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Cards - Show if no access or canceled */}
      {(!hasAccess || status?.status === 'canceled') && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full text-white text-sm font-medium mb-4">
              <SparklesIcon className="w-4 h-4" />
              Unlock Self-Service
            </div>
            <h2 className="text-xl font-display font-bold text-gray-900">
              Access the Grant Database
            </h2>
            <p className="mt-2 text-gray-600 max-w-xl mx-auto">
              Find grants that match your organization, search by criteria, and apply on your own terms.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Monthly */}
            {prices?.monthly && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900">Monthly</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">
                      ${prices.monthly.amount}
                    </span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">Cancel anytime</p>
                </div>
                <ul className="mt-6 space-y-3">
                  <Feature>Browse all grants in our database</Feature>
                  <Feature>Find grants matching your profile</Feature>
                  <Feature>Search & filter by criteria</Feature>
                  <Feature>View full grant details</Feature>
                </ul>
                <button
                  onClick={() => handleCheckout(prices.monthly!.price_id)}
                  disabled={isCheckingOut !== null}
                  className="mt-6 w-full py-3 px-4 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCheckingOut === prices.monthly.price_id ? 'Redirecting...' : 'Subscribe Monthly'}
                </button>
              </div>
            )}

            {/* Annual */}
            {prices?.annual && (
              <div className="bg-white border-2 border-primary-500 rounded-xl p-6 shadow-sm relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Best Value
                  </span>
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900">Annual</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">
                      ${prices.annual.amount}
                    </span>
                    <span className="text-gray-500">/year</span>
                  </div>
                  <p className="mt-2 text-sm text-green-600 font-medium">
                    Save ${(prices.monthly?.amount || 0) * 12 - prices.annual.amount}/year
                  </p>
                </div>
                <ul className="mt-6 space-y-3">
                  <Feature>Browse all grants in our database</Feature>
                  <Feature>Find grants matching your profile</Feature>
                  <Feature>Search & filter by criteria</Feature>
                  <Feature>View full grant details</Feature>
                </ul>
                <button
                  onClick={() => handleCheckout(prices.annual!.price_id)}
                  disabled={isCheckingOut !== null}
                  className="mt-6 w-full py-3 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCheckingOut === prices.annual.price_id ? 'Redirecting...' : 'Subscribe Annually'}
                </button>
              </div>
            )}
          </div>

          {/* No prices configured */}
          {!prices?.monthly && !prices?.annual && (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-500">
                Subscription pricing is not yet configured. Please contact support.
              </p>
            </div>
          )}
        </div>
      )}

      {/* What's Included */}
      {hasAccess && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">What's Included</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Feature>Browse all grants in our database</Feature>
            <Feature>Find grants matching your profile</Feature>
            <Feature>Search & filter by criteria</Feature>
            <Feature>View full grant details</Feature>
          </div>
        </div>
      )}
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
      <span className="text-gray-700">{children}</span>
    </div>
  );
}
