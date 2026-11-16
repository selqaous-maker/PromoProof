import { Link } from 'react-router-dom';
import { MarketingLayout } from '../components/MarketingLayout';
import { getDisplayPriceUsd, PRODUCT_CONFIG } from '../config/brand';

interface FaqPageProps {
  brandName?: string;
  regularPriceUsd?: number;
  activePromoPriceUsd?: number | null;
  isAuthenticated?: boolean;
}

export function FaqPage({
  brandName,
  regularPriceUsd,
  activePromoPriceUsd,
  isAuthenticated,
}: FaqPageProps) {
  const activeBrand = brandName || PRODUCT_CONFIG.brandName;
  const pricing = getDisplayPriceUsd({ regularPriceUsd, activePromoPriceUsd });

  const items = [
    {
      q: 'Is Shopify required to use this product?',
      a: 'No. Every calculation uses manual inputs so it works equally well for Shopify, WooCommerce, Etsy, Amazon, or custom stores. No store API integration is required or claimed in V1.',
    },
    {
      q: 'How accurate are the financial estimates?',
      a: 'All formulas use integer-cents arithmetic to avoid floating-point rounding drift. However, outputs are only as accurate as the unit costs, ad CAC, processing rates, and refund probabilities you enter.',
    },
    {
      q: 'What does "Contribution per Order" include and exclude?',
      a: 'Contribution per order reflects expected customer revenue minus expected refunds, order COGS (including gift/bonus bundle items), outbound shipping, packaging, payment processing fees, per-order CAC, and expected return handling plus recovered inventory. It excludes sales tax/VAT, fixed business overhead, and chargeback fees.',
    },
    {
      q: 'How are returns modeled in V1?',
      a: 'V1 uses a transparent full-order return probability model: each placed order has a user-specified probability of a full refund, incurring return shipping/handling and optional recoverable inventory value (default $0 unless you set a value). Payment processing fees are modeled as nonrefundable by default.',
    },
    {
      q: 'Is this tax, financial, or accounting advice?',
      a: 'No. It is a pre-launch unit-economics decision calculator. Consult your CPA or bookkeeper for tax compliance and GAAP financial statements.',
    },
    {
      q: 'Can I export my scenarios and Decision Briefs?',
      a: 'Yes. Paid Pro accounts can print clean, formatted PDF-style Offer Decision Brief reports directly from the browser and download structured CSV spreadsheets containing all inputs, assumptions, and results.',
    },
    {
      q: 'Can I cancel? How do refunds work?',
      a: `${activeBrand} Pro is a one-time $${pricing.currentPriceUsd} USD purchase rather than a recurring monthly subscription, so there is nothing to cancel. See our Refund Policy page for exact eligibility terms once finalized by the business owner.`,
    },
  ];

  return (
    <MarketingLayout brandName={activeBrand} isAuthenticated={isAuthenticated}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-10">
        <div className="space-y-3 pb-6 border-b border-[#263449]">
          <p className="text-xs font-semibold text-[#5EE4A4]">Methodology &amp; FAQ</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F8FAFC]">
            Answers, scope, and model assumptions
          </h1>
          <p className="text-sm sm:text-base text-[#9CAFC6]">
            Clear details on how calculations work and what V1 covers.
          </p>
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <article
              key={item.q}
              className="p-6 rounded-xl border border-[#263449] bg-[#111C2E] space-y-2"
            >
              <h2 className="text-base font-bold text-[#F8FAFC]">{item.q}</h2>
              <p className="text-sm text-[#9CAFC6] leading-relaxed">{item.a}</p>
            </article>
          ))}
        </div>

        <div className="pt-4 flex flex-wrap items-center gap-4">
          <Link
            to="/demo"
            className="px-5 py-3 text-sm font-semibold rounded-lg bg-[#5EE4A4] text-[#0B1220] hover:bg-[#4AD493] transition-colors"
          >
            Try the free calculator
          </Link>
          <Link
            to="/refund-policy"
            className="text-sm font-medium text-[#9CAFC6] hover:text-[#F8FAFC]"
          >
            Read refund policy &rarr;
          </Link>
        </div>
      </div>
    </MarketingLayout>
  );
}
