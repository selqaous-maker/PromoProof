import {
  calculateScenario,
  compareAgainstBaseline,
  computeDiscountSafetyThreshold,
  formatPercent,
  formatUsd,
} from './calculator';
import {
  BaselineComparison,
  DecisionBrief,
  DecisionStatus,
  PromotionInputs,
} from './types';

/**
 * Deterministic Decision Engine.
 * Produces transparent, auditable mathematical explanations and actionable risk checks
 * without claiming AI inference or guaranteeing future demand.
 */
export function generateDecisionBrief(
  baselineInputs: PromotionInputs,
  offerInputs: PromotionInputs
): DecisionBrief {
  const baseline = calculateScenario(baselineInputs);
  const offer = calculateScenario(offerInputs);
  const comparison: BaselineComparison = compareAgainstBaseline(baseline, offer);
  const safety = computeDiscountSafetyThreshold(baselineInputs);

  const contribUsd = offer.usd.expectedContributionPerOrder;
  const contribCents = offer.cents.expectedContributionPerOrder;
  const marginPct = offer.contributionMarginPercent;
  const marginSacrificedPoints =
    comparison.marginDeltaPoints !== null ? -comparison.marginDeltaPoints : null;

  const meetsContrib = offer.meetsMinContributionThreshold;
  const meetsMargin = offer.meetsMinMarginThreshold;

  let status: DecisionStatus = 'healthy';
  let headline = '';

  if (contribCents <= 0) {
    status = 'critical';
    headline = `Do not launch as modeled: each order generates ${formatUsd(contribUsd)} contribution.`;
  } else if (!meetsContrib || !meetsMargin) {
    status = 'caution';
    headline = `Margin breach: ${formatUsd(contribUsd)}/order falls below your ${formatUsd(
      offerInputs.minContributionPerOrderUsd
    )} or ${offerInputs.minContributionMarginPercent}% target.`;
  } else if (comparison.extraOrdersPercent !== null && comparison.extraOrdersPercent > 50) {
    status = 'caution';
    headline = `High volume dependency: requires +${comparison.extraOrdersPercent.toFixed(
      1
    )}% more orders just to match baseline contribution.`;
  } else {
    status = 'healthy';
    headline = `Within guardrails: ${formatUsd(contribUsd)}/order (${formatPercent(
      marginPct
    )} margin) clears your minimum contribution floor.`;
  }

  // 1. What changed financially
  const whatChanged: string[] = [];
  const chargedDiff = offer.usd.customerAmountCharged - baseline.usd.customerAmountCharged;
  if (offer.usd.discountAmount > 0) {
    whatChanged.push(
      `Merchandise discount removes ${formatUsd(offer.usd.discountAmount)} per order from product revenue.`
    );
  }
  if (
    offerInputs.offerType === 'free_shipping' &&
    baseline.usd.effectiveCustomerShipping > 0
  ) {
    whatChanged.push(
      `Free shipping removes ${formatUsd(
        baseline.usd.effectiveCustomerShipping
      )} of customer shipping revenue while you still pay ${formatUsd(
        offerInputs.merchantOutboundShippingUsd
      )} outbound shipping.`
    );
  }
  if (offerInputs.bonusUnitsPerOrder > baselineInputs.bonusUnitsPerOrder) {
    const cogsDiff = offerInputs.totalOrderCogsUsd - baselineInputs.totalOrderCogsUsd;
    whatChanged.push(
      `Bundle adds ${
        offerInputs.bonusUnitsPerOrder - baselineInputs.bonusUnitsPerOrder
      } bonus unit(s) per order${
        cogsDiff > 0 ? `, increasing total order COGS by ${formatUsd(cogsDiff)}` : ''
      }.`
    );
  }
  const feeDiff = offer.usd.processingFee - baseline.usd.processingFee;
  if (Math.abs(feeDiff) >= 0.01) {
    whatChanged.push(
      `Payment processing fees ${feeDiff < 0 ? 'drop' : 'rise'} by ${formatUsd(
        Math.abs(feeDiff)
      )} per order due to the ${chargedDiff < 0 ? 'lower' : 'higher'} amount charged.`
    );
  }
  if (offerInputs.fixedCampaignCostUsd > baselineInputs.fixedCampaignCostUsd) {
    whatChanged.push(
      `Fixed campaign setup spend adds ${formatUsd(
        offerInputs.fixedCampaignCostUsd - baselineInputs.fixedCampaignCostUsd
      )} that must be recovered before campaign profit.`
    );
  }
  if (whatChanged.length === 0) {
    whatChanged.push(
      `Total customer amount charged changes by ${formatUsd(chargedDiff, {
        showSign: true,
      })} per order compared to baseline.`
    );
  }

  // 2. Assumptions behind the math
  const assumptionsUsed: string[] = [
    `Per-order CAC stays fixed at ${formatUsd(offerInputs.cacPerOrderUsd)} across ${offerInputs.projectedOrderCount.toLocaleString(
      'en-US'
    )} projected orders.`,
    `Full-order refund model at ${offerInputs.refundProbabilityPercent}% probability with ${formatUsd(
      offerInputs.returnHandlingCostUsd
    )} return handling cost and ${formatUsd(
      Math.min(offerInputs.totalOrderCogsUsd, offerInputs.recoverableInventoryValueUsd)
    )} recovered inventory value per return.`,
    `Payment processing fees (${offerInputs.processingFeePercent}% + ${formatUsd(
      offerInputs.processingFeeFixedUsd
    )}) are modeled as nonrefundable on refunded orders.`,
    `Excludes sales tax/VAT, fixed business overhead, and chargeback fees.`,
  ];

  // 3. Risk factors to investigate
  const riskFactors: string[] = [];
  if (contribCents <= 0) {
    riskFactors.push(
      'Negative unit economics: every incremental order increases your net loss; higher conversion volume makes the campaign worse.'
    );
  }
  if (comparison.extraOrdersPercent !== null && comparison.extraOrdersPercent > 35) {
    riskFactors.push(
      `Volume break-even hurdle is steep (+${comparison.extraOrdersPercent.toFixed(
        1
      )}% orders). Verify whether your traffic and email list can realistically sustain that lift without driving CAC up.`
    );
  }
  if (marginPct !== null && marginPct < 15 && contribCents > 0) {
    riskFactors.push(
      `Thin contribution buffer (${formatPercent(
        marginPct
      )}): a modest spike in ad CPA or return rate could push orders negative.`
    );
  }
  if (offerInputs.refundProbabilityPercent >= 8) {
    riskFactors.push(
      `Elevated return exposure (${offerInputs.refundProbabilityPercent}%): promotional buyers sometimes return at higher rates—stress-test +5% refunds in the Sensitivity Lab.`
    );
  }
  if (offerInputs.cacPerOrderUsd > 0 && offerInputs.fixedCampaignCostUsd > 0) {
    riskFactors.push(
      'Double-counting check: ensure creative/setup spend in Fixed Campaign Cost does not duplicate paid ad spend already inside per-order CAC.'
    );
  }
  if (riskFactors.length === 0) {
    riskFactors.push(
      'Primary execution risk is CAC inflation if scaling paid spend to achieve projected order volume.'
    );
  }

  // 4. Deterministic alternative strategy worth testing
  let alternativeStrategy = {
    title: 'Test a smaller discount inside your safety guardrail',
    rationale: '',
    projectedContributionPerOrderUsd: null as number | null,
  };

  if (safety.alreadyBelowTargetAtZeroDiscount) {
    alternativeStrategy = {
      title: 'Fix baseline unit economics before discounting',
      rationale: `Even at 0% discount, baseline contribution (${formatUsd(
        safety.atZeroDiscountContributionUsd
      )}) is below your ${formatUsd(
        offerInputs.minContributionPerOrderUsd
      )} floor. Test raising AOV with a 2-unit bundle or lowering shipping/CAC costs before running a price cut.`,
      projectedContributionPerOrderUsd: safety.atZeroDiscountContributionUsd,
    };
  } else if (offerInputs.offerType === 'percent_discount' && offerInputs.discountPercent > safety.maxSafeDiscountPercent) {
    const safePct = Math.max(5, Math.floor(safety.maxSafeDiscountPercent));
    const altCalc = calculateScenario({
      ...baselineInputs,
      offerType: 'percent_discount',
      discountPercent: safePct,
    });
    alternativeStrategy = {
      title: `Cap percentage discount at ${safePct}% off (within safety threshold)`,
      rationale: `Your maximum discount that still meets your ${formatUsd(
        offerInputs.minContributionPerOrderUsd
      )} target is ${safety.maxSafeDiscountPercent.toFixed(
        1
      )}%. Testing ${safePct}% off preserves ${formatUsd(
        altCalc.usd.expectedContributionPerOrder
      )}/order instead of ${formatUsd(contribUsd)}/order.`,
      projectedContributionPerOrderUsd: altCalc.usd.expectedContributionPerOrder,
    };
  } else if (
    offerInputs.offerType !== 'free_shipping' &&
    baselineInputs.customerShippingRevenueUsd > 0
  ) {
    const freeShipCalc = calculateScenario({
      ...baselineInputs,
      offerType: 'free_shipping',
      discountPercent: 0,
      discountFixedUsd: 0,
    });
    if (freeShipCalc.cents.expectedContributionPerOrder > contribCents) {
      alternativeStrategy = {
        title: 'Test Free Shipping instead of a merchandise discount',
        rationale: `Absorbing ${formatUsd(
          baselineInputs.customerShippingRevenueUsd
        )} shipping yields ${formatUsd(
          freeShipCalc.usd.expectedContributionPerOrder
        )}/order—saving ${formatUsd(
          freeShipCalc.usd.expectedContributionPerOrder - contribUsd
        )} per order over this offer.`,
        projectedContributionPerOrderUsd: freeShipCalc.usd.expectedContributionPerOrder,
      };
    } else {
      const b2g1Calc = calculateScenario({
        ...baselineInputs,
        offerType: 'bundle',
        paidUnitsPerOrder: Math.max(2, baselineInputs.paidUnitsPerOrder * 2),
        bonusUnitsPerOrder: 1,
        totalOrderCogsUsd: baselineInputs.totalOrderCogsUsd * 3,
      });
      alternativeStrategy = {
        title: 'Test a Buy 2 Get 1 bundle to lift order revenue',
        rationale: `Bundling spreads fixed shipping, packaging, and CAC across multiple units, producing an estimated ${formatUsd(
          b2g1Calc.usd.expectedContributionPerOrder
        )}/order if you collect 2x unit price (adjust bundle COGS to match your SKU cost).`,
        projectedContributionPerOrderUsd: b2g1Calc.usd.expectedContributionPerOrder,
      };
    }
  } else {
    const b2g1Calc = calculateScenario({
      ...baselineInputs,
      offerType: 'bundle',
      paidUnitsPerOrder: Math.max(2, baselineInputs.paidUnitsPerOrder * 2),
      bonusUnitsPerOrder: 1,
      totalOrderCogsUsd: baselineInputs.totalOrderCogsUsd * 3,
    });
    alternativeStrategy = {
      title: 'Test a multi-unit bundle (e.g., Buy 2 Get 1)',
      rationale: `Amortizing CAC (${formatUsd(offerInputs.cacPerOrderUsd)}) and fulfillment across 3 units keeps total contribution per checkout higher (${formatUsd(
        b2g1Calc.usd.expectedContributionPerOrder
      )}/order estimated at 3x unit COGS).`,
      projectedContributionPerOrderUsd: b2g1Calc.usd.expectedContributionPerOrder,
    };
  }

  const thresholdSummary = safety.alreadyBelowTargetAtZeroDiscount
    ? `Baseline contribution (${formatUsd(
        safety.atZeroDiscountContributionUsd
      )}) is already below your ${formatUsd(
        offerInputs.minContributionPerOrderUsd
      )} minimum target before any discount.`
    : `${
        meetsContrib ? 'Meets' : 'Falls below'
      } your ${formatUsd(offerInputs.minContributionPerOrderUsd)}/order floor. Maximum discount keeping that floor under current assumptions is ${safety.maxSafeDiscountPercent.toFixed(
        1
      )}% (${formatUsd(safety.maxSafeDiscountFixedUsd)}).`;

  const nextCheck =
    contribCents <= 0
      ? 'Lower the discount depth or switch to a multi-unit bundle until per-order contribution is clearly positive, then verify Sensitivity Lab under +25% CAC.'
      : 'Open the Sensitivity Lab to verify this scenario holds if CAC rises +25% or refunds climb to 10% before exporting your offer brief.';

  return {
    status,
    headline,
    whatChanged,
    financialSummary: {
      estimatedContributionPerOrderUsd: contribUsd,
      marginSacrificedPoints,
      contributionReductionPercent:
        comparison.profitChangePercent !== null ? -comparison.profitChangePercent : null,
      additionalOrdersRequired: comparison.extraOrdersRequired,
      additionalOrdersPercent: comparison.extraOrdersPercent,
    },
    assumptionsUsed,
    thresholdAssessment: {
      meetsContributionTarget: meetsContrib,
      meetsMarginTarget: meetsMargin,
      targetContributionUsd: offerInputs.minContributionPerOrderUsd,
      targetMarginPercent: offerInputs.minContributionMarginPercent,
      maxSafeDiscountPercent: safety.maxSafeDiscountPercent,
      maxSafeDiscountUsd: safety.maxSafeDiscountFixedUsd,
      summary: thresholdSummary,
    },
    riskFactors,
    alternativeStrategy,
    nextCheck,
    methodologyNote:
      'Mathematical conclusions above are computed deterministically from your entered unit economics. Volume lift and conversion rates remain uncertain market outcomes—never guaranteed.',
  };
}
