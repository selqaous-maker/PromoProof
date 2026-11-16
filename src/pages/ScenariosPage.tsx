import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Lock,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { DecisionBriefView } from '../components/DecisionBriefView';
import { WaterfallChart } from '../components/WaterfallChart';
import { useAuth } from '../context/AuthContext';
import {
  calculateScenario,
  compareAgainstBaseline,
  EXAMPLE_BASELINE_INPUTS,
  formatPercent,
  formatUsd,
} from '../engine/calculator';
import { generateDecisionBrief } from '../engine/decisionEngine';
import { OFFER_PRESETS } from '../engine/presets';
import { buildSensitivityReport } from '../engine/sensitivity';
import { OfferType, PromotionInputs } from '../engine/types';
import {
  createScenario,
  deleteScenario,
  ScenarioDoc,
  updateScenario,
} from '../lib/firestoreRepo';

export function ScenariosPage({ createMode = false }: { createMode?: boolean }) {
  const {
    user,
    stores,
    costProfiles,
    scenarios,
    canAccessProFeatures,
  } = useAuth();
  const navigate = useNavigate();

  const activeStore = stores[0];
  const activeProfile = costProfiles[0];
  const baselineDoc = scenarios.find((s) => s.offerType === 'baseline') || null;
  const baselineInputs: PromotionInputs =
    baselineDoc?.inputSnapshot || activeProfile?.inputs || EXAMPLE_BASELINE_INPUTS;

  const offerDocs = useMemo(
    () => scenarios.filter((s) => s.id !== baselineDoc?.id),
    [scenarios, baselineDoc?.id]
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [draftInputs, setDraftInputs] = useState<PromotionInputs>(() =>
    OFFER_PRESETS[1].applyToBaseline(baselineInputs)
  );
  const [assumptionsNote, setAssumptionsNote] = useState('Manual promotion assumptions');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize selected comparison scenarios (up to 3) & focused editor
  useEffect(() => {
    if (createMode) {
      setFocusedId(null);
      setEditingTitle('New Promotion Offer');
      setDraftInputs(OFFER_PRESETS[0].applyToBaseline(baselineInputs));
      return;
    }

    if (offerDocs.length > 0) {
      setSelectedIds((prev) =>
        prev.length > 0
          ? prev.filter((id) => offerDocs.some((d) => d.id === id)).slice(0, 3)
          : offerDocs.slice(0, 3).map((d) => d.id)
      );
      if (!focusedId || !offerDocs.some((d) => d.id === focusedId)) {
        const first = offerDocs[0];
        setFocusedId(first.id);
        setEditingTitle(first.title);
        setDraftInputs(first.inputSnapshot);
        setAssumptionsNote(first.assumptionsNote || '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createMode, offerDocs.length]);

  const loadScenarioIntoEditor = (doc: ScenarioDoc) => {
    setFocusedId(doc.id);
    setEditingTitle(doc.title);
    setDraftInputs(doc.inputSnapshot);
    setAssumptionsNote(doc.assumptionsNote || '');
    setFeedback(null);
    setError(null);
    if (createMode) navigate('/app/scenarios');
  };

  const toggleCompare = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const setNum = (field: keyof PromotionInputs, raw: string) => {
    const val = raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(val)) return;
    setDraftInputs((prev) => ({ ...prev, [field]: Math.max(0, val) }));
  };

  const applyPreset = (presetId: string) => {
    const preset = OFFER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setDraftInputs(preset.applyToBaseline(baselineInputs));
    if (createMode || !focusedId) {
      setEditingTitle(preset.title);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !activeStore) {
      setError('Complete store onboarding before saving scenarios.');
      return;
    }
    if (!canAccessProFeatures && offerDocs.length >= 1 && !focusedId) {
      setError('Free accounts can model 1 saved scenario. Upgrade to Pro for unlimited scenarios and 3-way comparisons.');
      return;
    }

    setBusy(true);
    setError(null);
    setFeedback(null);

    const offerValue =
      draftInputs.offerType === 'percent_discount'
        ? draftInputs.discountPercent
        : draftInputs.offerType === 'fixed_discount'
          ? draftInputs.discountFixedUsd
          : draftInputs.bonusUnitsPerOrder;

    try {
      if (focusedId && !createMode) {
        await updateScenario(focusedId, {
          title: editingTitle,
          isSample: false,
          offerType: draftInputs.offerType,
          offerValue,
          inputSnapshot: draftInputs,
          assumptionsNote,
        });
        setFeedback('Scenario updated.');
      } else {
        const newId = await createScenario(user.uid, activeStore.id, {
          title: editingTitle || 'Untitled Offer',
          isSample: false,
          offerType: draftInputs.offerType,
          offerValue,
          inputSnapshot: draftInputs,
          assumptionsNote,
        });
        setFocusedId(newId);
        setSelectedIds((prev) => [newId, ...prev].slice(0, 3));
        setFeedback('Scenario saved.');
        if (createMode) navigate('/app/scenarios');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save scenario.');
    } finally {
      setBusy(false);
    }
  };

  const handleClone = async (doc: ScenarioDoc) => {
    if (!user || !activeStore) return;
    if (!canAccessProFeatures) {
      setError('Cloning multiple scenarios requires Pro access.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const newId = await createScenario(user.uid, activeStore.id, {
        title: `${doc.title} (Copy)`.slice(0, 120),
        isSample: false,
        offerType: doc.offerType,
        offerValue: doc.offerValue,
        inputSnapshot: doc.inputSnapshot,
        assumptionsNote: doc.assumptionsNote,
      });
      setFocusedId(newId);
      setEditingTitle(`${doc.title} (Copy)`.slice(0, 120));
      setDraftInputs(doc.inputSnapshot);
      setFeedback('Scenario cloned.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to clone scenario.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await deleteScenario(id);
      setConfirmDeleteId(null);
      setSelectedIds((prev) => prev.filter((s) => s !== id));
      if (focusedId === id) {
        setFocusedId(null);
      }
      setFeedback('Scenario deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete scenario.');
    } finally {
      setBusy(false);
    }
  };

  const baselineCalc = useMemo(() => calculateScenario(baselineInputs), [baselineInputs]);
  const draftCalc = useMemo(() => calculateScenario(draftInputs), [draftInputs]);
  const draftBrief = useMemo(
    () => generateDecisionBrief(baselineInputs, draftInputs),
    [baselineInputs, draftInputs]
  );
  const sensitivity = useMemo(() => buildSensitivityReport(draftInputs), [draftInputs]);

  const comparedScenarios = useMemo(() => {
    const docs = offerDocs.filter((d) => selectedIds.includes(d.id)).slice(0, 3);
    return docs.map((d) => {
      const calc = calculateScenario(d.inputSnapshot);
      const cmp = compareAgainstBaseline(baselineCalc, calc);
      return { doc: d, calc, cmp };
    });
  }, [offerDocs, selectedIds, baselineCalc]);

  const highestCompared = useMemo(() => {
    if (comparedScenarios.length === 0) return null;
    return comparedScenarios.reduce((best, curr) =>
      curr.calc.usd.projectedCampaignContribution > best.calc.usd.projectedCampaignContribution
        ? curr
        : best
    );
  }, [comparedScenarios]);

  if (!activeStore) {
    return (
      <AppShell title="Scenario Builder">
        <div className="rounded-xl border border-[#263449] bg-[#111C2E] p-8 max-w-xl space-y-4">
          <h2 className="text-xl font-bold text-[#F8FAFC]">Store onboarding required first</h2>
          <p className="text-sm text-[#9CAFC6]">
            Save your store&rsquo;s baseline unit economics (or load Sample Data) before building
            what-if scenarios.
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
      title={createMode ? 'New Promotion Offer' : 'Scenario Builder & Comparison Lab'}
      subtitle="Model up to 3 offers side by side against your baseline without altering baseline assumptions"
      actions={
        !createMode ? (
          <Link
            to="/app/scenarios/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-xs font-semibold hover:bg-[#4AD493] whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            New offer
          </Link>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {error && (
          <div role="alert" className="p-4 rounded-xl border border-[#FB7185]/40 bg-[#FB7185]/10 text-sm text-[#FB7185]">
            {error}
          </div>
        )}
        {feedback && (
          <div className="p-3.5 rounded-xl border border-[#34D399]/40 bg-[#34D399]/10 text-xs text-[#34D399] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Saved Offer List & Comparison Picker */}
        {!createMode && offerDocs.length > 0 && (
          <section className="rounded-xl border border-[#263449] bg-[#111C2E] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#F8FAFC]">
                Saved Scenarios (select up to 3 to compare)
              </h2>
              <span className="text-xs text-[#9CAFC6]">
                {selectedIds.length} of 3 selected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {offerDocs.map((doc) => {
                const isSelected = selectedIds.includes(doc.id);
                const isFocused = focusedId === doc.id;
                return (
                  <div
                    key={doc.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      isFocused
                        ? 'border-[#5EE4A4] bg-[#0B1220]'
                        : 'border-[#263449] bg-[#0B1220]/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => loadScenarioIntoEditor(doc)}
                        className="text-left min-w-0 flex-1 cursor-pointer"
                      >
                        <p className="text-sm font-semibold text-[#F8FAFC] truncate">
                          {doc.title}
                        </p>
                        <p className="text-xs text-[#9CAFC6] mt-0.5">
                          {doc.offerType.replace('_', ' ')}
                          {doc.isSample ? ' · SAMPLE DATA' : ''}
                        </p>
                      </button>

                      <input
                        type="checkbox"
                        aria-label={`Include ${doc.title} in comparison`}
                        checked={isSelected}
                        onChange={() => toggleCompare(doc.id)}
                        className="mt-1 accent-[#5EE4A4] w-4 h-4 cursor-pointer"
                      />
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#263449] flex items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => loadScenarioIntoEditor(doc)}
                        className="text-[#5EE4A4] font-medium hover:underline cursor-pointer"
                      >
                        Edit &amp; inspect
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleClone(doc)}
                          aria-label={`Clone ${doc.title}`}
                          className="p-1 text-[#9CAFC6] hover:text-[#F8FAFC] cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        {confirmDeleteId === doc.id ? (
                          <span className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDelete(doc.id)}
                              className="text-[#FB7185] font-semibold hover:underline cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[#9CAFC6] hover:underline cursor-pointer"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(doc.id)}
                            aria-label={`Delete ${doc.title}`}
                            className="p-1 text-[#9CAFC6] hover:text-[#FB7185] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Side-by-Side Comparison Matrix */}
        {!createMode && comparedScenarios.length > 0 && (
          <section className="rounded-xl border border-[#263449] bg-[#111C2E] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#263449] flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#F8FAFC]">
                  Side-by-Side Comparison vs. Baseline
                </h2>
                <p className="text-xs text-[#9CAFC6]">
                  Highest projected contribution is strictly conditional on each scenario&rsquo;s
                  entered volume assumption.
                </p>
              </div>
              {!canAccessProFeatures && (
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5EE4A4]"
                >
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  Unlock unlimited Pro scenarios
                </Link>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#263449] text-xs text-[#9CAFC6]">
                    <th className="py-3 px-5 font-medium">Metric</th>
                    <th className="py-3 px-4 font-medium text-right">Baseline</th>
                    {comparedScenarios.map(({ doc }) => (
                      <th key={doc.id} className="py-3 px-4 font-medium text-right">
                        <span className="block text-[#F8FAFC]">{doc.title}</span>
                        {highestCompared?.doc.id === doc.id && (
                          <span className="text-[11px] text-[#34D399] font-normal">
                            Highest under volume assumption
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#263449]/60 font-mono tabular-nums text-xs sm:text-sm">
                  <tr>
                    <td className="py-3 px-5 font-sans text-[#9CAFC6]">Customer Charged</td>
                    <td className="py-3 px-4 text-right text-[#F8FAFC]">
                      {formatUsd(baselineCalc.usd.customerAmountCharged)}
                    </td>
                    {comparedScenarios.map(({ doc, calc }) => (
                      <td key={doc.id} className="py-3 px-4 text-right text-[#F8FAFC]">
                        {formatUsd(calc.usd.customerAmountCharged)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-sans font-semibold text-[#F8FAFC]">
                      Contribution / Order
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[#F8FAFC]">
                      {formatUsd(baselineCalc.usd.expectedContributionPerOrder)}
                    </td>
                    {comparedScenarios.map(({ doc, calc }) => (
                      <td
                        key={doc.id}
                        className={`py-3 px-4 text-right font-semibold ${
                          calc.usd.expectedContributionPerOrder <= 0
                            ? 'text-[#FB7185]'
                            : calc.meetsMinContributionThreshold
                              ? 'text-[#34D399]'
                              : 'text-[#FBBF24]'
                        }`}
                      >
                        {formatUsd(calc.usd.expectedContributionPerOrder)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-sans text-[#9CAFC6]">Contribution Margin %</td>
                    <td className="py-3 px-4 text-right text-[#9CAFC6]">
                      {formatPercent(baselineCalc.contributionMarginPercent)}
                    </td>
                    {comparedScenarios.map(({ doc, calc }) => (
                      <td key={doc.id} className="py-3 px-4 text-right text-[#9CAFC6]">
                        {formatPercent(calc.contributionMarginPercent)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-sans text-[#9CAFC6]">Projected Orders</td>
                    <td className="py-3 px-4 text-right text-[#9CAFC6]">
                      {baselineInputs.projectedOrderCount.toLocaleString('en-US')}
                    </td>
                    {comparedScenarios.map(({ doc, calc }) => (
                      <td key={doc.id} className="py-3 px-4 text-right text-[#9CAFC6]">
                        {calc.inputs.projectedOrderCount.toLocaleString('en-US')}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-sans text-[#9CAFC6]">Projected Campaign Contrib.</td>
                    <td className="py-3 px-4 text-right text-[#F8FAFC]">
                      {formatUsd(baselineCalc.usd.projectedCampaignContribution)}
                    </td>
                    {comparedScenarios.map(({ doc, calc }) => (
                      <td key={doc.id} className="py-3 px-4 text-right font-semibold text-[#F8FAFC]">
                        {formatUsd(calc.usd.projectedCampaignContribution)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-sans text-[#9CAFC6]">
                      Extra Orders to Match Baseline
                    </td>
                    <td className="py-3 px-4 text-right text-[#9CAFC6]">0</td>
                    {comparedScenarios.map(({ doc, cmp }) => (
                      <td key={doc.id} className="py-3 px-4 text-right text-[#F8FAFC]">
                        {cmp.extraOrdersRequired === null
                          ? 'Cannot recover'
                          : `+${cmp.extraOrdersRequired.toLocaleString('en-US')}`}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-sans text-[#9CAFC6]">Minimum Floor Check</td>
                    <td className="py-3 px-4 text-right font-sans">
                      {baselineCalc.meetsMinContributionThreshold ? 'Pass' : 'Below'}
                    </td>
                    {comparedScenarios.map(({ doc, calc }) => (
                      <td key={doc.id} className="py-3 px-4 text-right font-sans">
                        {calc.meetsMinContributionThreshold ? (
                          <span className="inline-flex items-center gap-1 text-[#34D399]">
                            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                            Pass
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#FBBF24]">
                            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                            Below
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Scenario Editor Form */}
        <form
          onSubmit={handleSave}
          className="rounded-xl border border-[#263449] bg-[#111C2E] p-5 sm:p-6 space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#263449]">
            <div>
              <h2 className="text-base font-bold text-[#F8FAFC]">
                {focusedId && !createMode ? 'Edit Selected Offer' : 'Build Promotion Scenario'}
              </h2>
              <p className="text-xs text-[#9CAFC6]">
                Load an editable preset or configure custom discounts, bundles, volume, and fixed
                campaign spend.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {OFFER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className="px-2.5 py-1.5 rounded-md border border-[#263449] bg-[#0B1220] text-xs font-medium text-[#9CAFC6] hover:text-[#F8FAFC] hover:border-[#5EE4A4]/60 cursor-pointer"
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-[#9CAFC6]">Scenario title</span>
              <input
                type="text"
                required
                maxLength={120}
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-[#9CAFC6]">Offer type</span>
              <select
                value={draftInputs.offerType}
                onChange={(e) =>
                  setDraftInputs((prev) => ({
                    ...prev,
                    offerType: e.target.value as OfferType,
                  }))
                }
                className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
              >
                <option value="percent_discount">Percentage Discount (% Off)</option>
                <option value="fixed_discount">Fixed Dollar Discount ($ Off)</option>
                <option value="free_shipping">Free Shipping (Merchant Absorbs)</option>
                <option value="bundle">Bundle / Buy X Get Y</option>
              </select>
            </label>

            {draftInputs.offerType === 'percent_discount' && (
              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Discount (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={draftInputs.discountPercent}
                  onChange={(e) => setNum('discountPercent', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>
            )}

            {draftInputs.offerType === 'fixed_discount' && (
              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Fixed discount ($)</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={draftInputs.discountFixedUsd}
                  onChange={(e) => setNum('discountFixedUsd', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>
            )}

            {draftInputs.offerType === 'bundle' && (
              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Free / bonus units</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={draftInputs.bonusUnitsPerOrder}
                  onChange={(e) => setNum('bonusUnitsPerOrder', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>
            )}

            {draftInputs.offerType === 'free_shipping' && (
              <div className="flex items-end pb-2 text-xs text-[#9CAFC6]">
                Customer shipping set to $0.00 automatically.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="block">
              <span className="text-xs font-medium text-[#9CAFC6]">Paid units / order</span>
              <input
                type="number"
                min="1"
                step="1"
                value={draftInputs.paidUnitsPerOrder}
                onChange={(e) => setNum('paidUnitsPerOrder', e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-[#9CAFC6]">Total order COGS ($)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={draftInputs.totalOrderCogsUsd}
                onChange={(e) => setNum('totalOrderCogsUsd', e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-[#9CAFC6]">Projected campaign orders</span>
              <input
                type="number"
                min="0"
                step="1"
                value={draftInputs.projectedOrderCount}
                onChange={(e) => setNum('projectedOrderCount', e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-[#9CAFC6]">Fixed campaign spend ($)</span>
              <input
                type="number"
                min="0"
                step="10"
                value={draftInputs.fixedCampaignCostUsd}
                onChange={(e) => setNum('fixedCampaignCostUsd', e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-[#9CAFC6]">Ad CAC / order ($)</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={draftInputs.cacPerOrderUsd}
                onChange={(e) => setNum('cacPerOrderUsd', e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-[#9CAFC6]">Refund probability (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={draftInputs.refundProbabilityPercent}
                onChange={(e) => setNum('refundProbabilityPercent', e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-[#9CAFC6]">Assumptions note</span>
              <input
                type="text"
                maxLength={500}
                value={assumptionsNote}
                onChange={(e) => setAssumptionsNote(e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#263449]">
            <p className="text-xs font-mono text-[#9CAFC6] tabular-nums">
              Live draft contribution:{' '}
              <strong className="text-[#5EE4A4]">
                {formatUsd(draftCalc.usd.expectedContributionPerOrder)}/order
              </strong>{' '}
              · Break-even fixed spend orders:{' '}
              <strong className="text-[#F8FAFC]">
                {draftCalc.breakEvenCampaignOrders ?? 'N/A'}
              </strong>
            </p>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-sm font-semibold hover:bg-[#4AD493] disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              {busy ? 'Saving...' : focusedId && !createMode ? 'Save changes' : 'Save new scenario'}
            </button>
          </div>
        </form>

        {/* Decision Brief & Waterfall for Current Draft */}
        <DecisionBriefView brief={draftBrief} scenarioTitle={editingTitle || 'Draft Scenario'} />

        <WaterfallChart
          baseline={baselineCalc}
          offer={draftCalc}
          offerLabel={editingTitle || 'Draft Scenario'}
        />

        {/* Sensitivity Lab */}
        <section className="rounded-xl border border-[#263449] bg-[#111C2E] p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#263449]">
            <div>
              <h2 className="text-base font-bold text-[#F8FAFC]">
                Sensitivity Lab (Stress-Test Scenarios, Not Forecasts)
              </h2>
              <p className="text-xs text-[#9CAFC6] mt-0.5">
                Inspect how <strong>{editingTitle || 'this scenario'}</strong> behaves if demand,
                paid acquisition cost, or return rates shift.
              </p>
            </div>
            {!canAccessProFeatures && (
              <Link
                to="/pricing"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5EE4A4]"
              >
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                Pro Feature Preview
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Demand Volume Swings */}
            <div className="p-4 rounded-lg bg-[#0B1220] border border-[#263449] space-y-3">
              <h3 className="text-xs font-semibold text-[#F8FAFC]">Volume Sensitivity (-20% / +20%)</h3>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-[#263449]/60 font-mono tabular-nums">
                  {sensitivity.demandSwings.map((pt) => (
                    <tr key={pt.label}>
                      <td className="py-2 font-sans text-[#9CAFC6]">{pt.label}</td>
                      <td className="py-2 text-right text-[#9CAFC6]">{pt.projectedOrders} ord</td>
                      <td
                        className={`py-2 text-right font-semibold ${
                          pt.campaignContributionUsd <= 0 ? 'text-[#FB7185]' : 'text-[#34D399]'
                        }`}
                      >
                        {formatUsd(pt.campaignContributionUsd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CAC Inflation Swings */}
            <div className="p-4 rounded-lg bg-[#0B1220] border border-[#263449] space-y-3">
              <h3 className="text-xs font-semibold text-[#F8FAFC]">CAC Sensitivity</h3>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-[#263449]/60 font-mono tabular-nums">
                  {sensitivity.cacSwings.map((pt) => (
                    <tr key={pt.label}>
                      <td className="py-2 font-sans text-[#9CAFC6]">{pt.label}</td>
                      <td className="py-2 text-right text-[#9CAFC6]">{formatUsd(pt.cacUsd)}</td>
                      <td
                        className={`py-2 text-right font-semibold ${
                          pt.contributionPerOrderUsd <= 0 ? 'text-[#FB7185]' : 'text-[#F8FAFC]'
                        }`}
                      >
                        {formatUsd(pt.contributionPerOrderUsd)}/ord
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Refund Rate Stress */}
            <div className="p-4 rounded-lg bg-[#0B1220] border border-[#263449] space-y-3">
              <h3 className="text-xs font-semibold text-[#F8FAFC]">Return Rate Stress (0–15%)</h3>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-[#263449]/60 font-mono tabular-nums">
                  {sensitivity.refundSwings.map((pt) => (
                    <tr key={pt.label}>
                      <td className="py-2 font-sans text-[#9CAFC6]">{pt.label}</td>
                      <td className="py-2 text-right text-[#9CAFC6]">
                        {formatPercent(pt.marginPercent)}
                      </td>
                      <td
                        className={`py-2 text-right font-semibold ${
                          pt.contributionPerOrderUsd <= 0 ? 'text-[#FB7185]' : 'text-[#F8FAFC]'
                        }`}
                      >
                        {formatUsd(pt.contributionPerOrderUsd)}/ord
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
