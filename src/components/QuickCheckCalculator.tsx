import { AlertTriangle, CheckCircle2, Info, RotateCcw, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  calculateScenario,
  compareAgainstBaseline,
  EXAMPLE_BASELINE_INPUTS,
  formatPercent,
  formatUsd,
} from '../engine/calculator';
import { generateDecisionBrief } from '../engine/decisionEngine';
import { OfferType, PromotionInputs } from '../engine/types';
import { DecisionBriefView } from './DecisionBriefView';
import { WaterfallChart } from './WaterfallChart';

interface QuickCheckCalculatorProps {
  compact?: boolean;
  showDecisionBrief?: boolean;
  showFormulaBreakdown?: boolean;
}

interface QuickInputState {
  unitListPriceUsd: number;
  totalOrderCogsUsd: number;
  customerShippingRevenueUsd: number;
  merchantOutboundShippingUsd: number;
  packagingFulfillmentUsd: number;
  processingFeePercent: number;
  processingFeeFixedUsd: number;
  cacPerOrderUsd: number;
  refundProbabilityPercent: number;
  projectedOrderCount: number;
  offerType: OfferType;
  discountPercent: number;
  discountFixedUsd: number;
  minContributionPerOrderUsd: number;
}

const INITIAL_DEMO_STATE: QuickInputState = {
  unitListPriceUsd: EXAMPLE_BASELINE_INPUTS.unitListPriceUsd,
  totalOrderCogsUsd: EXAMPLE_BASELINE_INPUTS.totalOrderCogsUsd,
  customerShippingRevenueUsd: EXAMPLE_BASELINE_INPUTS.customerShippingRevenueUsd,
  merchantOutboundShippingUsd: EXAMPLE_BASELINE_INPUTS.merchantOutboundShippingUsd,
  packagingFulfillmentUsd: EXAMPLE_BASELINE_INPUTS.packagingFulfillmentUsd,
  processingFeePercent: EXAMPLE_BASELINE_INPUTS.processingFeePercent,
  processingFeeFixedUsd: EXAMPLE_BASELINE_INPUTS.processingFeeFixedUsd,
  cacPerOrderUsd: EXAMPLE_BASELINE_INPUTS.cacPerOrderUsd,
  refundProbabilityPercent: EXAMPLE_BASELINE_INPUTS.refundProbabilityPercent,
  projectedOrderCount: EXAMPLE_BASELINE_INPUTS.projectedOrderCount,
  offerType: 'percent_discount',
  discountPercent: 20,
  discountFixedUsd: 10,
  minContributionPerOrderUsd: EXAMPLE_BASELINE_INPUTS.minContributionPerOrderUsd,
};

function FieldTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center ml-1.5 align-middle">
      <button
        type="button"
        aria-label={text}
        className="text-[#9CAFC6] hover:text-[#5EE4A4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EE4A4] rounded"
      >
        <Info className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded-lg bg-[#0B1220] border border-[#263449] text-xs font-normal text-[#F8FAFC] shadow-lg z-20"
      >
        {text}
      </span>
    </span>
  );
}

