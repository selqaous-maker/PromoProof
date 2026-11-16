import { ArrowRight, BookOpen, CheckCircle2, Sparkles } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { calculateScenario, EXAMPLE_BASELINE_INPUTS, formatUsd } from '../engine/calculator';
import { SAMPLE_WORKSPACE_SCENARIOS } from '../engine/presets';
import { PromotionInputs } from '../engine/types';
import { createScenario, upsertStoreAndCostProfile } from '../lib/firestoreRepo';

export function OnboardingPage() {
  const { user, stores, costProfiles, scenarios } = useAuth();
  const navigate = useNavigate();

  const existingStore = stores[0];
  const existingProfile = costProfiles[0];

  const [storeName, setStoreName] = useState(existingStore?.name || '');
  const [inputs, setInputs] = useState<PromotionInputs>(
    existingProfile?.inputs || EXAMPLE_BASELINE_INPUTS
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (existingStore?.name) setStoreName(existingStore.name);
    if (existingProfile?.inputs) setInputs(existingProfile.inputs);
  }, [existingStore?.name, existingProfile?.inputs]);

  const setNum = (field: keyof PromotionInputs, raw: string) => {
    const val = raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(val)) return;
    setInputs((prev) => ({ ...prev, [field]: Math.max(0, val) }));
  };

  const previewCalc = calculateScenario({ ...inputs, offerType: 'baseline' });

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      const { storeId } = await upsertStoreAndCostProfile(
        user.uid,
        storeName.trim() || 'My Store',
        { ...inputs, offerType: 'baseline', discountPercent: 0, discountFixedUsd: 0 },
        existingStore?.id,
        existingProfile?.id,
        existingProfile?.version ?? 1
      );

      // Ensure a baseline scenario exists if user has none yet
      if (scenarios.length === 0) {
        await createScenario(user.uid, storeId, {
          title: 'Baseline (No Promotion)',
          isSample: false,
          offerType: 'baseline',
          offerValue: 0,
          inputSnapshot: { ...inputs, offerType: 'baseline', discountPercent: 0, discountFixedUsd: 0 },
          assumptionsNote: 'Primary baseline saved during store onboarding.',
        });
      }

      setSavedMsg('Store economics saved.');
      navigate('/app/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save store profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSampleWorkspace = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const { storeId } = await upsertStoreAndCostProfile(
        user.uid,
        'Example DTC Store (Sample Data)',
        EXAMPLE_BASELINE_INPUTS,
        existingStore?.id,
        existingProfile?.id,
        existingProfile?.version ?? 1
      );

      if (scenarios.length === 0) {
        await createScenario(user.uid, storeId, {
          title: 'Baseline (Sample Data)',
          isSample: true,
          offerType: 'baseline',
          offerValue: 0,
          inputSnapshot: EXAMPLE_BASELINE_INPUTS,
          assumptionsNote: 'Sample baseline SKU ($60 retail, $22 COGS, $12 CAC).',
        });

        for (const sample of SAMPLE_WORKSPACE_SCENARIOS) {
          await createScenario(user.uid, storeId, {
            title: `${sample.title} (Sample)`,
            isSample: true,
            offerType: sample.inputs.offerType,
            offerValue:
              sample.inputs.offerType === 'percent_discount'
                ? sample.inputs.discountPercent
                : sample.inputs.offerType === 'fixed_discount'
                  ? sample.inputs.discountFixedUsd
                  : sample.inputs.bonusUnitsPerOrder,
            inputSnapshot: sample.inputs,
            assumptionsNote: 'Editable sample promotion scenario.',
          });
        }
      }

      navigate('/app/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load sample store.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Store Unit-Economics Setup"
      subtitle="Enter your baseline numbers once (under 3 minutes). Every scenario compares against this baseline."
    >
      <div className="space-y-6">
        {/* Embedded Getting Started Guide */}
        <section className="rounded-xl border border-[#263449] bg-[#111C2E] p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-[#5EE4A4]" aria-hidden="true" />
              <h2 className="text-base font-bold text-[#F8FAFC]">
                Quick-Start Guide (No Store API Required)
              </h2>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={handleLoadSampleWorkspace}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#5EE4A4]/50 text-xs font-semibold text-[#5EE4A4] hover:bg-[#5EE4A4]/10 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Skip &amp; load labeled Sample Store Data
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#9CAFC6] leading-relaxed">
            <div className="p-3.5 rounded-lg bg-[#0B1220] border border-[#263449]">
              <strong className="text-[#F8FAFC] block mb-1">1. Separate per-order CAC vs. fixed spend</strong>
              Put your paid acquisition cost per order in <em>CAC / Order</em>, and put flat creative
              or agency setup fees in <em>Fixed Campaign Cost</em> so you never double-count.
            </div>
            <div className="p-3.5 rounded-lg bg-[#0B1220] border border-[#263449]">
              <strong className="text-[#F8FAFC] block mb-1">2. Include all shipping &amp; return drag</strong>
              Enter what customers pay for shipping separately from your carrier label cost so Free
              Shipping offers accurately show your true subsidy.
            </div>
            <div className="p-3.5 rounded-lg bg-[#0B1220] border border-[#263449]">
              <strong className="text-[#F8FAFC] block mb-1">3. Set your contribution floor</strong>
              Your minimum acceptable contribution per order powers the Decision Engine and computes
              your exact Maximum Safe Discount.
            </div>
          </div>
        </section>

        {/* Live Baseline Preview Strip */}
        <div className="rounded-xl border border-[#263449] bg-[#111C2E] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-[#9CAFC6]">Live baseline preview (USD)</p>
            <p className="text-sm text-[#F8FAFC] mt-0.5">
              Expected contribution:{' '}
              <strong className="font-mono text-[#5EE4A4]">
                {formatUsd(previewCalc.usd.expectedContributionPerOrder)}/order
              </strong>{' '}
              ({previewCalc.contributionMarginPercent?.toFixed(1) ?? 'N/A'}% margin)
            </p>
          </div>
          <p className="text-xs font-mono text-[#9CAFC6] tabular-nums">
            Projected baseline ({inputs.projectedOrderCount} orders):{' '}
            <strong className="text-[#F8FAFC]">
              {formatUsd(previewCalc.usd.projectedCampaignContribution)}
            </strong>
          </p>
        </div>

        {error && (
          <div role="alert" className="p-4 rounded-xl border border-[#FB7185]/40 bg-[#FB7185]/10 text-sm text-[#FB7185]">
            {error}
          </div>
        )}
        {savedMsg && (
          <div className="p-4 rounded-xl border border-[#34D399]/40 bg-[#34D399]/10 text-sm text-[#34D399] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>{savedMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Store Details */}
          <div className="rounded-xl border border-[#263449] bg-[#111C2E] p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-[#F8FAFC]">01. Store Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Store or brand name (optional)</span>
                <input
                  type="text"
                  maxLength={120}
                  placeholder="e.g. Harbor Home Goods"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Currency</span>
                <input
                  type="text"
                  readOnly
                  value="USD ($)"
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220]/60 border border-[#263449] px-3 py-2.5 text-sm font-mono text-[#9CAFC6]"
                />
              </label>
            </div>
          </div>

          {/* Product & Fulfillment */}
          <div className="rounded-xl border border-[#263449] bg-[#111C2E] p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-[#F8FAFC]">02. Product, COGS &amp; Fulfillment</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Typical unit list price ($)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={inputs.unitListPriceUsd}
                  onChange={(e) => setNum('unitListPriceUsd', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Typical paid units per order</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={inputs.paidUnitsPerOrder}
                  onChange={(e) => setNum('paidUnitsPerOrder', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Total COGS per order ($)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={inputs.totalOrderCogsUsd}
                  onChange={(e) => setNum('totalOrderCogsUsd', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Shipping charged to customer ($)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={inputs.customerShippingRevenueUsd}
                  onChange={(e) => setNum('customerShippingRevenueUsd', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Merchant outbound shipping cost ($)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={inputs.merchantOutboundShippingUsd}
                  onChange={(e) => setNum('merchantOutboundShippingUsd', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Packaging &amp; fulfillment / order ($)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={inputs.packagingFulfillmentUsd}
                  onChange={(e) => setNum('packagingFulfillmentUsd', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>
            </div>
          </div>

          {/* Processing, Ads, Returns, Guardrails */}
          <div className="rounded-xl border border-[#263449] bg-[#111C2E] p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-[#F8FAFC]">
              03. Fees, Ads, Returns &amp; Margin Targets
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Payment processing rate (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={inputs.processingFeePercent}
                  onChange={(e) => setNum('processingFeePercent', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Fixed processing fee ($)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={inputs.processingFeeFixedUsd}
                  onChange={(e) => setNum('processingFeeFixedUsd', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Ad acquisition cost (CAC / order) ($)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={inputs.cacPerOrderUsd}
                  onChange={(e) => setNum('cacPerOrderUsd', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Full-order refund probability (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={inputs.refundProbabilityPercent}
                  onChange={(e) => setNum('refundProbabilityPercent', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Return shipping + handling / return ($)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={inputs.returnHandlingCostUsd}
                  onChange={(e) => setNum('returnHandlingCostUsd', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Recoverable inventory / return ($)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={inputs.recoverableInventoryValueUsd}
                  onChange={(e) => setNum('recoverableInventoryValueUsd', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Baseline campaign orders (count)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={inputs.projectedOrderCount}
                  onChange={(e) => setNum('projectedOrderCount', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Min acceptable contribution / order ($)</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={inputs.minContributionPerOrderUsd}
                  onChange={(e) => setNum('minContributionPerOrderUsd', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Min acceptable margin (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={inputs.minContributionMarginPercent}
                  onChange={(e) => setNum('minContributionMarginPercent', e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-sm font-semibold hover:bg-[#4AD493] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {saving ? 'Saving profile...' : 'Save store baseline & open dashboard'}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
