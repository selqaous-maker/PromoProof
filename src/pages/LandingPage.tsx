import { ArrowRight, Check, CheckCircle2, FileSpreadsheet, Layers, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../components/MarketingLayout';
import { QuickCheckCalculator } from '../components/QuickCheckCalculator';
import { getDisplayPriceUsd, PRODUCT_CONFIG } from '../config/brand';
import { calculateScenario, compareAgainstBaseline, EXAMPLE_BASELINE_INPUTS, formatUsd } from '../engine/calculator';
import { SAMPLE_WORKSPACE_SCENARIOS } from '../engine/presets';

interface LandingPageProps {
  brandName?: string;
  regularPriceUsd?: number;
  activePromoPriceUsd?: number | null;
  isAuthenticated?: boolean;
}

export function LandingPage({
  brandName,
  regularPriceUsd,
  activePromoPriceUsd,
  isAuthenticated,
}: LandingPageProps) {
  const activeBrand = brandName || PRODUCT_CONFIG.brandName;
  const pricing = getDisplayPriceUsd({ regularPriceUsd, activePromoPriceUsd });

  // Exact illustrative calculation for the 20% discount trap section (matches Acceptance Test 1)
  const trapBaseline = calculateScenario({
    ...EXAMPLE_BASELINE_INPUTS,
    unitListPriceUsd: 60,
    totalOrderCogsUsd: 25,
    customerShippingRevenueUsd: 0,
    merchantOutboundShippingUsd: 6,
    packagingFulfillmentUsd: 2,
    processingFeePercent: 0,
    processingFeeFixedUsd: 0,
    cacPerOrderUsd: 10,
    refundProbabilityPercent: 0,
    projectedOrderCount: 100,
    fixedCampaignCostUsd: 0,
  });
  const trap20Off = calculateScenario({
    ...trapBaseline.inputs,
    offerType: 'percent_discount',
    discountPercent: 20,
  });
  const trapComparison = compareAgainstBaseline(trapBaseline, trap20Off);

  // Sample Pro comparison preview data
  const sampleBaseCalc = calculateScenario(EXAMPLE_BASELINE_INPUTS);
  const sampleOfferCalcs = SAMPLE_WORKSPACE_SCENARIOS.map((s) => ({
    title: s.title,
    calc: calculateScenario(s.inputs),
  }));

  return (
    <MarketingLayout brandName={activeBrand} isAuthenticated={isAuthenticated}>
      {/* 1. Hero Section */}
      <section className="relative border-b border-[#263449] overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-radial from-[#5EE4A4]/10 via-transparent to-transparent"
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 sm:pt-20 sm:pb-20">
          <div className="max-w-3xl space-y-6">
            <p className="text-xs sm:text-sm font-semibold text-[#5EE4A4]">
              {PRODUCT_CONFIG.positioning}
            </p>
            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-[#F8FAFC] leading-[1.1]">
              Before you discount, know what you&rsquo;ll actually keep.
            </h1>
            <p className="text-base sm:text-lg text-[#9CAFC6] max-w-2xl leading-relaxed">
              Model percentage discounts, free shipping, Buy 2 Get 1 bundles, ad CAC, payment
              processing fees, and return costs before they quietly erase your order margin.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link
                to="/demo"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-lg bg-[#5EE4A4] text-[#0B1220] hover:bg-[#4AD493] transition-colors whitespace-nowrap"
              >
                Try the free calculator
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold rounded-lg border border-[#263449] bg-[#111C2E] text-[#F8FAFC] hover:border-[#3A4D6B] transition-colors whitespace-nowrap"
              >
                See how {activeBrand} works
              </a>
            </div>

            <p className="text-xs text-[#9CAFC6]">
              Works for Shopify, WooCommerce, Etsy, Amazon, or any store using manual inputs · No store login required
            </p>
          </div>
        </div>
      </section>

      {/* 2. Live Interactive Demonstration */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 border-b border-[#263449]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#F8FAFC]">
              Test an offer right now
            </h2>
            <p className="text-sm text-[#9CAFC6] mt-1">
              Edit any number below to see real-time margin and break-even volume math.
            </p>
          </div>
          <Link
            to="/demo"
            className="text-sm font-semibold text-[#5EE4A4] hover:underline whitespace-nowrap"
          >
            Open full calculator &amp; formula breakdown &rarr;
          </Link>
        </div>
        <QuickCheckCalculator compact showDecisionBrief={false} />
      </section>

      {/* 3. The 20% Discount Margin Erosion Problem */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 border-b border-[#263449]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-6 space-y-4">
            <p className="text-xs font-semibold text-[#FB7185]">
              Why discounts surprise founders
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] leading-tight">
              A 20% discount does not cut your profit by 20%. It can cut it by 70.6%.
            </h2>
            <p className="text-sm sm:text-base text-[#9CAFC6] leading-relaxed">
              Discounts come straight off the top line, while your product cost, shipping label,
              packaging, and paid ad CAC stay fixed in dollars. A modest storewide promo can turn a
              healthy SKU into a volume treadmill where you need 3.4&times; as many orders just to
              make the same total contribution.
            </p>
            <p className="text-xs text-[#9CAFC6]">
              Illustrative example assuming constant $10 CAC, $8 shipping/packaging, $25 COGS, and 0% returns.
            </p>
          </div>

          <div className="lg:col-span-6 rounded-xl border border-[#263449] bg-[#111C2E] p-6 space-y-5">
            <div className="flex items-center justify-between text-xs text-[#9CAFC6] pb-3 border-b border-[#263449]">
              <span>Example SKU ($60 Retail)</span>
              <span>Example Data</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-[#0B1220] border border-[#263449]">
                <p className="text-xs text-[#9CAFC6]">Full Price ($60)</p>
                <p className="mt-1 text-2xl font-mono font-bold tabular-nums text-[#F8FAFC]">
                  {formatUsd(trapBaseline.usd.expectedContributionPerOrder)}
                </p>
                <p className="mt-1 text-xs text-[#9CAFC6]">Contribution / order</p>
              </div>
              <div className="p-4 rounded-lg bg-[#0B1220] border border-[#FB7185]/40">
                <p className="text-xs text-[#FB7185]">20% Off ($48)</p>
                <p className="mt-1 text-2xl font-mono font-bold tabular-nums text-[#FB7185]">
                  {formatUsd(trap20Off.usd.expectedContributionPerOrder)}
                </p>
                <p className="mt-1 text-xs text-[#9CAFC6]">
                  -{Math.abs(trapComparison.profitChangePercent ?? 0).toFixed(1)}% profit drop
                </p>
              </div>
            </div>

            <div className="text-sm text-[#9CAFC6] leading-relaxed pt-2 border-t border-[#263449]">
              To earn the same{' '}
              <strong className="font-mono text-[#F8FAFC]">
                {formatUsd(trapBaseline.usd.projectedCampaignContribution)}
              </strong>{' '}
              that 100 full-price orders generate, 20% off requires{' '}
              <strong className="font-mono text-[#5EE4A4]">
                {trapComparison.ordersNeededToMatchBaseline} orders
              </strong>{' '}
              (+240% volume lift).
            </div>
          </div>
        </div>
      </section>

      {/* 4. Three-Step Method & What You Can Model */}
      <section
        id="how-it-works"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 border-b border-[#263449]"
      >
        <div className="max-w-2xl mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC]">
            Three steps before you hit send on your campaign
          </h2>
          <p className="text-sm sm:text-base text-[#9CAFC6] mt-2">
            Built to replace fragile spreadsheets with transparent unit economics and clear go/no-go guardrails.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          <div className="p-6 rounded-xl border border-[#263449] bg-[#111C2E] space-y-2.5">
            <span className="text-xs font-mono font-semibold text-[#5EE4A4]">01.</span>
            <h3 className="text-lg font-bold text-[#F8FAFC]">Enter unit economics</h3>
            <p className="text-sm text-[#9CAFC6] leading-relaxed">
              Set selling price, COGS, shipping collected vs. carrier cost, packaging, processing fees, paid CAC, and return assumptions.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-[#263449] bg-[#111C2E] space-y-2.5">
            <span className="text-xs font-mono font-semibold text-[#5EE4A4]">02.</span>
            <h3 className="text-lg font-bold text-[#F8FAFC]">Model offers &amp; bundles</h3>
            <p className="text-sm text-[#9CAFC6] leading-relaxed">
              Test percentage discounts, fixed dollar codes, free shipping subsidies, and Buy 2 Get 1 bundles side by side against your baseline.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-[#263449] bg-[#111C2E] space-y-2.5">
            <span className="text-xs font-mono font-semibold text-[#5EE4A4]">03.</span>
            <h3 className="text-lg font-bold text-[#F8FAFC]">Read Decision Brief &amp; export</h3>
            <p className="text-sm text-[#9CAFC6] leading-relaxed">
              See exact extra orders needed, stress-test CAC and refunds, verify your safety discount limit, and print a PDF or CSV brief.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#263449] bg-[#111C2E] p-6 sm:p-8">
          <h3 className="text-base font-bold text-[#F8FAFC] mb-4">
            What you can model accurately
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-[#9CAFC6]">
            {[
              'Percentage discounts (0–100%)',
              'Fixed dollar off codes (capped)',
              'Free shipping subsidies',
              'Buy 2 Get 1 & multi-unit bundles',
              'Ad CAC per paid order',
              'Gateway % + fixed fees',
              'Full-order refund & return handling',
              'Fixed creative / campaign costs',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#5EE4A4] shrink-0 mt-0.5" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Paid Workspace Preview (Real Computed Sample Data) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 border-b border-[#263449]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold text-[#5EE4A4]">
              Inside {activeBrand} Pro · Sample Data Preview
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] mt-1">
              Compare offers side-by-side before picking one
            </h2>
          </div>
          <Link
            to="/features"
            className="text-sm font-semibold text-[#5EE4A4] hover:underline whitespace-nowrap"
          >
            Inspect Decision Engine &amp; Sensitivity Lab &rarr;
          </Link>
        </div>

        <div className="rounded-xl border border-[#263449] bg-[#111C2E] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#263449] flex flex-wrap items-center justify-between gap-2 text-xs text-[#9CAFC6]">
            <span>Baseline ($60 SKU, $22 COGS, $6 customer shipping, $12 CAC, 4% returns)</span>
            <span className="font-mono text-[#FBBF24]">SAMPLE DATA</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[#263449] text-xs text-[#9CAFC6]">
                  <th className="py-3 px-5 font-medium">Scenario</th>
                  <th className="py-3 px-4 font-medium text-right">Charged</th>
                  <th className="py-3 px-4 font-medium text-right">Contribution / Order</th>
                  <th className="py-3 px-4 font-medium text-right">Margin %</th>
                  <th className="py-3 px-5 font-medium text-right">Extra Orders to Match Baseline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#263449]/60">
                <tr>
                  <td className="py-3.5 px-5 font-semibold text-[#F8FAFC]">
                    Baseline (No Promotion)
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#9CAFC6]">
                    {formatUsd(sampleBaseCalc.usd.customerAmountCharged)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#F8FAFC]">
                    {formatUsd(sampleBaseCalc.usd.expectedContributionPerOrder)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#9CAFC6]">
                    {sampleBaseCalc.contributionMarginPercent?.toFixed(1)}%
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono tabular-nums text-[#9CAFC6]">
                    0 (250 base)
                  </td>
                </tr>
                {sampleOfferCalcs.map(({ title, calc }) => {
                  const cmp = compareAgainstBaseline(sampleBaseCalc, calc);
                  return (
                    <tr key={title}>
                      <td className="py-3.5 px-5 font-medium text-[#F8FAFC]">{title}</td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#9CAFC6]">
                        {formatUsd(calc.usd.customerAmountCharged)}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-mono tabular-nums font-semibold ${
                          calc.usd.expectedContributionPerOrder <= 0
                            ? 'text-[#FB7185]'
                            : calc.meetsMinContributionThreshold
                              ? 'text-[#34D399]'
                              : 'text-[#FBBF24]'
                        }`}
                      >
                        {formatUsd(calc.usd.expectedContributionPerOrder)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#9CAFC6]">
                        {calc.contributionMarginPercent?.toFixed(1) ?? 'N/A'}%
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono tabular-nums text-[#F8FAFC]">
                        {cmp.extraOrdersRequired === null
                          ? 'Cannot recover'
                          : cmp.extraOrdersRequired === 0
                            ? '0 (beats baseline)'
                            : `+${cmp.extraOrdersRequired} (+${cmp.extraOrdersPercent?.toFixed(1)}%)`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pro Capabilities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="p-5 rounded-xl border border-[#263449] bg-[#111C2E] flex items-start gap-3.5">
            <Layers className="w-5 h-5 text-[#5EE4A4] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">Side-by-Side Comparison</h3>
              <p className="text-xs text-[#9CAFC6] mt-1 leading-relaxed">
                Save unlimited scenarios, clone offers, and compare up to 3 promotions against baseline simultaneously.
              </p>
            </div>
          </div>
          <div className="p-5 rounded-xl border border-[#263449] bg-[#111C2E] flex items-start gap-3.5">
            <SlidersHorizontal className="w-5 h-5 text-[#5EE4A4] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">Sensitivity Stress Lab</h3>
              <p className="text-xs text-[#9CAFC6] mt-1 leading-relaxed">
                Check what happens if volume swings ±20%, ad CAC rises +25%/+50%, or return rates hit 10–15%.
              </p>
            </div>
          </div>
          <div className="p-5 rounded-xl border border-[#263449] bg-[#111C2E] flex items-start gap-3.5">
            <FileSpreadsheet className="w-5 h-5 text-[#5EE4A4] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">PDF Brief &amp; CSV Export</h3>
              <p className="text-xs text-[#9CAFC6] mt-1 leading-relaxed">
                Generate clean, printable Decision Brief reports and export every input and formula output to CSV.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Who It's For / Not For + Transparent Pricing */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 border-b border-[#263449]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 space-y-6">
            <div className="p-6 rounded-xl border border-[#263449] bg-[#111C2E] space-y-3">
              <h3 className="text-base font-bold text-[#F8FAFC]">Who {activeBrand} is built for</h3>
              <ul className="space-y-2 text-sm text-[#9CAFC6]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Independent DTC &amp; e-commerce founders (50–5,000 orders/month)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Operators planning BFCM, seasonal, email, or bundle promotions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Teams wanting clear arithmetic instead of guesswork spreadsheets</span>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-xl border border-[#263449] bg-[#111C2E] space-y-3">
              <h3 className="text-base font-bold text-[#F8FAFC]">What {activeBrand} is not</h3>
              <ul className="space-y-2 text-sm text-[#9CAFC6]">
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-[#FB7185] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Not accounting software, tax/VAT advice, or GAAP profit reporting</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-[#FB7185] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Not a live Shopify store sync in V1 (all inputs are manually entered)</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-[#FB7185] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Never guarantees that a discount will increase order demand</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Transparent One-Time Price Card */}
          <div className="lg:col-span-6 rounded-xl border border-[#5EE4A4]/50 bg-[#111C2E] p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#5EE4A4]">One-time purchase</p>
                <h2 className="text-2xl font-bold text-[#F8FAFC] mt-1">{activeBrand} Pro</h2>
              </div>
              <div className="text-right">
                <div className="flex items-baseline justify-end gap-2">
                  {pricing.hasActiveOffer && (
                    <span className="text-base font-mono text-[#9CAFC6] line-through">
                      ${pricing.regularPriceUsd}
                    </span>
                  )}
                  <span className="text-4xl font-mono font-extrabold text-[#F8FAFC]">
                    ${pricing.currentPriceUsd}
                  </span>
                </div>
                <p className="text-xs text-[#9CAFC6] mt-0.5">USD · No recurring subscription</p>
              </div>
            </div>

            <p className="text-sm text-[#9CAFC6] leading-relaxed">
              Pay once for full access to the V1 cloud workspace, saved scenarios, Buy 2 Get 1 bundle
              modeling, Sensitivity Lab, Decision Briefs, printable PDF reports, and CSV exports.
            </p>

            <ul className="space-y-2.5 text-sm text-[#F8FAFC]">
              {[
                'Saved store cost profiles & unlimited promotion scenarios',
                'Compare baseline against up to 3 offers side-by-side',
                'Buy 2 Get 1 & multi-unit bundle unit economics',
                'Sensitivity Lab (-20%/+20% volume, CAC shifts, refund stress)',
                'Personalized Decision Brief & Max Safe Discount threshold',
                'Printable PDF-style reports & downloadable CSV exports',
              ].map((feat) => (
                <li key={feat} className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#5EE4A4] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                to="/pricing"
                className="flex-1 inline-flex items-center justify-center px-5 py-3 text-sm font-semibold rounded-lg bg-[#5EE4A4] text-[#0B1220] hover:bg-[#4AD493] transition-colors"
              >
                Get {activeBrand} Pro — ${pricing.currentPriceUsd}
              </Link>
              <Link
                to="/demo"
                className="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold rounded-lg border border-[#263449] text-[#F8FAFC] hover:border-[#3A4D6B] transition-colors"
              >
                Try free calculator
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Concise FAQ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-[#F8FAFC] mb-8 text-center">
          Frequently asked questions
        </h2>
        <div className="space-y-4">
          {[
            {
              q: 'Do I need a Shopify store to use this?',
              a: 'No. All calculations work with manual entry, so you can model products sold on Shopify, WooCommerce, Etsy, Amazon, or custom checkouts. No store API connection is required or implied in V1.',
            },
            {
              q: 'How accurate are the estimates?',
              a: 'Every calculation uses exact integer-cents arithmetic based strictly on your inputs. Output accuracy depends on how accurately you enter COGS, shipping, processing fees, CAC, and refund rates.',
            },
            {
              q: 'Is this accounting or tax advice?',
              a: 'No. This tool estimates per-order contribution economics excluding sales tax/VAT, fixed business overhead, and accounting timing.',
            },
            {
              q: 'Is this a monthly subscription?',
              a: `No. ${activeBrand} Pro is a $${pricing.currentPriceUsd} one-time purchase for access to the V1 web workspace.`,
            },
          ].map((item) => (
            <div
              key={item.q}
              className="p-5 rounded-xl border border-[#263449] bg-[#111C2E] space-y-1.5"
            >
              <h3 className="text-sm font-bold text-[#F8FAFC]">{item.q}</h3>
              <p className="text-sm text-[#9CAFC6] leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link to="/faq" className="text-sm font-semibold text-[#5EE4A4] hover:underline">
            Read all FAQs &amp; model limitations &rarr;
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
