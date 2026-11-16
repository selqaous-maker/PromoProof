import {
  BaselineComparison,
  PromotionInputs,
  SafetyThresholdResult,
  ScenarioCalculation,
  ValidationIssue,
} from './types';

/**
 * Default inputs representing a clear, editable example SKU.
 * Never confuse these example defaults with real user-submitted store data.
 */
export const EXAMPLE_BASELINE_INPUTS: PromotionInputs = {
  unitListPriceUsd: 60,
  paidUnitsPerOrder: 1,
  bonusUnitsPerOrder: 0,
  totalOrderCogsUsd: 22,
  offerType: 'baseline',
  discountPercent: 0,
  discountFixedUsd: 0,
  customerShippingRevenueUsd: 6,
  merchantOutboundShippingUsd: 7,
  packagingFulfillmentUsd: 2.5,
  processingFeePercent: 2.9,
  processingFeeFixedUsd: 0.3,
  cacPerOrderUsd: 12,
  refundProbabilityPercent: 4,
  shippingRefundFractionPercent: 100,
  returnHandlingCostUsd: 8,
  recoverableInventoryValueUsd: 0,
  projectedOrderCount: 250,
  fixedCampaignCostUsd: 0,
  minContributionPerOrderUsd: 10,
  minContributionMarginPercent: 15,
};

/**
 * Safely convert USD number to integer cents without IEEE-754 drift.
 */
export function usdToCents(usd: number): number {
  if (!Number.isFinite(usd)) {
    return 0;
  }
  return Math.round(Number(usd.toFixed(4)) * 100);
}

/**
 * Convert cents back to USD rounded to nearest cent for display/export.
 */
export function centsToUsd(cents: number): number {
  if (!Number.isFinite(cents)) {
    return 0;
  }
  const val = Math.round(cents) / 100;
  return val === 0 ? 0 : val;
}

/**
 * Round a fractional cent value to nearest whole cent for display.
 */
export function roundCentsForDisplay(cents: number): number {
  if (!Number.isFinite(cents)) {
    return 0;
  }
  return Math.round(cents);
}

export function formatUsd(usd: number | null, options?: { showSign?: boolean }): string {
  if (usd === null || !Number.isFinite(usd)) {
    return 'N/A';
  }
  const sign = usd < 0 ? -1 : 1;
  const roundedAbs = Math.round((Math.abs(usd) + 1e-9) * 100) / 100;
  const absFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundedAbs);

  if (roundedAbs === 0) {
    return absFormatted;
  }
  if (sign < 0) {
    return `-${absFormatted}`;
  }
  if (options?.showSign) {
    return `+${absFormatted}`;
  }
  return absFormatted;
}

export function formatPercent(value: number | null, decimals = 1, showSign = false): string {
  if (value === null || !Number.isFinite(value)) {
    return 'N/A';
  }
  const fixed = Math.abs(value).toFixed(decimals);
  if (value < 0) {
    return `-${fixed}%`;
  }
  if (showSign && value > 0) {
    return `+${fixed}%`;
  }
  return `${fixed}%`;
}

