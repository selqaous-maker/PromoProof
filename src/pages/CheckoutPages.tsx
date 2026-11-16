import { AlertCircle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../components/MarketingLayout';
import { useAuth } from '../context/AuthContext';

export function CheckoutSuccessPage() {
  const {
    user,
    publicConfig,
    hasProEntitlement,
    refreshEntitlementFromServer,
  } = useAuth();
  const [checking, setChecking] = useState(true);

  const verify = async () => {
    setChecking(true);
    await refreshEntitlementFromServer();
    setChecking(false);
  };

  useEffect(() => {
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  return (
    <MarketingLayout brandName={publicConfig.brandName} isAuthenticated={Boolean(user)}>
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="rounded-xl border border-[#263449] bg-[#111C2E] p-6 sm:p-8 space-y-6">
          {checking ? (
            <div className="space-y-3">
              <div className="w-7 h-7 rounded-full border-2 border-[#5EE4A4] border-t-transparent animate-spin" />
              <h1 className="text-xl font-bold text-[#F8FAFC]">
                Verifying purchase entitlement...
              </h1>
              <p className="text-sm text-[#9CAFC6]">
                Checking server-side webhook confirmation. Redirect URLs alone never unlock paid
                access.
              </p>
            </div>
          ) : hasProEntitlement ? (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-[#34D399] font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                <span>Verified Entitlement Active</span>
              </div>
              <h1 className="text-2xl font-bold text-[#F8FAFC]">
                Welcome to {publicConfig.brandName} Pro
              </h1>
              <p className="text-sm text-[#9CAFC6] leading-relaxed">
                Your payment has been confirmed by our server and Pro access is active on your
                account. Continue to onboarding or your scenario dashboard.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  to="/app/onboarding"
                  className="px-5 py-2.5 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-sm font-semibold hover:bg-[#4AD493]"
                >
                  Start Store Onboarding
                </Link>
                <Link
                  to="/app/dashboard"
                  className="px-5 py-2.5 rounded-lg border border-[#263449] text-sm font-semibold text-[#F8FAFC] hover:bg-[#0B1220]"
                >
                  Open Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-[#FBBF24] font-semibold text-sm">
                <AlertCircle className="w-5 h-5" aria-hidden="true" />
                <span>Entitlement Not Yet Confirmed</span>
              </div>
              <h1 className="text-2xl font-bold text-[#F8FAFC]">
                Awaiting provider webhook confirmation
              </h1>
              <p className="text-sm text-[#9CAFC6] leading-relaxed">
                {user
                  ? 'Your account does not show a verified active purchase yet. If you just completed payment, webhooks can take a few seconds to arrive—click Recheck below. If checkout is not yet connected by the owner, no purchase has been processed.'
                  : 'Please sign in to the account email used at checkout so we can verify your entitlement status.'}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                {user ? (
                  <button
                    type="button"
                    onClick={verify}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-sm font-semibold hover:bg-[#4AD493] cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" aria-hidden="true" />
                    Recheck entitlement
                  </button>
                ) : (
                  <Link
                    to="/login?next=/checkout/success"
                    className="px-5 py-2.5 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-sm font-semibold hover:bg-[#4AD493]"
                  >
                    Sign in to verify
                  </Link>
                )}
                <Link
                  to="/contact"
                  className="px-5 py-2.5 rounded-lg border border-[#263449] text-sm font-semibold text-[#F8FAFC] hover:bg-[#0B1220]"
                >
                  Contact Support
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </MarketingLayout>
  );
}

export function CheckoutCancelPage() {
  const { user, publicConfig } = useAuth();

  return (
    <MarketingLayout brandName={publicConfig.brandName} isAuthenticated={Boolean(user)}>
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="rounded-xl border border-[#263449] bg-[#111C2E] p-6 sm:p-8 space-y-5">
          <div className="inline-flex items-center gap-2 text-[#9CAFC6] font-semibold text-sm">
            <XCircle className="w-5 h-5 text-[#FB7185]" aria-hidden="true" />
            <span>Checkout Cancelled</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">
            No payment was completed
          </h1>
          <p className="text-sm text-[#9CAFC6] leading-relaxed">
            You cancelled checkout before finishing payment. No charge was processed and your
            account remains unchanged. You can continue using the free calculator or return to
            pricing anytime.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/pricing"
              className="px-5 py-2.5 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-sm font-semibold hover:bg-[#4AD493]"
            >
              Return to Pricing
            </Link>
            <Link
              to="/demo"
              className="px-5 py-2.5 rounded-lg border border-[#263449] text-sm font-semibold text-[#F8FAFC] hover:bg-[#0B1220]"
            >
              Use Free Calculator
            </Link>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
