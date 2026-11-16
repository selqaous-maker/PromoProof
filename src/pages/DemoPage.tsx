import { Link } from 'react-router-dom';
import { MarketingLayout } from '../components/MarketingLayout';
import { QuickCheckCalculator } from '../components/QuickCheckCalculator';
import { PRODUCT_CONFIG } from '../config/brand';

interface DemoPageProps {
  brandName?: string;
  isAuthenticated?: boolean;
}

export function DemoPage({ brandName, isAuthenticated }: DemoPageProps) {
  const activeBrand = brandName || PRODUCT_CONFIG.brandName;

  return (
    <MarketingLayout brandName={activeBrand} isAuthenticated={isAuthenticated}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#263449]">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold text-[#5EE4A4]">
              Free Public Quick Check · No Account Required
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F8FAFC]">
              Promotion Margin &amp; Break-Even Calculator
            </h1>
            <p className="text-sm sm:text-base text-[#9CAFC6]">
              Enter your real unit economics below to compare baseline contribution against a
              percentage discount, dollar discount, or free shipping offer.
            </p>
          </div>
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#5EE4A4] text-[#0B1220] hover:bg-[#4AD493] transition-colors whitespace-nowrap shrink-0"
          >
            Unlock Multi-Offer Pro
          </Link>
        </div>

        <QuickCheckCalculator compact={false} showDecisionBrief showFormulaBreakdown />
      </div>
    </MarketingLayout>
  );
}