export function validatePromotionInputs(inputs: PromotionInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const checkNonNegative = (field: keyof PromotionInputs, val: number, label: string) => {
    if (!Number.isFinite(val)) {
      issues.push({ field, severity: 'error', message: `${label} must be a valid number.` });
    } else if (val < 0) {
      issues.push({ field, severity: 'error', message: `${label} cannot be negative.` });
    }
  };

  checkNonNegative('unitListPriceUsd', inputs.unitListPriceUsd, 'Unit list price');
  checkNonNegative('totalOrderCogsUsd', inputs.totalOrderCogsUsd, 'Total order COGS');
  checkNonNegative('discountFixedUsd', inputs.discountFixedUsd, 'Fixed discount');
  checkNonNegative('customerShippingRevenueUsd', inputs.customerShippingRevenueUsd, 'Customer shipping charged');
  checkNonNegative('merchantOutboundShippingUsd', inputs.merchantOutboundShippingUsd, 'Merchant outbound shipping');
  checkNonNegative('packagingFulfillmentUsd', inputs.packagingFulfillmentUsd, 'Packaging & fulfillment');
  checkNonNegative('processingFeeFixedUsd', inputs.processingFeeFixedUsd, 'Fixed processing fee');
  checkNonNegative('cacPerOrderUsd', inputs.cacPerOrderUsd, 'Acquisition cost (CAC)');
  checkNonNegative('returnHandlingCostUsd', inputs.returnHandlingCostUsd, 'Return handling cost');
  checkNonNegative('recoverableInventoryValueUsd', inputs.recoverableInventoryValueUsd, 'Recoverable inventory value');
  checkNonNegative('fixedCampaignCostUsd', inputs.fixedCampaignCostUsd, 'Fixed campaign cost');

  if (!Number.isFinite(inputs.paidUnitsPerOrder) || inputs.paidUnitsPerOrder < 1 || !Number.isInteger(inputs.paidUnitsPerOrder)) {
    issues.push({
      field: 'paidUnitsPerOrder',
      severity: 'error',
      message: 'Paid units per order must be a whole number of at least 1.',
    });
  }

  if (!Number.isFinite(inputs.bonusUnitsPerOrder) || inputs.bonusUnitsPerOrder < 0 || !Number.isInteger(inputs.bonusUnitsPerOrder)) {
    issues.push({
      field: 'bonusUnitsPerOrder',
      severity: 'error',
      message: 'Bonus/free units per order must be a whole number (0 or greater).',
    });
  }

  if (!Number.isFinite(inputs.projectedOrderCount) || inputs.projectedOrderCount < 0 || !Number.isInteger(inputs.projectedOrderCount)) {
    issues.push({
      field: 'projectedOrderCount',
      severity: 'error',
      message: 'Projected placed orders must be a whole number (0 or greater).',
    });
  }

  const checkRate = (field: keyof PromotionInputs, val: number, label: string) => {
    if (!Number.isFinite(val) || val < 0 || val > 100) {
      issues.push({
        field,
        severity: 'error',
        message: `${label} must be between 0% and 100%.`,
      });
    }
  };

  checkRate('discountPercent', inputs.discountPercent, 'Discount percentage');
  checkRate('processingFeePercent', inputs.processingFeePercent, 'Processing fee percentage');
  checkRate('refundProbabilityPercent', inputs.refundProbabilityPercent, 'Refund probability');
  checkRate('shippingRefundFractionPercent', inputs.shippingRefundFractionPercent, 'Shipping refund fraction');

  if (
    Number.isFinite(inputs.recoverableInventoryValueUsd) &&
    Number.isFinite(inputs.totalOrderCogsUsd) &&
    inputs.recoverableInventoryValueUsd > inputs.totalOrderCogsUsd
  ) {
    issues.push({
      field: 'recoverableInventoryValueUsd',
      severity: 'warning',
      message: 'Recoverable inventory value exceeds COGS and is capped at total order COGS in calculations.',
    });
  }

  const subtotal = Math.max(0, inputs.unitListPriceUsd) * Math.max(1, Math.floor(inputs.paidUnitsPerOrder || 1));
  if (inputs.offerType === 'fixed_discount' && inputs.discountFixedUsd > subtotal) {
    issues.push({
      field: 'discountFixedUsd',
      severity: 'warning',
      message: `Fixed discount exceeds merchandise subtotal (${formatUsd(subtotal)}) and is capped at the eligible subtotal.`,
    });
  }

  if (inputs.bonusUnitsPerOrder > 0 && inputs.totalOrderCogsUsd === 0) {
    issues.push({
      field: 'totalOrderCogsUsd',
      severity: 'warning',
      message: 'Bundle includes bonus units with $0 total COGS—verify all shipped units are included in COGS.',
    });
  }

  return issues;
}