export function QuickCheckCalculator({
  compact = false,
  showDecisionBrief = true,
  showFormulaBreakdown = false,
}: QuickCheckCalculatorProps) {
  const [state, setState] = useState<QuickInputState>(INITIAL_DEMO_STATE);
  const [hasEdited, setHasEdited] = useState(false);

  const updateNum = (field: keyof QuickInputState, raw: string) => {
    const parsed = raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(parsed)) return;
    setHasEdited(true);
    setState((prev) => ({ ...prev, [field]: Math.max(0, parsed) }));
  };

  const baselineInputs: PromotionInputs = useMemo(
    () => ({
      ...EXAMPLE_BASELINE_INPUTS,
      unitListPriceUsd: state.unitListPriceUsd,
      totalOrderCogsUsd: state.totalOrderCogsUsd,
      customerShippingRevenueUsd: state.customerShippingRevenueUsd,
      merchantOutboundShippingUsd: state.merchantOutboundShippingUsd,
      packagingFulfillmentUsd: state.packagingFulfillmentUsd,
      processingFeePercent: state.processingFeePercent,
      processingFeeFixedUsd: state.processingFeeFixedUsd,
      cacPerOrderUsd: state.cacPerOrderUsd,
      refundProbabilityPercent: state.refundProbabilityPercent,
      projectedOrderCount: Math.max(0, Math.round(state.projectedOrderCount)),
      minContributionPerOrderUsd: state.minContributionPerOrderUsd,
      offerType: 'baseline',
      discountPercent: 0,
      discountFixedUsd: 0,
    }),
    [state]
  );

  const offerInputs: PromotionInputs = useMemo(
    () => ({
      ...baselineInputs,
      offerType: state.offerType,
      discountPercent: state.discountPercent,
      discountFixedUsd: state.discountFixedUsd,
    }),
    [baselineInputs, state.offerType, state.discountPercent, state.discountFixedUsd]
  );

  const baselineCalc = useMemo(() => calculateScenario(baselineInputs), [baselineInputs]);
  const offerCalc = useMemo(() => calculateScenario(offerInputs), [offerInputs]);
  const comparison = useMemo(
    () => compareAgainstBaseline(baselineCalc, offerCalc),
    [baselineCalc, offerCalc]
  );
  const brief = useMemo(
    () => generateDecisionBrief(baselineInputs, offerInputs),
    [baselineInputs, offerInputs]
  );

  const offerLabel =
    state.offerType === 'percent_discount'
      ? `${state.discountPercent}% Off`
      : state.offerType === 'fixed_discount'
        ? `${formatUsd(state.discountFixedUsd)} Off`
        : 'Free Shipping';

  const statusBadge =
    offerCalc.cents.expectedContributionPerOrder <= 0
      ? {
          label: 'Negative Contribution',
          classes: 'text-[#FB7185] border-[#FB7185]/40 bg-[#FB7185]/10',
          Icon: ShieldAlert,
        }
      : !offerCalc.meetsMinContributionThreshold
        ? {
            label: 'Below Target Floor',
            classes: 'text-[#FBBF24] border-[#FBBF24]/40 bg-[#FBBF24]/10',
            Icon: AlertTriangle,
          }
        : {
            label: 'Positive & Above Floor',
            classes: 'text-[#34D399] border-[#34D399]/40 bg-[#34D399]/10',
            Icon: CheckCircle2,
          };

  const StatusIcon = statusBadge.Icon;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#263449] bg-[#111C2E] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#263449]">
          <div>
            <p className="text-xs font-medium text-[#5EE4A4]">
              {hasEdited ? 'Custom Live Inputs · Local Browser Session' : 'Example Data · Editable Live Demo'}
            </p>
            <h3 className="text-lg font-bold text-[#F8FAFC] mt-0.5">
              Quick Promotion Reality Check
            </h3>
          </div>

          <button
            type="button"
            onClick={() => {
              setState(INITIAL_DEMO_STATE);
              setHasEdited(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#263449] text-[#9CAFC6] hover:text-[#F8FAFC] hover:border-[#3A4D6B] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Reset example
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Inputs */}
          <div className="lg:col-span-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">
                  Selling price ($)
                  <FieldTip text="Unit list price before any promotion discount, excluding sales tax." />
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={state.unitListPriceUsd}
                  onChange={(e) => updateNum('unitListPriceUsd', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">
                  Product COGS ($)
                  <FieldTip text="Landed cost of goods sold for the items in the order." />
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={state.totalOrderCogsUsd}
                  onChange={(e) => updateNum('totalOrderCogsUsd', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">
                  Shipping charged ($)
                  <FieldTip text="Shipping fee paid by the customer at checkout. Drops to $0 under Free Shipping." />
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={state.customerShippingRevenueUsd}
                  onChange={(e) => updateNum('customerShippingRevenueUsd', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">
                  Outbound shipping ($)
                  <FieldTip text="Actual carrier label cost paid by your store—even when offering free shipping." />
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={state.merchantOutboundShippingUsd}
                  onChange={(e) => updateNum('merchantOutboundShippingUsd', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">
                  Packaging / 3PL ($)
                  <FieldTip text="Pick/pack, box, tape, inserts, or 3PL fulfillment fee per order." />
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={state.packagingFulfillmentUsd}
                  onChange={(e) => updateNum('packagingFulfillmentUsd', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">
                  Ad CAC / order ($)
                  <FieldTip text="Blended paid acquisition cost per order." />
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={state.cacPerOrderUsd}
                  onChange={(e) => updateNum('cacPerOrderUsd', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              {!compact && (
                <>
                  <label className="block">
                    <span className="text-xs font-medium text-[#9CAFC6]">
                      Processing fee (%)
                      <FieldTip text="Card/gateway percentage rate applied to customer amount charged." />
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={state.processingFeePercent}
                      onChange={(e) => updateNum('processingFeePercent', e.target.value)}
                      className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium text-[#9CAFC6]">
                      Return rate (%)
                      <FieldTip text="Estimated full-order refund probability." />
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={state.refundProbabilityPercent}
                      onChange={(e) => updateNum('refundProbabilityPercent', e.target.value)}
                      className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                    />
                  </label>
                </>
              )}
            </div>

            {/* Offer Selection */}
            <div className="pt-3 border-t border-[#263449] space-y-3">
              <span className="block text-xs font-semibold text-[#F8FAFC]">
                Promotion offer to test
              </span>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-[#0B1220] border border-[#263449]">
                {[
                  { id: 'percent_discount', label: '% Off' },
                  { id: 'fixed_discount', label: '$ Off' },
                  { id: 'free_shipping', label: 'Free Ship' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setHasEdited(true);
                      setState((prev) => ({ ...prev, offerType: tab.id as OfferType }));
                    }}
                    className={`py-2 px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      state.offerType === tab.id
                        ? 'bg-[#5EE4A4] text-[#0B1220]'
                        : 'text-[#9CAFC6] hover:text-[#F8FAFC]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {state.offerType === 'percent_discount' && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[#9CAFC6]">Discount percentage</span>
                    <span className="font-mono font-semibold text-[#5EE4A4] tabular-nums">
                      {state.discountPercent}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="1"
                    aria-label="Discount percentage"
                    value={state.discountPercent}
                    onChange={(e) => updateNum('discountPercent', e.target.value)}
                    className="w-full accent-[#5EE4A4] cursor-pointer"
                  />
                </div>
              )}

              {state.offerType === 'fixed_discount' && (
                <label className="block">
                  <span className="text-xs text-[#9CAFC6]">Fixed discount amount ($)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={state.discountFixedUsd}
                    onChange={(e) => updateNum('discountFixedUsd', e.target.value)}
                    className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                  />
                </label>
              )}

              {state.offerType === 'free_shipping' && (
                <p className="text-xs text-[#9CAFC6] bg-[#0B1220] border border-[#263449] rounded-lg px-3 py-2.5">
                  Customer shipping charge drops from{' '}
                  <span className="font-mono text-[#F8FAFC]">
                    {formatUsd(state.customerShippingRevenueUsd)}
                  </span>{' '}
                  to <span className="font-mono text-[#F8FAFC]">$0.00</span>, while your{' '}
                  <span className="font-mono text-[#F8FAFC]">
                    {formatUsd(state.merchantOutboundShippingUsd)}
                  </span>{' '}
                  carrier cost stays incurred.
                </p>
              )}
            </div>
          </div>

          {/* Right Live Comparison Results */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#9CAFC6]">
                  Baseline vs. {offerLabel}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${statusBadge.classes}`}
                >
                  <StatusIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  {statusBadge.label}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-lg bg-[#0B1220] border border-[#263449]">
                  <p className="text-xs text-[#9CAFC6]">Baseline Contribution</p>
                  <p className="mt-1.5 text-2xl font-mono font-bold tabular-nums text-[#F8FAFC]">
                    {formatUsd(baselineCalc.usd.expectedContributionPerOrder)}
                  </p>
                  <p className="mt-1 text-xs font-mono text-[#9CAFC6] tabular-nums">
                    {formatPercent(baselineCalc.contributionMarginPercent)} margin
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[#0B1220] border border-[#263449]">
                  <p className="text-xs text-[#9CAFC6]">{offerLabel} Contribution</p>
                  <p
                    className={`mt-1.5 text-2xl font-mono font-bold tabular-nums ${
                      offerCalc.usd.expectedContributionPerOrder <= 0
                        ? 'text-[#FB7185]'
                        : 'text-[#5EE4A4]'
                    }`}
                  >
                    {formatUsd(offerCalc.usd.expectedContributionPerOrder)}
                  </p>
                  <p className="mt-1 text-xs font-mono text-[#9CAFC6] tabular-nums">
                    {formatPercent(offerCalc.contributionMarginPercent)} margin
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[#0B1220] border border-[#263449]">
                  <p className="text-xs text-[#9CAFC6]">Profit / Order Impact</p>
                  <p
                    className={`mt-1.5 text-2xl font-mono font-bold tabular-nums ${
                      comparison.contributionDeltaPerOrderUsd < 0
                        ? 'text-[#FB7185]'
                        : 'text-[#34D399]'
                    }`}
                  >
                    {formatPercent(comparison.profitChangePercent, 1, true)}
                  </p>
                  <p className="mt-1 text-xs font-mono text-[#9CAFC6] tabular-nums">
                    {formatUsd(comparison.contributionDeltaPerOrderUsd, { showSign: true })}/order
                  </p>
                </div>
              </div>

              {/* Volume Break-Even Callout */}
              <div className="p-4 rounded-lg bg-[#0B1220] border border-[#263449] space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs text-[#9CAFC6]">
                  <span>
                    Baseline total ({state.projectedOrderCount} orders):{' '}
                    <strong className="font-mono text-[#F8FAFC]">
                      {formatUsd(baselineCalc.usd.projectedCampaignContribution)}
                    </strong>
                  </span>
                  <span>
                    Extra orders to break even:{' '}
                    <strong className="font-mono text-[#5EE4A4]">
                      {comparison.extraOrdersRequired === null
                        ? 'Impossible'
                        : `+${comparison.extraOrdersRequired.toLocaleString('en-US')}`}
                    </strong>
                  </span>
                </div>
                <p className="text-sm text-[#F8FAFC] leading-relaxed">
                  {comparison.recoveryExplanation}
                </p>
              </div>

              {offerCalc.validationIssues.length > 0 && (
                <div className="p-3 rounded-lg border border-[#FBBF24]/40 bg-[#FBBF24]/10 text-xs text-[#FBBF24] space-y-1">
                  {offerCalc.validationIssues.map((issue, idx) => (
                    <p key={idx}>{issue.message}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#263449] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-[#9CAFC6]">
                Guest calculator does not save to cloud. Pro unlocks multi-offer comparison, Buy 2 Get 1 bundles, Sensitivity Lab &amp; PDF/CSV reports.
              </p>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg border border-[#5EE4A4]/50 text-[#5EE4A4] hover:bg-[#5EE4A4]/10 transition-colors whitespace-nowrap shrink-0"
              >
                Explore Pro Workspace
              </Link>
            </div>
          </div>
        </div>
      </div>

      {!compact && (
        <WaterfallChart baseline={baselineCalc} offer={offerCalc} offerLabel={offerLabel} />
      )}

      {showDecisionBrief && (
        <DecisionBriefView brief={brief} scenarioTitle={offerLabel} compact={compact} />
      )}

      {showFormulaBreakdown && (
        <section className="rounded-xl border border-[#263449] bg-[#111C2E] p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#F8FAFC]">
              Transparent Formula Walkthrough (Exact Current Numbers)
            </h3>
            <p className="text-xs text-[#9CAFC6] mt-1">
              Every figure above is computed in integer cents before rounding for display—never hidden in black-box models.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[#263449] text-xs text-[#9CAFC6]">
                  <th className="py-2 pr-4 font-medium">Step &amp; Formula</th>
                  <th className="py-2 px-3 font-medium text-right">Baseline</th>
                  <th className="py-2 pl-3 font-medium text-right">{offerLabel}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#263449]/60 text-xs sm:text-sm">
                <tr>
                  <td className="py-2.5 pr-4 text-[#9CAFC6]">
                    1. Customer Charged = (Price − Discount) + Shipping Charged
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {formatUsd(baselineCalc.usd.customerAmountCharged)}
                  </td>
                  <td className="py-2.5 pl-3 text-right font-mono tabular-nums">
                    {formatUsd(offerCalc.usd.customerAmountCharged)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-[#9CAFC6]">
                    2. Expected Refunded Revenue = Refund% × (Product Charged + Ship × ShipRefund%)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    -{formatUsd(baselineCalc.usd.expectedRefundedRevenue)}
                  </td>
                  <td className="py-2.5 pl-3 text-right font-mono tabular-nums">
                    -{formatUsd(offerCalc.usd.expectedRefundedRevenue)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-[#9CAFC6]">
                    3. Processing Fees = (Charged × Rate%) + Fixed Fee
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    -{formatUsd(baselineCalc.usd.processingFee)}
                  </td>
                  <td className="py-2.5 pl-3 text-right font-mono tabular-nums">
                    -{formatUsd(offerCalc.usd.processingFee)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-[#9CAFC6]">
                    4. Fulfillment &amp; Ad Costs = COGS + Outbound Ship + Pack + CAC
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    -
                    {formatUsd(
                      baselineCalc.inputs.totalOrderCogsUsd +
                        baselineCalc.inputs.merchantOutboundShippingUsd +
                        baselineCalc.inputs.packagingFulfillmentUsd +
                        baselineCalc.inputs.cacPerOrderUsd
                    )}
                  </td>
                  <td className="py-2.5 pl-3 text-right font-mono tabular-nums">
                    -
                    {formatUsd(
                      offerCalc.inputs.totalOrderCogsUsd +
                        offerCalc.inputs.merchantOutboundShippingUsd +
                        offerCalc.inputs.packagingFulfillmentUsd +
                        offerCalc.inputs.cacPerOrderUsd
                    )}
                  </td>
                </tr>
                <tr className="font-semibold text-[#F8FAFC]">
                  <td className="py-3 pr-4">
                    5. Expected Contribution / Order (after Return Handling − Recovered Inv.)
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    {formatUsd(baselineCalc.usd.expectedContributionPerOrder)}
                  </td>
                  <td className="py-3 pl-3 text-right font-mono tabular-nums text-[#5EE4A4]">
                    {formatUsd(offerCalc.usd.expectedContributionPerOrder)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
