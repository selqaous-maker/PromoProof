import { Download, FileText, Lock, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { DecisionBriefView } from '../components/DecisionBriefView';
import { useAuth } from '../context/AuthContext';
import {
  calculateScenario,
  compareAgainstBaseline,
  EXAMPLE_BASELINE_INPUTS,
  formatPercent,
  formatUsd,
} from '../engine/calculator';
import { buildScenariosCsv, triggerCsvDownload } from '../engine/csvExport';
import { generateDecisionBrief } from '../engine/decisionEngine';

export function ReportsPage() {
  const {
    stores,
    costProfiles,
    scenarios,
    canAccessProFeatures,
    publicConfig,
  } = useAuth();

  const activeStore = stores[0];
  const activeProfile = costProfiles[0];
  const baselineDoc = scenarios.find((s) => s.offerType === 'baseline') || null;
  const baselineInputs = baselineDoc?.inputSnapshot || activeProfile?.inputs || EXAMPLE_BASELINE_INPUTS;
  const offerDocs = useMemo(
    () => scenarios.filter((s) => s.id !== baselineDoc?.id),
    [scenarios, baselineDoc?.id]
  );

  const [selectedOfferId, setSelectedOfferId] = useState<string>(offerDocs[0]?.id || '');

  const activeOfferDoc =
    offerDocs.find((d) => d.id === selectedOfferId) || offerDocs[0] || null;

  const baselineCalc = useMemo(() => calculateScenario(baselineInputs), [baselineInputs]);
  const offerCalc = useMemo(
    () => (activeOfferDoc ? calculateScenario(activeOfferDoc.inputSnapshot) : null),
    [activeOfferDoc]
  );
  const comparison = useMemo(
    () => (offerCalc ? compareAgainstBaseline(baselineCalc, offerCalc) : null),
    [baselineCalc, offerCalc]
  );
  const brief = useMemo(
    () =>
      activeOfferDoc
        ? generateDecisionBrief(baselineInputs, activeOfferDoc.inputSnapshot)
        : null,
    [baselineInputs, activeOfferDoc]
  );

  const handleDownloadCsv = () => {
    const csv = buildScenariosCsv(
      baselineDoc?.title || 'Baseline (No Promotion)',
      baselineInputs,
      offerDocs.map((d) => ({
        title: d.title,
        isSample: d.isSample,
        inputs: d.inputSnapshot,
      })),
      activeStore?.name
    );
    const slug = (activeStore?.name || 'store').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    triggerCsvDownload(`${slug}-promotion-scenarios.csv`, csv);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  if (!activeStore) {
    return (
      <AppShell title="Reports & Exports">
        <div className="rounded-xl border border-[#263449] bg-[#111C2E] p-8 max-w-xl space-y-4">
          <h2 className="text-xl font-bold text-[#F8FAFC]">No store economics to report yet</h2>
          <p className="text-sm text-[#9CAFC6]">
            Complete store onboarding first to generate printable Decision Briefs and CSV exports.
          </p>
          <Link
            to="/app/onboarding"
            className="inline-block px-5 py-2.5 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-sm font-semibold hover:bg-[#4AD493]"
          >
            Go to onboarding
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Reports & Exports"
      subtitle="Printable PDF-ready Offer Decision Brief and structured CSV export"
      actions={
        canAccessProFeatures ? (
          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#263449] text-xs font-semibold text-[#F8FAFC] hover:bg-[#111C2E] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              CSV
            </button>
            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-xs font-semibold hover:bg-[#4AD493] cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              Print / Save PDF
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {!canAccessProFeatures && (
          <div className="p-6 rounded-xl border border-[#5EE4A4]/50 bg-[#111C2E] flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-[#5EE4A4] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-bold text-[#F8FAFC]">
                  Printable Reports &amp; CSV Exports require {publicConfig.brandName} Pro
                </h2>
                <p className="text-xs text-[#9CAFC6] mt-1">
                  Preview your report layout below. Unlock one-time Pro access to download CSVs and
                  print formatted PDF briefs.
                </p>
              </div>
            </div>
            <Link
              to="/pricing"
              className="px-4 py-2.5 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-xs font-semibold hover:bg-[#4AD493] whitespace-nowrap shrink-0"
            >
              Upgrade to Pro
            </Link>
          </div>
        )}

        {/* Controls */}
        {offerDocs.length > 0 && (
          <div className="rounded-xl border border-[#263449] bg-[#111C2E] p-4 flex flex-wrap items-center justify-between gap-4 no-print">
            <label className="flex items-center gap-3 text-sm">
              <span className="text-xs font-medium text-[#9CAFC6]">Select offer for brief:</span>
              <select
                value={activeOfferDoc?.id || ''}
                onChange={(e) => setSelectedOfferId(e.target.value)}
                className="rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
              >
                {offerDocs.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title} {doc.isSample ? '(SAMPLE)' : ''}
                  </option>
                ))}
              </select>
            </label>

            {canAccessProFeatures && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#263449] text-xs font-semibold text-[#F8FAFC] hover:bg-[#0B1220] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  Download Scenarios CSV
                </button>
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-xs font-semibold hover:bg-[#4AD493] cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                  Print / Save PDF Report
                </button>
              </div>
            )}
          </div>
        )}

        {/* Printable Financial Report Document */}
        <article className="rounded-xl border border-[#263449] bg-[#111C2E] p-6 sm:p-8 space-y-8 print-surface">
          <header className="pb-6 border-b border-[#263449] flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#5EE4A4] print-muted">
                <FileText className="w-4 h-4" aria-hidden="true" />
                <span>{publicConfig.brandName} · Pre-Launch Unit-Economics Report</span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#F8FAFC]">
                {activeOfferDoc
                  ? `${activeOfferDoc.title} — Promotion Decision Report`
                  : `${activeStore.name} — Baseline Unit-Economics Report`}
              </h2>
              <p className="text-xs text-[#9CAFC6] print-muted">
                Store: {activeStore.name} · Currency: USD · Generated:{' '}
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
                {activeOfferDoc?.isSample ? ' · SAMPLE DATA' : ''}
              </p>
            </div>
          </header>

          {/* Before / After Comparison Table */}
          <section className="space-y-3 print-break-avoid">
            <h3 className="text-sm font-bold text-[#F8FAFC]">
              Before vs. After Unit-Economics Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead>
                  <tr className="border-b border-[#263449] text-[#9CAFC6] print-muted">
                    <th className="py-2 pr-4 font-medium">Line Item</th>
                    <th className="py-2 px-3 font-medium text-right">Baseline</th>
                    {offerCalc && (
                      <th className="py-2 pl-3 font-medium text-right">
                        {activeOfferDoc?.title}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#263449]/60 font-mono tabular-nums">
                  <tr>
                    <td className="py-2 pr-4 font-sans text-[#9CAFC6] print-muted">
                      List Merchandise Subtotal
                    </td>
                    <td className="py-2 px-3 text-right">
                      {formatUsd(baselineCalc.usd.listMerchandiseSubtotal)}
                    </td>
                    {offerCalc && (
                      <td className="py-2 pl-3 text-right">
                        {formatUsd(offerCalc.usd.listMerchandiseSubtotal)}
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-sans text-[#9CAFC6] print-muted">
                      Discount &amp; Shipping Collected
                    </td>
                    <td className="py-2 px-3 text-right">
                      -{formatUsd(baselineCalc.usd.discountAmount)} / +
                      {formatUsd(baselineCalc.usd.effectiveCustomerShipping)}
                    </td>
                    {offerCalc && (
                      <td className="py-2 pl-3 text-right">
                        -{formatUsd(offerCalc.usd.discountAmount)} / +
                        {formatUsd(offerCalc.usd.effectiveCustomerShipping)}
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-sans text-[#9CAFC6] print-muted">
                      Customer Amount Charged (ex. tax)
                    </td>
                    <td className="py-2 px-3 text-right">
                      {formatUsd(baselineCalc.usd.customerAmountCharged)}
                    </td>
                    {offerCalc && (
                      <td className="py-2 pl-3 text-right">
                        {formatUsd(offerCalc.usd.customerAmountCharged)}
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-sans text-[#9CAFC6] print-muted">
                      Total Order COGS (incl. bonus units)
                    </td>
                    <td className="py-2 px-3 text-right">
                      -{formatUsd(baselineCalc.inputs.totalOrderCogsUsd)}
                    </td>
                    {offerCalc && (
                      <td className="py-2 pl-3 text-right">
                        -{formatUsd(offerCalc.inputs.totalOrderCogsUsd)}
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-sans text-[#9CAFC6] print-muted">
                      Outbound Shipping + Packaging
                    </td>
                    <td className="py-2 px-3 text-right">
                      -
                      {formatUsd(
                        baselineCalc.inputs.merchantOutboundShippingUsd +
                          baselineCalc.inputs.packagingFulfillmentUsd
                      )}
                    </td>
                    {offerCalc && (
                      <td className="py-2 pl-3 text-right">
                        -
                        {formatUsd(
                          offerCalc.inputs.merchantOutboundShippingUsd +
                            offerCalc.inputs.packagingFulfillmentUsd
                        )}
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-sans text-[#9CAFC6] print-muted">
                      Payment Processing Fees + Ad CAC
                    </td>
                    <td className="py-2 px-3 text-right">
                      -
                      {formatUsd(
                        baselineCalc.usd.processingFee + baselineCalc.inputs.cacPerOrderUsd
                      )}
                    </td>
                    {offerCalc && (
                      <td className="py-2 pl-3 text-right">
                        -{formatUsd(offerCalc.usd.processingFee + offerCalc.inputs.cacPerOrderUsd)}
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-sans text-[#9CAFC6] print-muted">
                      Expected Refund + Net Return Cost
                    </td>
                    <td className="py-2 px-3 text-right">
                      -
                      {formatUsd(
                        baselineCalc.usd.expectedRefundedRevenue +
                          baselineCalc.usd.expectedReturnHandling -
                          baselineCalc.usd.expectedRecoveredInventory
                      )}
                    </td>
                    {offerCalc && (
                      <td className="py-2 pl-3 text-right">
                        -
                        {formatUsd(
                          offerCalc.usd.expectedRefundedRevenue +
                            offerCalc.usd.expectedReturnHandling -
                            offerCalc.usd.expectedRecoveredInventory
                        )}
                      </td>
                    )}
                  </tr>
                  <tr className="font-bold">
                    <td className="py-3 pr-4 font-sans">Expected Contribution / Order</td>
                    <td className="py-3 px-3 text-right">
                      {formatUsd(baselineCalc.usd.expectedContributionPerOrder)} (
                      {formatPercent(baselineCalc.contributionMarginPercent)})
                    </td>
                    {offerCalc && (
                      <td className="py-3 pl-3 text-right">
                        {formatUsd(offerCalc.usd.expectedContributionPerOrder)} (
                        {formatPercent(offerCalc.contributionMarginPercent)})
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-sans text-[#9CAFC6] print-muted">
                      Projected Campaign Contribution (after fixed cost)
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {formatUsd(baselineCalc.usd.projectedCampaignContribution)} (
                      {baselineCalc.inputs.projectedOrderCount} ord)
                    </td>
                    {offerCalc && (
                      <td className="py-2.5 pl-3 text-right">
                        {formatUsd(offerCalc.usd.projectedCampaignContribution)} (
                        {offerCalc.inputs.projectedOrderCount} ord)
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {comparison && (
            <section className="p-4 rounded-lg bg-[#0B1220] border border-[#263449] text-sm print-surface print-break-avoid">
              <strong className="block mb-1 text-[#F8FAFC]">Break-Even Recovery Conclusion</strong>
              <p className="text-[#9CAFC6] print-muted">{comparison.recoveryExplanation}</p>
            </section>
          )}

          {brief && (
            <DecisionBriefView brief={brief} scenarioTitle={activeOfferDoc?.title} />
          )}

          <footer className="pt-4 border-t border-[#263449] text-xs text-[#9CAFC6] print-muted space-y-1">
            <p>
              <strong>Estimation Disclaimer:</strong> Figures represent estimated pre-launch
              contribution economics based exclusively on user-entered inputs and full-order refund
              assumptions. Excludes sales tax/VAT, fixed overhead, chargebacks, and accounting
              timing. Not tax, financial, or legal advice.
            </p>
          </footer>
        </article>
      </div>
    </AppShell>
  );
}