/**
 * Pure deterministic calculation for a single promotion or baseline scenario.
 * Uses integer-cents arithmetic for monetary inputs and settled charges,
 * preserving full precision in expected-value return multipliers and rounding
 * only at documented display/settlement boundaries.
 */
export function calculateScenario(rawInputs: PromotionInputs): ScenarioCalculation {
  const validationIssues = validatePromotionInputs(rawInputs);
  const hasErrors = validationIssues.some((i) => i.severity === 'error');

  // Sanitize bounds safely without hiding warnings
  const paidUnits = Math.max(1, Math.floor(Number.isFinite(rawInputs.paidUnitsPerOrder) ? rawInputs.paidUnitsPerOrder : 1));
  const bonusUnits = Math.max(0, Math.floor(Number.isFinite(rawInputs.bonusUnitsPerOrder) ? rawInputs.bonusUnitsPerOrder : 0));
  const projectedOrders = Math.max(0, Math.floor(Number.isFinite(rawInputs.projectedOrderCount) ? rawInputs.projectedOrderCount : 0));

  const unitListPriceCents = Math.max(0, usdToCents(rawInputs.unitListPriceUsd));
  const listMerchandiseSubtotalCents = unitListPriceCents * paidUnits;
  const fullRetailShippedValueCents = unitListPriceCents * (paidUnits + bonusUnits);

  const clampedDiscountPct = Math.min(100, Math.max(0, Number.isFinite(rawInputs.discountPercent) ? rawInputs.discountPercent : 0));
  const requestedFixedCents = Math.max(0, usdToCents(rawInputs.discountFixedUsd));

  let discountAmountCents = 0;
  if (rawInputs.offerType === 'percent_discount') {
    discountAmountCents = Math.round(listMerchandiseSubtotalCents * (clampedDiscountPct / 100));
  } else if (rawInputs.offerType === 'fixed_discount') {
    discountAmountCents = Math.min(listMerchandiseSubtotalCents, requestedFixedCents);
  } else if (rawInputs.offerType === 'bundle') {
    if (clampedDiscountPct > 0) {
      discountAmountCents = Math.round(listMerchandiseSubtotalCents * (clampedDiscountPct / 100));
    } else if (requestedFixedCents > 0) {
      discountAmountCents = Math.min(listMerchandiseSubtotalCents, requestedFixedCents);
    }
  }

  const productRevenueChargedCents = listMerchandiseSubtotalCents - discountAmountCents;

  const baseCustomerShippingCents = Math.max(0, usdToCents(rawInputs.customerShippingRevenueUsd));
  const effectiveCustomerShippingCents =
    rawInputs.offerType === 'free_shipping' ? 0 : baseCustomerShippingCents;

  const customerAmountChargedCents = productRevenueChargedCents + effectiveCustomerShippingCents;

  const processingRate = Math.min(100, Math.max(0, Number.isFinite(rawInputs.processingFeePercent) ? rawInputs.processingFeePercent : 0)) / 100;
  const processingFixedCents = Math.max(0, usdToCents(rawInputs.processingFeeFixedUsd));
  const processingFeeCents = Math.round(customerAmountChargedCents * processingRate) + processingFixedCents;

  const totalOrderCogsCents = Math.max(0, usdToCents(rawInputs.totalOrderCogsUsd));
  const merchantOutboundShippingCents = Math.max(0, usdToCents(rawInputs.merchantOutboundShippingUsd));
  const packagingFulfillmentCents = Math.max(0, usdToCents(rawInputs.packagingFulfillmentUsd));
  const cacPerOrderCents = Math.max(0, usdToCents(rawInputs.cacPerOrderUsd));
  const fixedCampaignCostCents = Math.max(0, usdToCents(rawInputs.fixedCampaignCostUsd));
  const minContributionPerOrderCents = usdToCents(rawInputs.minContributionPerOrderUsd);

  const refundProb = Math.min(100, Math.max(0, Number.isFinite(rawInputs.refundProbabilityPercent) ? rawInputs.refundProbabilityPercent : 0)) / 100;
  const shippingRefundFrac = Math.min(100, Math.max(0, Number.isFinite(rawInputs.shippingRefundFractionPercent) ? rawInputs.shippingRefundFractionPercent : 0)) / 100;
  const returnHandlingCents = Math.max(0, usdToCents(rawInputs.returnHandlingCostUsd));
  const recoverableCapCents = Math.min(
    totalOrderCogsCents,
    Math.max(0, usdToCents(rawInputs.recoverableInventoryValueUsd))
  );

  // Expected values retain fractional-cent precision before campaign aggregation & final display
  const expectedRefundedRevenueCents =
    refundProb * (productRevenueChargedCents + effectiveCustomerShippingCents * shippingRefundFrac);
  const expectedNetSalesRevenueCents = customerAmountChargedCents - expectedRefundedRevenueCents;
  const expectedReturnHandlingCents = refundProb * returnHandlingCents;
  const expectedRecoveredInventoryCents = refundProb * recoverableCapCents;

  const expectedContributionPerOrderCents =
    customerAmountChargedCents -
    expectedRefundedRevenueCents -
    totalOrderCogsCents -
    merchantOutboundShippingCents -
    packagingFulfillmentCents -
    processingFeeCents -
    cacPerOrderCents -
    expectedReturnHandlingCents +
    expectedRecoveredInventoryCents;

  const projectedGrossSalesRevenueCents = customerAmountChargedCents * projectedOrders;
  const projectedNetSalesRevenueCents = expectedNetSalesRevenueCents * projectedOrders;
  const projectedCampaignContributionCents =
    expectedContributionPerOrderCents * projectedOrders - fixedCampaignCostCents;

  const contributionMarginPercent =
    expectedNetSalesRevenueCents > 0
      ? (expectedContributionPerOrderCents / expectedNetSalesRevenueCents) * 100
      : null;

  const effectiveBundleDiscountPercent =
    fullRetailShippedValueCents > 0
      ? ((fullRetailShippedValueCents - productRevenueChargedCents) / fullRetailShippedValueCents) * 100
      : 0;

  const breakEvenCampaignOrders =
    expectedContributionPerOrderCents > 0
      ? Math.ceil(fixedCampaignCostCents / expectedContributionPerOrderCents)
      : null;

  const meetsMinContributionThreshold =
    expectedContributionPerOrderCents >= minContributionPerOrderCents;
  const meetsMinMarginThreshold =
    contributionMarginPercent !== null &&
    contributionMarginPercent >= rawInputs.minContributionMarginPercent;

  return {
    inputs: {
      ...rawInputs,
      paidUnitsPerOrder: paidUnits,
      bonusUnitsPerOrder: bonusUnits,
      projectedOrderCount: projectedOrders,
    },
    cents: {
      unitListPrice: unitListPriceCents,
      listMerchandiseSubtotal: listMerchandiseSubtotalCents,
      fullRetailShippedValue: fullRetailShippedValueCents,
      discountAmount: discountAmountCents,
      productRevenueCharged: productRevenueChargedCents,
      effectiveCustomerShipping: effectiveCustomerShippingCents,
      customerAmountCharged: customerAmountChargedCents,
      processingFee: processingFeeCents,
      totalOrderCogs: totalOrderCogsCents,
      merchantOutboundShipping: merchantOutboundShippingCents,
      packagingFulfillment: packagingFulfillmentCents,
      cacPerOrder: cacPerOrderCents,
      fixedCampaignCost: fixedCampaignCostCents,
      minContributionPerOrder: minContributionPerOrderCents,
      expectedRefundedRevenue: expectedRefundedRevenueCents,
      expectedNetSalesRevenue: expectedNetSalesRevenueCents,
      expectedReturnHandling: expectedReturnHandlingCents,
      expectedRecoveredInventory: expectedRecoveredInventoryCents,
      expectedContributionPerOrder: expectedContributionPerOrderCents,
      projectedCampaignContribution: projectedCampaignContributionCents,
      projectedGrossSalesRevenue: projectedGrossSalesRevenueCents,
      projectedNetSalesRevenue: projectedNetSalesRevenueCents,
    },
    usd: {
      listMerchandiseSubtotal: centsToUsd(listMerchandiseSubtotalCents),
      fullRetailShippedValue: centsToUsd(fullRetailShippedValueCents),
      discountAmount: centsToUsd(discountAmountCents),
      productRevenueCharged: centsToUsd(productRevenueChargedCents),
      effectiveCustomerShipping: centsToUsd(effectiveCustomerShippingCents),
      customerAmountCharged: centsToUsd(customerAmountChargedCents),
      processingFee: centsToUsd(processingFeeCents),
      expectedRefundedRevenue: centsToUsd(expectedRefundedRevenueCents),
      expectedNetSalesRevenue: centsToUsd(expectedNetSalesRevenueCents),
      expectedReturnHandling: centsToUsd(expectedReturnHandlingCents),
      expectedRecoveredInventory: centsToUsd(expectedRecoveredInventoryCents),
      expectedContributionPerOrder: centsToUsd(expectedContributionPerOrderCents),
      projectedCampaignContribution: centsToUsd(projectedCampaignContributionCents),
      projectedGrossSalesRevenue: centsToUsd(projectedGrossSalesRevenueCents),
      projectedNetSalesRevenue: centsToUsd(projectedNetSalesRevenueCents),
    },
    contributionMarginPercent,
    effectiveBundleDiscountPercent,
    breakEvenCampaignOrders,
    meetsMinContributionThreshold,
    meetsMinMarginThreshold,
    validationIssues,
    hasErrors,
  };
}

