import { AlertCircle, ArrowRight, Check, Lock, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MarketingLayout } from '../components/MarketingLayout';
import { getDisplayPriceUsd, PRODUCT_CONFIG } from '../config/brand';

interface PricingPageProps {
  brandName?: string;
  regularPriceUsd?: number;
  activePromoPriceUsd?: number | null;
  activePromoLabel?: string | null;
  checkoutConnected: boolean;
  checkoutProviderName?: string;
  isAuthenticated: boolean;
  hasProEntitlement: boolean;
  userEmail?: string | null;
  userId?: string | null;
  getIdToken?: () => Promise<string | null>;
}

export function PricingPage({
  brandName,
  regularPriceUsd,
  activePromoPriceUsd,
  activePromoLabel,
  checkoutConnected,
  checkoutProviderName,
  isAuthenticated,
  hasProEntitlement,
  userEmail,
  userId,
  getIdToken,
}: PricingPageProps) {
  const activeBrand = brandName || PRODUCT_CONFIG.brandName;
  const pricing = getDisplayPriceUsd({ regularPriceUsd, activePromoPriceUsd });
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCheckout = async () => {
    setCheckoutError(null);
    if (!isAuthenticated) {
      navigate('/signup?next=/pricing');
      return;
    }
    if (!checkoutConnected) {
      setCheckoutError(
        'Checkout is not yet connected by the site owner. Your account and free workspace features remain available while payment credentials are configured.'
      );
      return;
    }

    setLoadingCheckout(true);
    try {
      const token = getIdToken ? await getIdToken() : null;
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId, email: userEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        setCheckoutError(data.error || 'Unable to start checkout session right now.');
      } else {
        window.location.assign(data.checkoutUrl);
      }
    } catch {
      setCheckoutError('Network error starting checkout. Please try again.');
    } finally {
      setLoadingCheckout(false);
    }
  };

  return (
    <MarketingLayout brandName={activeBrand} isAuthenticated={isAuthenticated}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-12">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-semibold text-[#5EE4A4]">Transparent one-time pricing</p>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#F8FAFC]">
            One price. No recurring subscription.
          </h1>
          <p className="text-base text-[#9CAFC6] leading-relaxed">
            Test the free calculator as long as you want. Upgrade once to save scenarios, compare
            bundles and offers side by side, run sensitivity stress tests, and export reports.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Free Quick Check */}
          <div className="rounded-xl border border-[#263449] bg-[#111C2E] p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-[#9CAFC6]">For initial checks</p>
                  <h2 className="text-xl font-bold text-[#F8FAFC] mt-1">Free Quick Check</h2>
                </div>
                <span className="text-3xl font-mono font-bold text-[#F8FAFC]">$0</span>
              </div>
              <p className="text-sm text-[#9CAFC6]">
                Public browser calculator with zero signup required. Ideal for checking a single
                discount before building a full campaign plan.
              </p>
              <ul className="space-y-2.5 text-sm text-[#9CAFC6] pt-2">
                {[
                  'Live unit-economics & % / $ / Free Shipping calculator',
                  'Baseline vs. single offer contribution comparison',
                  'Break-even order count & formula walkthrough',
                  'Local session only (does not save to cloud)',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#9CAFC6] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              to="/demo"
              className="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold rounded-lg border border-[#263449] text-[#F8FAFC] hover:border-[#3A4D6B] transition-colors"
            >
              Open free calculator
            </Link>
          </div>

          {/* Paid Pro */}
          <div className="rounded-xl border border-[#5EE4A4]/60 bg-[#111C2E] p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-[#5EE4A4]">
                    {pricing.hasActiveOffer && activePromoLabel
                      ? activePromoLabel
                      : 'For active e-commerce operators'}
                  </p>
                  <h2 className="text-xl font-bold text-[#F8FAFC] mt-1">{activeBrand} Pro</h2>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-2">
                    {pricing.hasActiveOffer && (
                      <span className="text-base font-mono text-[#9CAFC6] line-through">
                        ${pricing.regularPriceUsd}
                      </span>
                    )}
                    <span className="text-3xl font-mono font-extrabold text-[#F8FAFC]">
                      ${pricing.currentPriceUsd}
                    </span>
                  </div>
                  <p className="text-xs text-[#9CAFC6]">USD one-time</p>
                </div>
              </div>

              <p className="text-sm text-[#9CAFC6]">
                Full access to the V1 cloud decision workspace, saved store profiles, bundle
                modeling, Sensitivity Lab, and print/CSV reporting.
              </p>

              <ul className="space-y-2.5 text-sm text-[#F8FAFC] pt-2">
                {[
                  'Cloud-saved stores, cost profiles & unlimited scenarios',
                  'Side-by-side comparison of Baseline vs. up to 3 offers',
                  'Buy 2 Get 1 & multi-unit bundle margin modeling',
                  'Sensitivity Lab (demand ±20%, CAC shifts, 0–15% returns)',
                  'Full Offer Decision Brief & Discount Safety Threshold',
                  'Printable PDF report & downloadable CSV export',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-[#5EE4A4] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              {hasProEntitlement ? (
                <Link
                  to="/app/dashboard"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-lg bg-[#34D399] text-[#0B1220] hover:bg-[#2BC089] transition-colors"
                >
                  Pro Active — Open Workspace
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={loadingCheckout}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-lg bg-[#5EE4A4] text-[#0B1220] hover:bg-[#4AD493] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {!checkoutConnected && <Lock className="w-4 h-4" aria-hidden="true" />}
                  {loadingCheckout
                    ? 'Preparing checkout...'
                    : !isAuthenticated
                      ? `Create account to get Pro ($${pricing.currentPriceUsd})`
                      : checkoutConnected
                        ? `Get ${activeBrand} Pro — $${pricing.currentPriceUsd}`
                        : `Checkout not yet connected ($${pricing.currentPriceUsd} USD)`}
                </button>
              )}

              {!checkoutConnected && (
                <p className="text-xs text-[#FBBF24] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Payment provider ({checkoutProviderName || 'Lemon Squeezy'}) is awaiting owner
                    API/checkout configuration. No payment will be collected until connected.
                  </span>
                </p>
              )}

              {checkoutError && (
                <p role="alert" className="text-xs text-[#FB7185] bg-[#FB7185]/10 border border-[#FB7185]/30 rounded-lg p-3">
                  {checkoutError}
                </p>
              )}

              <p className="text-xs text-[#9CAFC6]">
                Access covers the current V1 web application with manual inputs.{' '}
                <Link to="/refund-policy" className="underline hover:text-[#F8FAFC]">
                  View refund policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
