import { AlertTriangle, CheckCircle2, Compass, ShieldAlert, TrendingUp } from 'lucide-react';
import { formatPercent, formatUsd } from '../engine/calculator';
import { DecisionBrief } from '../engine/types';

interface DecisionBriefViewProps {
  brief: DecisionBrief;
  scenarioTitle?: string;
  compact?: boolean;
}

export function DecisionBriefView({
  brief,
  scenarioTitle,
  compact = false,
}: DecisionBriefViewProps) {
  const statusStyles = {
    healthy: {
      border: 'border-[#34D399]/40',
      bg: 'bg-[#34D399]/10',
      text: 'text-[#34D399]',
      label: 'Within Margin Guardrails',
      Icon: CheckCircle2,
    },
    caution: {
      border: 'border-[#FBBF24]/40',
      bg: 'bg-[#FBBF24]/10',
      text: 'text-[#FBBF24]',
      label: 'Margin / Volume Caution',
      Icon: AlertTriangle,
    },
    critical: {
      border: 'border-[#FB7185]/40',
      bg: 'bg-[#FB7185]/10',
      text: 'text-[#FB7185]',
      label: 'Negative Economics — Do Not Launch',
      Icon: ShieldAlert,
    },
  }[brief.status];

  const StatusIcon = statusStyles.Icon;

  return (
    <section
      aria-label="Offer Decision Brief"
      className="rounded-xl border border-[#263449] bg-[#111C2E] p-5 sm:p-6 space-y-6 print-surface print-break-avoid"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-[#263449]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-[#9CAFC6] print-muted">
            <span>Offer Decision Brief</span>
            {scenarioTitle && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#F8FAFC] font-medium">{scenarioTitle}</span>
              </>
            )}
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-[#F8FAFC] leading-snug">
            {brief.headline}
          </h3>
        </div>

        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${statusStyles.border} ${statusStyles.bg} ${statusStyles.text} text-xs font-semibold whitespace-nowrap shrink-0`}
        >
          <StatusIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{statusStyles.label}</span>
        </div>
      </div>

      {/* Key Mathematical Conclusions Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg bg-[#0B1220] border border-[#263449] print-surface">
          <p className="text-xs text-[#9CAFC6] print-muted">Contribution / Order</p>
          <p
            className={`mt-1 text-lg font-mono font-semibold tabular-nums ${
              brief.financialSummary.estimatedContributionPerOrderUsd <= 0
                ? 'text-[#FB7185]'
                : 'text-[#34D399]'
            }`}
          >
            {formatUsd(brief.financialSummary.estimatedContributionPerOrderUsd)}
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0B1220] border border-[#263449] print-surface">
          <p className="text-xs text-[#9CAFC6] print-muted">Margin Sacrificed</p>
          <p className="mt-1 text-lg font-mono font-semibold tabular-nums text-[#F8FAFC]">
            {brief.financialSummary.marginSacrificedPoints === null
              ? 'N/A'
              : `${brief.financialSummary.marginSacrificedPoints >= 0 ? '-' : '+'}${Math.abs(
                  brief.financialSummary.marginSacrificedPoints
                ).toFixed(1)} pts`}
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0B1220] border border-[#263449] print-surface">
          <p className="text-xs text-[#9CAFC6] print-muted">Extra Orders Needed</p>
          <p className="mt-1 text-lg font-mono font-semibold tabular-nums text-[#F8FAFC]">
            {brief.financialSummary.additionalOrdersRequired === null
              ? 'Cannot Recover'
              : `+${brief.financialSummary.additionalOrdersRequired.toLocaleString('en-US')}`}
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0B1220] border border-[#263449] print-surface">
          <p className="text-xs text-[#9CAFC6] print-muted">Max Safe Discount</p>
          <p className="mt-1 text-lg font-mono font-semibold tabular-nums text-[#5EE4A4]">
            {formatPercent(brief.thresholdAssessment.maxSafeDiscountPercent, 1)}
          </p>
        </div>
      </div>

      {/* Explanatory Sections */}
      <div className={`grid grid-cols-1 ${compact ? '' : 'lg:grid-cols-2'} gap-6`}>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-[#F8FAFC] mb-2">
              01. What changed financially
            </h4>
            <ul className="space-y-1.5 text-sm text-[#9CAFC6] leading-relaxed print-muted">
              {brief.whatChanged.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#5EE4A4] mt-1" aria-hidden="true">
                    •
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#F8FAFC] mb-2">
              02. Threshold &amp; break-even verdict
            </h4>
            <p className="text-sm text-[#9CAFC6] leading-relaxed print-muted">
              {brief.thresholdAssessment.summary}
            </p>
          </div>

          {!compact && (
            <div>
              <h4 className="text-sm font-semibold text-[#F8FAFC] mb-2">
                03. Assumptions behind this math
              </h4>
              <ul className="space-y-1.5 text-xs text-[#9CAFC6] leading-relaxed print-muted">
                {brief.assumptionsUsed.map((assumption, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#9CAFC6]" aria-hidden="true">
                      –
                    </span>
                    <span>{assumption}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-[#F8FAFC] mb-2">
              {compact ? '03.' : '04.'} Risks to verify before launch
            </h4>
            <ul className="space-y-2 text-sm text-[#9CAFC6] leading-relaxed print-muted">
              {brief.riskFactors.map((risk, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <AlertTriangle
                    className="w-4 h-4 text-[#FBBF24] shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-[#0B1220] border border-[#263449] space-y-2 print-surface">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#5EE4A4]">
              <TrendingUp className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Alternative Strategy Worth Testing</span>
            </div>
            <p className="text-sm font-semibold text-[#F8FAFC]">
              {brief.alternativeStrategy.title}
            </p>
            <p className="text-xs text-[#9CAFC6] leading-relaxed print-muted">
              {brief.alternativeStrategy.rationale}
            </p>
          </div>

          {!compact && (
            <div className="flex items-start gap-2.5 text-xs text-[#9CAFC6] print-muted">
              <Compass className="w-4 h-4 text-[#5EE4A4] shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <strong className="text-[#F8FAFC]">Suggested next check: </strong>
                {brief.nextCheck}
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="pt-4 border-t border-[#263449] text-xs text-[#9CAFC6] print-muted">
        {brief.methodologyNote}
      </p>
    </section>
  );
}