/**
 * Compare a promotion scenario against an explicit baseline scenario.
 * Modifying the offer never mutates the baseline.
 */
export function compareAgainstBaseline(
  baseline: ScenarioCalculation,
  offer: ScenarioCalculation
): BaselineComparison {
  const baseContribCents = baseline.cents.expectedContributionPerOrder;
  const offerContribCents = offer.cents.expectedContributionPerOrder;
  const contributionDeltaPerOrderCents = offerContribCents - baseContribCents;

  const profitChangePercent =
    baseContribCents > 0
      ? ((offerContribCents - baseContribCents) / baseContribCents) * 100
      : null;

  const marginDeltaPoints =
    baseline.contributionMarginPercent !== null && offer.contributionMarginPercent !== null
      ? offer.contributionMarginPercent - baseline.contributionMarginPercent
      : null;

  const campaignContributionDeltaUsd = centsToUsd(
    offer.cents.projectedCampaignContribution - baseline.cents.projectedCampaignContribution
  );

  const baselineOrders = baseline.inputs.projectedOrderCount;
  const baselineTotalContributionBeforeFixedCents = baseContribCents * baselineOrders;
  const targetContributionForPromoOrdersCents =
    baseline.cents.projectedCampaignContribution + offer.cents.fixedCampaignCost;

  let ordersNeededToMatchBaseline: number | null = null;
  let extraOrdersRequired: number | null = null;
  let extraOrdersPercent: number | null = null;
  let recoveryExplanation = '';

  if (baseline.cents.projectedCampaignContribution <= 0 || baselineTotalContributionBeforeFixedCents <= 0) {
    recoveryExplanation =
      'Baseline total contribution is zero or negative under current inputs, so matching baseline profit is not a meaningful recovery target.';
  } else if (offerContribCents <= 0) {
    recoveryExplanation =
      'Per-order contribution is zero or negative under this offer. Additional order volume cannot recover baseline profit—it increases total loss.';
  } else {
    const rawRequired = targetContributionForPromoOrdersCents / offerContribCents;
    ordersNeededToMatchBaseline = Math.max(0, Math.ceil(rawRequired));
    extraOrdersRequired = Math.max(0, ordersNeededToMatchBaseline - baselineOrders);
    extraOrdersPercent =
      baselineOrders > 0 ? (extraOrdersRequired / baselineOrders) * 100 : null;

    if (extraOrdersRequired === 0) {
      recoveryExplanation = `This scenario matches or beats baseline total contribution at ${ordersNeededToMatchBaseline} orders assuming per-order CAC and return rates remain constant.`;
    } else {
      recoveryExplanation = `Requires ${ordersNeededToMatchBaseline.toLocaleString('en-US')} placed orders (+${extraOrdersRequired.toLocaleString('en-US')} extra orders${
        extraOrdersPercent !== null ? `, +${extraOrdersPercent.toFixed(1)}% volume` : ''
      }) to match the ${formatUsd(baseline.usd.projectedCampaignContribution)} baseline contribution, assuming constant CAC and return behavior.`;
    }
  }

  return {
    baseline,
    offer,
    contributionDeltaPerOrderUsd: centsToUsd(contributionDeltaPerOrderCents),
    contributionDeltaPerOrderCents,
    profitChangePercent,
    marginDeltaPoints,
    campaignContributionDeltaUsd,
    ordersNeededToMatchBaseline,
    extraOrdersRequired,
    extraOrdersPercent,
    recoveryExplanation,
  };
}

