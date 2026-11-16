import { ArrowRight, CheckCircle2, FileSpreadsheet, Layers, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DecisionBriefView } from '../components/DecisionBriefView';
import { MarketingLayout } from '../components/MarketingLayout';
import { PRODUCT_CONFIG } from '../config/brand';
import { EXAMPLE_BASELINE_INPUTS } from '../engine/calculator';
import { generateDecisionBrief } from '../engine/decisionEngine';
import { OFFER_PRESETS } from '../engine/presets';

interface FeaturesPageProps {
  brandName?: string;
  isAuthenticated?: boolean;
}

export function FeaturesPage({ brandName, isAuthenticated }: FeaturesPageProps) {
  const activeBrand = brandName || PRODUCT_CONFIG.brandName;
  const sample20Off = OFFER_PRESETS[1].applyToBaseline(EXAMPLE_BASELINE_INPUTS);
  const sampleBrief = generateDecisionBrief(EXAMPLE_BASELINE_INPUTS, sample20Off);

  return (
    <MarketingLayout brandName={activeBrand} isAuthenticated={isAuthenticated}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-16">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-semibold text-[#5EE4A4]">How {activeBrand} works</p>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#F8FAFC]">
            Built around one question: does this promo actually pay off?
          </h1>
          <p className="text-base sm:text-lg text-[#9CAFC6] leading-relaxed">
            Most merchants check revenue and discount percentage, then discover weeks later that
            shipping, payment fees, returns, and paid ads absorbed the profit. {activeBrand} models
            every layer in exact cents before launch.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl border border-[#263449] bg-[#111C2E] space-y-3">
            <Layers className="w-6 h-6 text-[#5EE4A4]" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[#F8FAFC]">
              01. Baseline vs. Up to 3 Offer Scenarios
            </h2>
            <p className="text-sm text-[#9CAFC6] leading-relaxed">
              Test 10% off, 20% off, $10 off, Free Shipping, or Buy 2 Get 1 Free bundles side by
              side. Editing an offer never alters your baseline assumptions.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-[#263449] bg-[#111C2E] space-y-3">
            <ShieldCheck className="w-6 h-6 text-[#5EE4A4]" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[#F8FAFC]">
              02. Deterministic Decision Engine
            </h2>
            <p className="text-sm text-[#9CAFC6] leading-relaxed">
              Every scenario generates a clear Decision Brief explaining what changed financially,
              extra orders required to match baseline profit, your maximum safe discount, and risks
              to inspect.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-[#263449] bg-[#111C2E] space-y-3">
            <SlidersHorizontal className="w-6 h-6 text-[#5EE4A4]" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[#F8FAFC]">
              03. Sensitivity Stress Lab
            </h2>
            <p className="text-sm text-[#9CAFC6] leading-relaxed">
              See what happens if campaign volume shifts -20% / +20%, ad CAC rises +25% or +50%,
              or return probability moves from 0% to 15%.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-[#263449] bg-[#111C2E] space-y-3">
            <FileSpreadsheet className="w-6 h-6 text-[#5EE4A4]" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[#F8FAFC]">
              04. Printable PDF Brief &amp; CSV Export
            </h2>
            <p className="text-sm text-[#9CAFC6] leading-relaxed">
              Export clean single-page Offer Decision Briefs via browser print-to-PDF and download
              structured CSVs of every scenario, assumption, and break-even metric.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-[#F8FAFC]">
                Live Decision Brief Output (Sample Data)
              </h2>
              <p className="text-xs text-[#9CAFC6] mt-0.5">
                Example output for a 20% off promotion on a $60 product with $22 COGS and $12 CAC.
              </p>
            </div>
            <span className="text-xs font-mono text-[#FBBF24]">SAMPLE DATA</span>
          </div>
          <DecisionBriefView brief={sampleBrief} scenarioTitle="20% Off Flash Sale (Sample)" />
        </div>

        <div className="p-8 rounded-xl border border-[#263449] bg-[#111C2E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#F8FAFC]">
              Test your own SKU numbers in under two minutes
            </h2>
            <p className="text-sm text-[#9CAFC6] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#34D399]" aria-hidden="true" />
              Free public calculator requires no account or card.
            </p>
          </div>
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-lg bg-[#5EE4A4] text-[#0B1220] hover:bg-[#4AD493] transition-colors whitespace-nowrap"
          >
            Try the free calculator
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </MarketingLayout>
  );
}
