import { Table } from 'lucide-react';
import { useState } from 'react';
import { formatPercent, formatUsd } from '../engine/calculator';
import { ScenarioCalculation } from '../engine/types';

interface WaterfallChartProps {
  baseline: ScenarioCalculation;
  offer: ScenarioCalculation;
  offerLabel: string;
}

interface BarRow {
  label: string;
  baselineUsd: number;
  offerUsd: number;
  kind: 'revenue' | 'cost' | 'result';
}

export function WaterfallChart({ baseline, offer, offerLabel }: WaterfallChartProps) {
  const [showTable, setShowTable] = useState(false);

  const rows: BarRow[] = [
    {
      label: 'Customer Charged',
      baselineUsd: baseline.usd.customerAmountCharged,
      offerUsd: offer.usd.customerAmountCharged,
      kind: 'revenue',
    },
    {
      label: 'Expected Refunds',
      baselineUsd: baseline.usd.expectedRefundedRevenue,
      offerUsd: offer.usd.expectedRefundedRevenue,
      kind: 'cost',
    },
    {
      label: 'Order COGS',
      baselineUsd: baseline.inputs.totalOrderCogsUsd,
      offerUsd: offer.inputs.totalOrderCogsUsd,
      kind: 'cost',
    },
    {
      label: 'Shipping & Pack',
      baselineUsd:
        baseline.inputs.merchantOutboundShippingUsd + baseline.inputs.packagingFulfillmentUsd,
      offerUsd: offer.inputs.merchantOutboundShippingUsd + offer.inputs.packagingFulfillmentUsd,
      kind: 'cost',
    },
    {
      label: 'Processor Fees',
      baselineUsd: baseline.usd.processingFee,
      offerUsd: offer.usd.processingFee,
      kind: 'cost',
    },
    {
      label: 'Ad CAC / Order',
      baselineUsd: baseline.inputs.cacPerOrderUsd,
      offerUsd: offer.inputs.cacPerOrderUsd,
      kind: 'cost',
    },
    {
      label: 'Return Cost (Net)',
      baselineUsd: Math.max(
        0,
        baseline.usd.expectedReturnHandling - baseline.usd.expectedRecoveredInventory
      ),
      offerUsd: Math.max(
        0,
        offer.usd.expectedReturnHandling - offer.usd.expectedRecoveredInventory
      ),
      kind: 'cost',
    },
    {
      label: 'Contribution / Order',
      baselineUsd: baseline.usd.expectedContributionPerOrder,
      offerUsd: offer.usd.expectedContributionPerOrder,
      kind: 'result',
    },
  ];

  const maxAbs = Math.max(
    10,
    ...rows.flatMap((r) => [Math.abs(r.baselineUsd), Math.abs(r.offerUsd)])
  );

  return (
    <div className="rounded-xl border border-[#263449] bg-[#111C2E] p-5 sm:p-6 print-surface print-break-avoid">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#263449]">
        <div>
          <h3 className="text-base font-semibold text-[#F8FAFC]">
            Per-Order Economics Breakdown
          </h3>
          <p className="text-xs text-[#9CAFC6] mt-0.5 print-muted">
            Baseline vs. {offerLabel} (USD per placed order)
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs text-[#9CAFC6]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#9CAFC6]" aria-hidden="true" />
              Baseline
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#5EE4A4]" aria-hidden="true" />
              {offerLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowTable((prev) => !prev)}
            className="no-print inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-[#263449] text-[#9CAFC6] hover:text-[#F8FAFC] hover:border-[#3A4D6B] transition-colors"
          >
            <Table className="w-3.5 h-3.5" aria-hidden="true" />
            {showTable ? 'Chart view' : 'Data table'}
          </button>
        </div>
      </div>

      {showTable ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#263449] text-xs text-[#9CAFC6]">
                <th className="py-2 pr-4 font-medium">Component</th>
                <th className="py-2 px-3 font-medium text-right">Baseline</th>
                <th className="py-2 pl-3 font-medium text-right">{offerLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#263449]/60 font-mono tabular-nums">
              {rows.map((row) => (
                <tr key={row.label} className={row.kind === 'result' ? 'font-semibold' : ''}>
                  <td className="py-2.5 pr-4 font-sans text-[#F8FAFC]">{row.label}</td>
                  <td className="py-2.5 px-3 text-right text-[#9CAFC6]">
                    {formatUsd(row.baselineUsd)}
                  </td>
                  <td
                    className={`py-2.5 pl-3 text-right ${
                      row.kind === 'result'
                        ? row.offerUsd > 0
                          ? 'text-[#34D399]'
                          : 'text-[#FB7185]'
                        : 'text-[#F8FAFC]'
                    }`}
                  >
                    {formatUsd(row.offerUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="mt-5 space-y-3.5"
          role="img"
          aria-label={`Unit economics comparison chart comparing baseline ${formatUsd(
            baseline.usd.expectedContributionPerOrder
          )} contribution against ${offerLabel} ${formatUsd(
            offer.usd.expectedContributionPerOrder
          )} contribution per order.`}
        >
          {rows.map((row) => {
            const baseWidth = Math.min(100, (Math.abs(row.baselineUsd) / maxAbs) * 100);
            const offerWidth = Math.min(100, (Math.abs(row.offerUsd) / maxAbs) * 100);
            const offerBarColor =
              row.kind === 'result'
                ? row.offerUsd <= 0
                  ? 'bg-[#FB7185]'
                  : row.offerUsd < row.baselineUsd * 0.7
                    ? 'bg-[#FBBF24]'
                    : 'bg-[#34D399]'
                : 'bg-[#5EE4A4]';

            return (
              <div
                key={row.label}
                className={`space-y-1.5 ${
                  row.kind === 'result' ? 'pt-3 border-t border-[#263449]' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span
                    className={
                      row.kind === 'result'
                        ? 'font-semibold text-[#F8FAFC]'
                        : 'text-[#9CAFC6]'
                    }
                  >
                    {row.label}
                  </span>
                  <div className="flex items-center gap-4 font-mono tabular-nums">
                    <span className="text-[#9CAFC6]">{formatUsd(row.baselineUsd)}</span>
                    <span
                      className={`font-medium ${
                        row.kind === 'result'
                          ? row.offerUsd <= 0
                            ? 'text-[#FB7185]'
                            : 'text-[#34D399]'
                          : 'text-[#F8FAFC]'
                      }`}
                    >
                      {formatUsd(row.offerUsd)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div
                    className="h-2 w-full rounded bg-[#0B1220] overflow-hidden"
                    title={`Baseline ${row.label}: ${formatUsd(row.baselineUsd)}`}
                  >
                    <div
                      className="h-full rounded bg-[#9CAFC6]/70 transition-all duration-200"
                      style={{ width: `${Math.max(baseWidth, row.baselineUsd !== 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <div
                    className="h-2 w-full rounded bg-[#0B1220] overflow-hidden"
                    title={`${offerLabel} ${row.label}: ${formatUsd(row.offerUsd)}`}
                  >
                    <div
                      className={`h-full rounded ${offerBarColor} transition-all duration-200`}
                      style={{ width: `${Math.max(offerWidth, row.offerUsd !== 0 ? 2 : 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#9CAFC6]">
            <span>
              Baseline margin: <strong className="font-mono text-[#F8FAFC]">{formatPercent(baseline.contributionMarginPercent)}</strong>
            </span>
            <span>
              Offer margin: <strong className="font-mono text-[#F8FAFC]">{formatPercent(offer.contributionMarginPercent)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