/**
 * Bounded numerical search computing the maximum percentage & dollar discount
 * that preserves the merchant's minimum contribution per order threshold,
 * conditional on all other current assumptions.
 */
export function computeDiscountSafetyThreshold(baseInputs: PromotionInputs): SafetyThresholdResult {
  const zeroDiscountCalc = calculateScenario({
    ...baseInputs,
    offerType: 'baseline',
    discountPercent: 0,
    discountFixedUsd: 0,
  });

  const targetCents = usdToCents(baseInputs.minContributionPerOrderUsd);
  const atZeroDiscountContributionUsd = zeroDiscountCalc.usd.expectedContributionPerOrder;

  if (zeroDiscountCalc.cents.expectedContributionPerOrder < targetCents) {
    return {
      maxSafeDiscountPercent: 0,
      maxSafeDiscountFixedUsd: 0,
      targetContributionPerOrderUsd: baseInputs.minContributionPerOrderUsd,
      atZeroDiscountContributionUsd,
      alreadyBelowTargetAtZeroDiscount: true,
    };
  }

  // Binary search percentage discount from 0% to 100% at 0.1% resolution
  let lowPct = 0;
  let highPct = 100;
  for (let i = 0; i < 30; i++) {
    const mid = (lowPct + highPct) / 2;
    const probe = calculateScenario({
      ...baseInputs,
      offerType: 'percent_discount',
      discountPercent: mid,
      discountFixedUsd: 0,
    });
    if (probe.cents.expectedContributionPerOrder >= targetCents) {
      lowPct = mid;
    } else {
      highPct = mid;
    }
  }
  const maxSafeDiscountPercent = Math.floor(lowPct * 10) / 10;

  // Binary search fixed dollar discount in integer cents
  const maxSubtotalCents = zeroDiscountCalc.cents.listMerchandiseSubtotal;
  let lowCents = 0;
  let highCents = maxSubtotalCents;
  while (lowCents < highCents) {
    const mid = Math.ceil((lowCents + highCents) / 2);
    const probe = calculateScenario({
      ...baseInputs,
      offerType: 'fixed_discount',
      discountPercent: 0,
      discountFixedUsd: mid / 100,
    });
    if (probe.cents.expectedContributionPerOrder >= targetCents) {
      lowCents = mid;
    } else {
      highCents = mid - 1;
    }
  }

  return {
    maxSafeDiscountPercent,
    maxSafeDiscountFixedUsd: centsToUsd(lowCents),
    targetContributionPerOrderUsd: baseInputs.minContributionPerOrderUsd,
    atZeroDiscountContributionUsd,
    alreadyBelowTargetAtZeroDiscount: false,
  };
}
