import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { MarketingLayout } from '../components/MarketingLayout';
import { PRODUCT_CONFIG } from '../config/brand';

interface LegalPageProps {
  brandName?: string;
  supportEmail?: string;
  isAuthenticated?: boolean;
}

function OwnerReviewNotice() {
  if (!PRODUCT_CONFIG.isLegalPlaceholder) return null;
  return (
    <div className="p-4 rounded-xl border border-[#FBBF24]/40 bg-[#FBBF24]/10 text-xs sm:text-sm text-[#FBBF24] flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <strong className="font-semibold">Not Launch-Ready — Owner Review Required:</strong>{' '}
        Replace the bracketed legal entity, registered address, support email, and governing law
        placeholders in central configuration before publishing or accepting live customer payments.
      </div>
    </div>
  );
}

export function PrivacyPage({ brandName, supportEmail, isAuthenticated }: LegalPageProps) {
  const activeBrand = brandName || PRODUCT_CONFIG.brandName;
  const email = supportEmail || PRODUCT_CONFIG.supportEmail;

  return (
    <MarketingLayout brandName={activeBrand} isAuthenticated={isAuthenticated}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
        <OwnerReviewNotice />
        <div className="space-y-2 pb-6 border-b border-[#263449]">
          <h1 className="text-3xl font-extrabold text-[#F8FAFC]">Privacy Policy</h1>
          <p className="text-xs text-[#9CAFC6]">
            Working brand: {activeBrand} · Entity: {PRODUCT_CONFIG.legalEntityName}
          </p>
        </div>

        <div className="space-y-6 text-sm text-[#9CAFC6] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#F8FAFC]">1. Data We Collect</h2>
            <p>
              When you use the public demo calculator without signing in, your inputs remain in
              your browser session and are not stored on our servers. When you create an account,
              we store your authentication identifier, email address, display name, store cost
              profiles, saved promotion scenarios, and verified purchase entitlement status.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#F8FAFC]">2. Payment Data</h2>
            <p>
              We never collect or store payment card numbers. Checkout and payment processing are
              handled exclusively by our configured Merchant of Record / payment provider.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#F8FAFC]">3. Data Export &amp; Deletion</h2>
            <p>
              Signed-in users can export scenarios as CSV at any time and submit a data or account
              deletion request directly from Account Settings or by contacting{' '}
              <span className="text-[#F8FAFC]">{email}</span>.
            </p>
          </section>
        </div>
      </div>
    </MarketingLayout>
  );
}

export function TermsPage({ brandName, isAuthenticated }: LegalPageProps) {
  const activeBrand = brandName || PRODUCT_CONFIG.brandName;

  return (
    <MarketingLayout brandName={activeBrand} isAuthenticated={isAuthenticated}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
        <OwnerReviewNotice />
        <div className="space-y-2 pb-6 border-b border-[#263449]">
          <h1 className="text-3xl font-extrabold text-[#F8FAFC]">Terms of Service</h1>
          <p className="text-xs text-[#9CAFC6]">
            Operator: {PRODUCT_CONFIG.legalEntityName} · Jurisdiction: {PRODUCT_CONFIG.legalJurisdiction}
          </p>
        </div>

        <div className="space-y-6 text-sm text-[#9CAFC6] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#F8FAFC]">1. Estimation Software Disclaimer</h2>
            <p>
              {activeBrand} provides mathematical unit-economics modeling based solely on figures
              and assumptions entered by you. Outputs do not constitute accounting advice, tax
              advice, legal advice, or a guarantee of sales volume or profitability.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#F8FAFC]">2. License &amp; Access</h2>
            <p>
              A verified Pro purchase grants a single-merchant, non-transferable license to use the
              V1 web workspace. You remain solely responsible for verifying pricing, tax, and
              promotion rules inside your e-commerce store before launching campaigns.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#F8FAFC]">3. Governing Law</h2>
            <p>
              These terms are governed by the laws of {PRODUCT_CONFIG.legalJurisdiction}.
            </p>
          </section>
        </div>
      </div>
    </MarketingLayout>
  );
}

export function RefundPolicyPage({ brandName, supportEmail, isAuthenticated }: LegalPageProps) {
  const activeBrand = brandName || PRODUCT_CONFIG.brandName;
  const email = supportEmail || PRODUCT_CONFIG.supportEmail;

  return (
    <MarketingLayout brandName={activeBrand} isAuthenticated={isAuthenticated}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
        <OwnerReviewNotice />
        <div className="space-y-2 pb-6 border-b border-[#263449]">
          <h1 className="text-3xl font-extrabold text-[#F8FAFC]">Refund Policy</h1>
          <p className="text-xs text-[#9CAFC6]">
            Applies to one-time digital purchases of {activeBrand} Pro
          </p>
        </div>

        <div className="space-y-6 text-sm text-[#9CAFC6] leading-relaxed">
          <p>
            [OWNER REVIEW REQUIRED: Confirm your final refund window, e.g., 14-day refund if the
            software fails to work as documented or does not meet expectations, aligned with your
            payment provider / Merchant of Record rules.]
          </p>
          <p>
            To request a refund with your order ID, contact{' '}
            <span className="text-[#F8FAFC]">{email}</span>. Approved refunds revoke Pro access
            automatically when processed through our payment provider webhook.
          </p>
        </div>
      </div>
    </MarketingLayout>
  );
}

export function ContactPage({ brandName, supportEmail, isAuthenticated }: LegalPageProps) {
  const activeBrand = brandName || PRODUCT_CONFIG.brandName;
  const email = supportEmail || PRODUCT_CONFIG.supportEmail;
  const [name, setName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !senderEmail.trim() || !message.trim()) return;
    setSubmitted(true);
  };

  return (
    <MarketingLayout brandName={activeBrand} isAuthenticated={isAuthenticated}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
        <OwnerReviewNotice />
        <div className="space-y-2 pb-6 border-b border-[#263449]">
          <h1 className="text-3xl font-extrabold text-[#F8FAFC]">Contact &amp; Support</h1>
          <p className="text-sm text-[#9CAFC6]">
            Direct support email: <span className="text-[#F8FAFC] font-mono">{email}</span> ·{' '}
            {PRODUCT_CONFIG.businessAddressPlaceholder}
          </p>
        </div>

        {submitted ? (
          <div className="p-6 rounded-xl border border-[#34D399]/40 bg-[#34D399]/10 space-y-2">
            <div className="flex items-center gap-2 text-[#34D399] font-semibold">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              <span>Support message prepared</span>
            </div>
            <p className="text-sm text-[#9CAFC6]">
              Because an external transactional email provider is not yet connected in this
              environment, please send your inquiry directly to{' '}
              <a href={`mailto:${email}`} className="text-[#5EE4A4] underline">
                {email}
              </a>
              .
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-6 rounded-xl border border-[#263449] bg-[#111C2E] space-y-4"
          >
            <label className="block">
              <span className="text-xs font-medium text-[#9CAFC6]">Your name</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[#9CAFC6]">Email address</span>
              <input
                type="email"
                required
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[#9CAFC6]">Question or order ID</span>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
              />
            </label>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#5EE4A4] text-[#0B1220] hover:bg-[#4AD493] transition-colors cursor-pointer"
            >
              Prepare support inquiry
            </button>
          </form>
        )}
      </div>
    </MarketingLayout>
  );
}
