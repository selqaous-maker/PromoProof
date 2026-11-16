import { AlertTriangle, CheckCircle2, Download, ShieldCheck, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { EXAMPLE_BASELINE_INPUTS } from '../engine/calculator';
import { buildScenariosCsv, triggerCsvDownload } from '../engine/csvExport';
import {
  createDeletionRequest,
  saveAdminSettings,
  updateUserProfile,
} from '../lib/firestoreRepo';

export function SettingsPage() {
  const {
    user,
    profile,
    stores,
    costProfiles,
    scenarios,
    entitlements,
    hasProEntitlement,
    isAdmin,
    publicConfig,
    refreshPublicConfig,
    signOut,
  } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [profileSaved, setProfileSaved] = useState(false);

  const [delReason, setDelReason] = useState('');
  const [delSubmitted, setDelSubmitted] = useState(false);

  // Admin state
  const [brandName, setBrandName] = useState(publicConfig.brandName);
  const [regularPriceUsd, setRegularPriceUsd] = useState(publicConfig.regularPriceUsd);
  const [promoPriceStr, setPromoPriceStr] = useState(
    publicConfig.activePromoPriceUsd ? String(publicConfig.activePromoPriceUsd) : ''
  );
  const [promoLabel, setPromoLabel] = useState(publicConfig.activePromoLabel || '');
  const [supportEmail, setSupportEmail] = useState(publicConfig.supportEmail);
  const [checkoutProvider, setCheckoutProvider] = useState(publicConfig.checkoutProvider);
  const [adminSaved, setAdminSaved] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.displayName) setDisplayName(profile.displayName);
  }, [profile?.displayName]);

  useEffect(() => {
    setBrandName(publicConfig.brandName);
    setRegularPriceUsd(publicConfig.regularPriceUsd);
    setPromoPriceStr(publicConfig.activePromoPriceUsd ? String(publicConfig.activePromoPriceUsd) : '');
    setPromoLabel(publicConfig.activePromoLabel || '');
    setSupportEmail(publicConfig.supportEmail);
    setCheckoutProvider(publicConfig.checkoutProvider);
  }, [publicConfig]);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileSaved(false);
    await updateUserProfile(user.uid, { displayName });
    setProfileSaved(true);
  };

  const handleExportAllData = () => {
    const activeStore = stores[0];
    const baselineDoc = scenarios.find((s) => s.offerType === 'baseline');
    const baselineInputs =
      baselineDoc?.inputSnapshot || costProfiles[0]?.inputs || EXAMPLE_BASELINE_INPUTS;
    const offers = scenarios
      .filter((s) => s.id !== baselineDoc?.id)
      .map((s) => ({ title: s.title, isSample: s.isSample, inputs: s.inputSnapshot }));
    const csv = buildScenariosCsv(
      baselineDoc?.title || 'Baseline',
      baselineInputs,
      offers,
      activeStore?.name
    );
    triggerCsvDownload('account-scenarios-export.csv', csv);
  };

  const handleDeletionRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await createDeletionRequest(user.uid, user.email || '', delReason);
    setDelSubmitted(true);
  };

  const handleSaveAdmin = async (e: FormEvent) => {
    e.preventDefault();
    setAdminSaved(null);
    setAdminError(null);
    try {
      const parsedPromo = promoPriceStr.trim() ? Number(promoPriceStr) : null;
      await saveAdminSettings({
        brandName,
        regularPriceUsd,
        activePromoPriceUsd: parsedPromo,
        activePromoLabel: promoLabel.trim() || null,
        supportEmail,
        checkoutProvider,
        checkoutConnected: publicConfig.checkoutConnected,
      });
      await refreshPublicConfig();
      setAdminSaved('Global brand & pricing settings saved to Firestore.');
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Unable to save admin settings.');
    }
  };

  return (
    <AppShell title="Account & Settings" subtitle="Profile preferences, verified entitlement status, and data controls">
      <div className="space-y-6 max-w-4xl">
        {/* Account Preferences */}
        <form
          onSubmit={handleSaveProfile}
          className="rounded-xl border border-[#263449] bg-[#111C2E] p-6 space-y-4"
        >
          <h2 className="text-base font-bold text-[#F8FAFC]">Account Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-medium text-[#9CAFC6]">Display name</span>
              <input
                type="text"
                maxLength={120}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[#9CAFC6]">Account email</span>
              <input
                type="text"
                readOnly
                value={user?.email || ''}
                className="mt-1.5 w-full rounded-lg bg-[#0B1220]/60 border border-[#263449] px-3 py-2.5 text-sm text-[#9CAFC6]"
              />
            </label>
          </div>
          <div className="flex items-center justify-between gap-4">
            {profileSaved ? (
              <span className="text-xs text-[#34D399] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                Saved
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-xs font-semibold hover:bg-[#4AD493] cursor-pointer"
            >
              Save profile
            </button>
          </div>
        </form>

        {/* Entitlement & Billing Status */}
        <section className="rounded-xl border border-[#263449] bg-[#111C2E] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#F8FAFC]">
                {publicConfig.brandName} Entitlement Status
              </h2>
              <p className="text-xs text-[#9CAFC6] mt-0.5">
                Verified server-side from confirmed payment webhooks.
              </p>
            </div>
            {hasProEntitlement ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-[#34D399]/40 bg-[#34D399]/10 text-xs font-semibold text-[#34D399]">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                Pro Entitlement Active
              </span>
            ) : isAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-[#5EE4A4]/40 bg-[#5EE4A4]/10 text-xs font-semibold text-[#5EE4A4]">
                Owner Admin Access
              </span>
            ) : (
              <Link
                to="/pricing"
                className="px-4 py-2 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-xs font-semibold hover:bg-[#4AD493]"
              >
                Upgrade to Pro (${publicConfig.activePromoPriceUsd ?? publicConfig.regularPriceUsd})
              </Link>
            )}
          </div>

          {entitlements.length > 0 ? (
            <div className="text-xs text-[#9CAFC6] space-y-1 font-mono">
              {entitlements.map((ent) => (
                <p key={ent.id}>
                  Order {ent.providerOrderId} · {ent.provider} · Status: {ent.status}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#9CAFC6]">
              No customer purchase order recorded on this account yet.
            </p>
          )}
        </section>

        {/* Data Export & Deletion Request */}
        <section className="rounded-xl border border-[#263449] bg-[#111C2E] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#263449]">
            <div>
              <h2 className="text-base font-bold text-[#F8FAFC]">Your Data &amp; Privacy</h2>
              <p className="text-xs text-[#9CAFC6] mt-0.5">
                Export your modeled scenarios or submit a data/account deletion request.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportAllData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#263449] text-xs font-semibold text-[#F8FAFC] hover:bg-[#0B1220] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Export Scenarios CSV
            </button>
          </div>

          {delSubmitted ? (
            <div className="p-4 rounded-lg border border-[#34D399]/40 bg-[#34D399]/10 text-xs text-[#34D399]">
              Deletion request logged for <strong>{user?.email}</strong>. You may sign out below.
            </div>
          ) : (
            <form onSubmit={handleDeletionRequest} className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">
                  Request account &amp; data deletion (optional reason)
                </span>
                <input
                  type="text"
                  maxLength={500}
                  placeholder="Optional note..."
                  value={delReason}
                  onChange={(e) => setDelReason(e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FB7185]"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#FB7185]/50 text-xs font-semibold text-[#FB7185] hover:bg-[#FB7185]/10 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Submit deletion request
                </button>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-xs text-[#9CAFC6] hover:text-[#F8FAFC] cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Owner-Only Admin Panel */}
        {isAdmin && (
          <section className="rounded-xl border border-[#5EE4A4]/40 bg-[#111C2E] p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#263449]">
              <div>
                <p className="text-xs font-semibold text-[#5EE4A4]">Owner Admin Controls</p>
                <h2 className="text-lg font-bold text-[#F8FAFC]">
                  Brand, Pricing &amp; Checkout Readiness
                </h2>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-semibold ${
                  publicConfig.checkoutConnected
                    ? 'text-[#34D399] border-[#34D399]/40 bg-[#34D399]/10'
                    : 'text-[#FBBF24] border-[#FBBF24]/40 bg-[#FBBF24]/10'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                {publicConfig.checkoutConnected
                  ? 'Checkout Connected'
                  : 'Checkout Not Yet Connected'}
              </span>
            </div>

            {adminError && (
              <p className="text-xs text-[#FB7185]">{adminError}</p>
            )}
            {adminSaved && (
              <p className="text-xs text-[#34D399]">{adminSaved}</p>
            )}

            <form onSubmit={handleSaveAdmin} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-medium text-[#9CAFC6]">
                    Public brand name (replaces working name)
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm text-[#F8FAFC]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-[#9CAFC6]">Support contact email</span>
                  <input
                    type="email"
                    required
                    maxLength={254}
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm text-[#F8FAFC]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-[#9CAFC6]">Regular one-time price (USD)</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={regularPriceUsd}
                    onChange={(e) => setRegularPriceUsd(Number(e.target.value) || 79)}
                    className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm font-mono text-[#F8FAFC]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-[#9CAFC6]">
                    Optional active promo price (USD, leave blank for none)
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="None"
                    value={promoPriceStr}
                    onChange={(e) => setPromoPriceStr(e.target.value)}
                    className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm font-mono text-[#F8FAFC]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-[#9CAFC6]">Promo offer label (optional)</span>
                  <input
                    type="text"
                    maxLength={80}
                    placeholder="e.g. Launch Offer"
                    value={promoLabel}
                    onChange={(e) => setPromoLabel(e.target.value)}
                    className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm text-[#F8FAFC]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-[#9CAFC6]">Payment provider adapter</span>
                  <select
                    value={checkoutProvider}
                    onChange={(e) => setCheckoutProvider(e.target.value)}
                    className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2 text-sm text-[#F8FAFC]"
                  >
                    <option value="lemonsqueezy">Lemon Squeezy (Recommended)</option>
                    <option value="stripe">Stripe</option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-xs font-semibold hover:bg-[#4AD493] cursor-pointer"
              >
                Save global settings
              </button>
            </form>

            <div className="p-4 rounded-lg bg-[#0B1220] border border-[#263449] text-xs text-[#9CAFC6] space-y-2">
              <strong className="text-[#F8FAFC] block">
                Owner Checkout &amp; Webhook Setup Checklist
              </strong>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Webhook endpoint URL:{' '}
                  <code className="text-[#5EE4A4]">{window.location.origin}/api/webhooks/lemonsqueezy</code>
                </li>
                <li>
                  Configure server secrets in AI Studio Secrets panel:{' '}
                  <code>LEMON_SQUEEZY_CHECKOUT_URL</code> (or <code>LEMON_SQUEEZY_API_KEY</code> +{' '}
                  <code>LEMON_SQUEEZY_VARIANT_ID</code>), <code>LEMON_SQUEEZY_WEBHOOK_SECRET</code>,
                  and <code>FIREBASE_SERVICE_ACCOUNT_JSON</code>.
                </li>
                <li>
                  Set your final legal entity name, address, support email, and refund policy before
                  enabling live checkout.
                </li>
              </ul>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
