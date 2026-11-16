export type OfferType =
  | 'baseline'
  | 'percent_discount'
  | 'fixed_discount'
  | 'free_shipping'
  | 'bundle';

export interface PromotionInputs {
  /** Unit list selling price in USD (>= 0) */
  unitListPriceUsd: number;
  /** Paid units per order (integer >= 1) */
  paidUnitsPerOrder: number;
  /** Free/bonus units included per order, e.g. 1 for Buy 2 Get 1 (integer >= 0) */
  bonusUnitsPerOrder: number;
  /** Total COGS in USD across ALL shipped units including bonus/gift items (>= 0) */
  totalOrderCogsUsd: number;
  /** Type of offer modeled */
  offerType: OfferType;
  /** Percentage discount 0..100 applied to eligible merchandise subtotal */
  discountPercent: number;
  /** Fixed dollar discount >= 0 capped at eligible merchandise subtotal */
  discountFixedUsd: number;
  /** Shipping charged to customer in USD (>= 0). Set to 0 automatically under free_shipping offer */
  customerShippingRevenueUsd: number;
  /** Merchant outbound shipping cost per order in USD (>= 0) */
  merchantOutboundShippingUsd: number;
  /** Packaging and fulfillment cost per order in USD (>= 0) */
  packagingFulfillmentUsd: number;
  /** Payment processing percentage fee (0..100) of customer amount charged */
  processingFeePercent: number;
  /** Fixed payment processing fee per order in USD (>= 0) */
  processingFeeFixedUsd: number;
  /** Customer acquisition cost per paid order in USD (>= 0). Do not double count in fixedCampaignCostUsd */
  cacPerOrderUsd: number;
  /** Estimated full-order refund probability (0..100). V1 assumes full order is refunded or not */
  refundProbabilityPercent: number;
  /** Fraction of customer shipping revenue refunded on a return (0..100) */
  shippingRefundFractionPercent: number;
  /** Return shipping + handling cost per refunded order in USD (>= 0) */
  returnHandlingCostUsd: number;
  /** Estimated recoverable inventory value per returned order in USD (0..totalOrderCogsUsd) */
  recoverableInventoryValueUsd: number;
  /** Expected placed order count for this scenario (integer >= 0) */
  projectedOrderCount: number;
  /** Fixed campaign setup/creative cost in USD (>= 0), separate from per-order CAC */
  fixedCampaignCostUsd: number;
  /** Merchant's minimum acceptable contribution per order in USD */
  minContributionPerOrderUsd: number;
  /** Merchant's minimum acceptable contribution margin % */
  minContributionMarginPercent: number;
}

export interface ValidationIssue {
  field: keyof PromotionInputs | 'general';
  severity: 'error' | 'warning';
  message: string;
}

export interface ScenarioCalculation {
  inputs: PromotionInputs;
  /** Exact integer-cent values */
  cents: {
    unitListPrice: number;
    listMerchandiseSubtotal: number;
    fullRetailShippedValue: number;
    discountAmount: number;
    productRevenueCharged: number;
    effectiveCustomerShipping: number;
    customerAmountCharged: number;
    processingFee: number;
    totalOrderCogs: number;
    merchantOutboundShipping: number;
    packagingFulfillment: number;
    cacPerOrder: number;
    fixedCampaignCost: number;
    minContributionPerOrder: number;
    /** Intermediate high-precision expected values in cents (unrounded until display) */
    expectedRefundedRevenue: number;
    expectedNetSalesRevenue: number;
    expectedReturnHandling: number;
    expectedRecoveredInventory: number;
    expectedContributionPerOrder: number;
    projectedCampaignContribution: number;
    projectedGrossSalesRevenue: number;
    projectedNetSalesRevenue: number;
  };
  /** Display-friendly USD numbers */
  usd: {
    listMerchandiseSubtotal: number;
    fullRetailShippedValue: number;
    discountAmount: number;
    productRevenueCharged: number;
    effectiveCustomerShipping: number;
    customerAmountCharged: number;
    processingFee: number;
    expectedRefundedRevenue: number;
    expectedNetSalesRevenue: number;
    expectedReturnHandling: number;
    expectedRecoveredInventory: number;
    expectedContributionPerOrder: number;
    projectedCampaignContribution: number;
    projectedGrossSalesRevenue: number;
    projectedNetSalesRevenue: number;
  };
  /** Margin & rates */
  contributionMarginPercent: number | null;
  effectiveBundleDiscountPercent: number;
  breakEvenCampaignOrders: number | null;
  meetsMinContributionThreshold: boolean;
  meetsMinMarginThreshold: boolean;
  validationIssues: ValidationIssue[];
  hasErrors: boolean;
}

export interface BaselineComparison {
  baseline: ScenarioCalculation;
  offer: ScenarioCalculation;
  contributionDeltaPerOrderUsd: number;
  contributionDeltaPerOrderCents: number;
  profitChangePercent: number | null;
  marginDeltaPoints: number | null;
  campaignContributionDeltaUsd: number;
  ordersNeededToMatchBaseline: number | null;
  extraOrdersRequired: number | null;
  extraOrdersPercent: number | null;
  recoveryExplanation: string;
}

export interface SafetyThresholdResult {
  maxSafeDiscountPercent: number;
  maxSafeDiscountFixedUsd: number;
  targetContributionPerOrderUsd: number;
  atZeroDiscountContributionUsd: number;
  alreadyBelowTargetAtZeroDiscount: boolean;
}

export type DecisionStatus = 'healthy' | 'caution' | 'critical';

export interface DecisionBrief {
  status: DecisionStatus;
  headline: string;
  whatChanged: string[];
  financialSummary: {
    estimatedContributionPerOrderUsd: number;
    marginSacrificedPoints: number | null;
    contributionReductionPercent: number | null;
    additionalOrdersRequired: number | null;
    additionalOrdersPercent: number | null;
  };
  assumptionsUsed: string[];
  thresholdAssessment: {
    meetsContributionTarget: boolean;
    meetsMarginTarget: boolean;
    targetContributionUsd: number;
    targetMarginPercent: number;
    maxSafeDiscountPercent: number;
    maxSafeDiscountUsd: number;
    summary: string;
  };
  riskFactors: string[];
  alternativeStrategy: {
    title: string;
    rationale: string;
    projectedContributionPerOrderUsd: number | null;
  };
  nextCheck: string;
  methodologyNote: string;
}

export interface SensitivityPoint {
  label: string;
  demandMultiplier: number;
  projectedOrders: number;
  cacUsd: number;
  refundRatePercent: number;
  contributionPerOrderUsd: number;
  campaignContributionUsd: number;
  marginPercent: number | null;
}

export interface SensitivityReport {
  demandSwings: SensitivityPoint[];
  cacSwings: SensitivityPoint[];
  refundSwings: SensitivityPoint[];
}
