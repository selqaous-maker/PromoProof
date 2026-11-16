import { AlertTriangle, ArrowRight, FileText, Lock, PlusCircle, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { DecisionBriefView } from '../components/DecisionBriefView';
import { WaterfallChart } from '../components/WaterfallChart';
import { useAuth } from '../context/AuthContext';
import {
  calculateScenario,
  compareAgainstBaseline,
  formatPercent,
  formatUsd,
} from '../engine/calculator';
import { generateDecisionBrief } from '../engine/decisionEngine';

export function DashboardPage() {
  const {
    stores,
    costProfiles,
    scenarios,
    canAccessProFeatures,
    workspaceLoading,
    workspaceError,
  } = useAuth();

  const activeStore = stores[0];
  const activeProfile = costProfiles[0];

  const baselineScenario = useMemo(
    () => scenarios.find((s) => s.offerType === 'baseline') || null,
    [scenarios]
  );

  const baselineInputs = baselineScenario?.inputSnapshot || activeProfile?.inputs || null;
  const offerScenarios = useMemo(
    () => scenarios.filter((s) => s.id !== baselineScenario?.id),
    [scenarios, baselineScenario?.id]
  );

  const baselineCalc = useMemo(
    () => (baselineInputs ? calculateScenario(baselineInputs) : null),
    [baselineInputs]
  );

  const comparedList = useMemo(() => {
    if (!baselineCalc) return [];
    return offerScenarios.map((scen) => {
      const calc = calculateScenario(scen.inputSnapshot);
      const cmp = compareAgainstBaseline(baselineCalc, calc);
      return { scen, calc, cmp };
    });
  }, [baselineCalc, offerScenarios]);

  const highestUnderAssumptions = useMemo(() => {
    if (comparedList.length === 0) return null;
    return comparedList.reduce((best, curr) =>
      curr.calc.usd.projectedCampaignContribution > best.calc.usd.projectedCampaignContribution
        ? curr
        : best
    );
  }, [comparedList]);

  const featuredOffer = comparedList[0] || null;
  const featuredBrief = useMemo(() => {
    if (!baselineInputs || !featuredOffer) return null;
    return generateDecisionBrief(baselineInputs, featuredOffer.scen.inputSnapshot);
  }, [baselineInputs, featuredOffer]);

  if (workspaceLoading) {
    return (
      <AppShell title="Workspace Dashboard">
        <div className="space-y-4">
          <div className="h-28 rounded-xl bg-[#111C2E] border border-[#263449] animate-pulse" />
          <div className="h-64 rounded-xl bg-[#111C2E] border border-[#263449] animate-pulse" />
        </div>
      </AppShell>
    );
  }

  // Intentional Empty State when user hasn't completed onboarding
  if (!activeStore || !baselineInputs || !baselineCalc) {
    return (
      <AppShell title="Workspace Dashboard" subtitle="Complete store setup to model your promotions">
        <div className="rounded-xl border border-[#263449] bg-[#111C2E] p-8 sm:p-10 max-w-2xl space-y-5">
          <p className="text-xs font-semibold text-[#5EE4A4]">Getting Started</p>
          <h2 className="text-2xl font-bold text-[#F8FAFC]">
            No store unit economics saved yet
          </h2>
          <p className="text-sm text-[#9CAFC6] leading-relaxed">
            Set up your product selling price, COGS, shipping, payment fees, ad CAC, and return rate
            so every scenario compares against a real baseline—or load labeled Sample Store Data to
            explore the workspace first.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/app/onboarding"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-sm font-semibold hover:bg-[#4AD493]"
            >
              Start 3-minute onboarding
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              to="/demo"
              className="px-5 py-3 rounded-lg border border-[#263449] text-sm font-semibold text-[#F8FAFC] hover:bg-[#0B1220]"
            >
              Try public calculator
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={activeStore.name}
      subtitle="Baseline contribution overview & saved promotion comparison"
      actions={
        <Link
          to="/app/scenarios/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-xs font-semibold hover:bg-[#4AD493] whitespace-nowrap"
        >
          <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
          New offer
        </Link>
      }
    >
      <div className="space-y-6">
        {workspaceError && (
          <div role="alert" className="p-4 rounded-xl border border-[#FB7185]/40 bg-[#FB7185]/10 text-sm text-[#FB7185]">
            {workspaceError}
          </div>
        )}

        {baselineScenario?.isSample && (
          <div className="p-4 rounded-xl border border-[#FBBF24]/40 bg-[#FBBF24]/10 flex flex-wrap items-center justify-between gap-3 text-xs text-[#FBBF24]">
            <span>
              <strong>Sample Data Active:</strong> You are currently viewing labeled demonstration
              scenarios. Replace these with your own numbers anytime in Onboarding.
            </span>
            <Link to="/app/onboarding" className="font-semibold underline whitespace-nowrap">
              Enter my store numbers &rarr;
            </Link>
          </div>
        )}

        {/* Top KPI Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl border border-[#263449] bg-[#111C2E]">
            <p className="text-xs text-[#9CAFC6]">Baseline Contribution / Order</p>
            <p className="mt-1.5 text-2xl font-mono font-bold tabular-nums text-[#F8FAFC]">
              {formatUsd(baselineCalc.usd.expectedContributionPerOrder)}
            </p>
            <p className="mt-1 text-xs font-mono text-[#9CAFC6] tabular-nums">
              {formatPercent(baselineCalc.contributionMarginPercent)} margin
            </p>
          </div>

          <div className="p-5 rounded-xl border border-[#263449] bg-[#111C2E]">
            <p className="text-xs text-[#9CAFC6]">Baseline Campaign Total</p>
            <p className="mt-1.5 text-2xl font-mono font-bold tabular-nums text-[#F8FAFC]">
              {formatUsd(baselineCalc.usd.projectedCampaignContribution)}
            </p>
            <p className="mt-1 text-xs font-mono text-[#9CAFC6] tabular-nums">
              At {baselineInputs.projectedOrderCount.toLocaleString('en-US')} orders
            </p>
          </div>

          <div className="p-5 rounded-xl border border-[#263449] bg-[#111C2E]">
            <p className="text-xs text-[#9CAFC6]">Saved Promotion Offers</p>
            <p className="mt-1.5 text-2xl font-mono font-bold tabular-nums text-[#F8FAFC]">
              {offerScenarios.length}
            </p>
            <p className="mt-1 text-xs text-[#9CAFC6]">
              {offerScenarios.length === 0 ? 'Create your first offer' : 'Ready to compare'}
            </p>
          </div>

          <div className="p-5 rounded-xl border border-[#263449] bg-[#111C2E]">
            <p className="text-xs text-[#9CAFC6]">Highest Projected (Under Assumptions)</p>
            <p className="mt-1.5 text-lg font-bold text-[#5EE4A4] truncate">
              {highestUnderAssumptions ? highestUnderAssumptions.scen.title : 'Baseline Only'}
            </p>
            <p className="mt-1 text-xs font-mono text-[#9CAFC6] tabular-nums">
              {highestUnderAssumptions
                ? formatUsd(highestUnderAssumptions.calc.usd.projectedCampaignContribution)
                : formatUsd(baselineCalc.usd.projectedCampaignContribution)}
            </p>
          </div>
        </div>

        {!canAccessProFeatures && (
          <div className="p-5 rounded-xl border border-[#5EE4A4]/40 bg-[#111C2E] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-[#5EE4A4] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-[#F8FAFC]">
                  Free Account — Baseline Saved
                </p>
                <p className="text-xs text-[#9CAFC6] mt-0.5">
                  Upgrade to Pro for multi-offer comparisons, Buy 2 Get 1 bundle economics, Sensitivity Lab, and PDF/CSV reporting.
                </p>
              </div>
            </div>
            <Link
              to="/pricing"
              className="px-4 py-2 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-xs font-semibold hover:bg-[#4AD493] whitespace-nowrap shrink-0"
            >
              View Pro Pricing
            </Link>
          </div>
        )}

        {/* Saved Scenarios Comparison Table */}
        <section className="rounded-xl border border-[#263449] bg-[#111C2E] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#263449] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#F8FAFC]">
                Promotion Scenarios vs. Baseline
              </h2>
              <p className="text-xs text-[#9CAFC6]">
                Projections reflect your entered order volume assumptions—not demand guarantees.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/app/scenarios"
                className="px-3 py-1.5 rounded-lg border border-[#263449] text-xs font-medium text-[#F8FAFC] hover:bg-[#0B1220]"
              >
                Open Scenario Lab
              </Link>
              <Link
                to="/app/reports"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#263449] text-xs font-medium text-[#F8FAFC] hover:bg-[#0B1220]"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                Reports
              </Link>
            </div>
          </div>

          {comparedList.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-[#9CAFC6]">
                You have saved your baseline, but haven&rsquo;t modeled a promotion offer yet.
              </p>
              <Link
                to="/app/scenarios/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-xs font-semibold hover:bg-[#4AD493]"
              >
                <PlusCircle className="w-4 h-4" aria-hidden="true" />
                Create your first promotion scenario
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#263449] text-xs text-[#9CAFC6]">
                    <th className="py-3 px-5 font-medium">Scenario</th>
                    <th className="py-3 px-3 font-medium text-right">Contribution / Order</th>
                    <th className="py-3 px-3 font-medium text-right">Margin %</th>
                    <th className="py-3 px-3 font-medium text-right">Projected Total</th>
                    <th className="py-3 px-3 font-medium text-right">Extra Orders Needed</th>
                    <th className="py-3 px-5 font-medium text-right">Threshold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#263449]/60">
                  {comparedList.map(({ scen, calc, cmp }) => {
                    const isTop = highestUnderAssumptions?.scen.id === scen.id;
                    return (
                      <tr key={scen.id} className="hover:bg-[#0B1220]/40">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <Link
                              to="/app/scenarios"
                              className="font-semibold text-[#F8FAFC] hover:text-[#5EE4A4]"
                            >
                              {scen.title}
                            </Link>
                            {scen.isSample && (
                              <span className="text-[11px] font-mono text-[#FBBF24]">
                                SAMPLE DATA
                              </span>
                            )}
                            {isTop && (
                              <span className="text-[11px] font-medium text-[#34D399]">
                                · Highest under current volume
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className={`py-3.5 px-3 text-right font-mono tabular-nums font-semibold ${
                            calc.usd.expectedContributionPerOrder <= 0
                              ? 'text-[#FB7185]'
                              : 'text-[#F8FAFC]'
                          }`}
                        >
                          {formatUsd(calc.usd.expectedContributionPerOrder)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#9CAFC6]">
                          {formatPercent(calc.contributionMarginPercent)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#F8FAFC]">
                          {formatUsd(calc.usd.projectedCampaignContribution)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#9CAFC6]">
                          {cmp.extraOrdersRequired === null
                            ? 'Cannot recover'
                            : `+${cmp.extraOrdersRequired}`}
                        </td>
                        <td className="py-3.5 px-5 text-right text-xs">
                          {calc.meetsMinContributionThreshold ? (
                            <span className="inline-flex items-center gap-1 text-[#34D399] font-medium">
                              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                              Pass
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[#FBBF24] font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                              Below floor
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {featuredOffer && featuredBrief && (
          <div className="space-y-6">
            <WaterfallChart
              baseline={baselineCalc}
              offer={featuredOffer.calc}
              offerLabel={featuredOffer.scen.title}
            />
            <DecisionBriefView brief={featuredBrief} scenarioTitle={featuredOffer.scen.title} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
