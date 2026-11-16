import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateScenario,
  compareAgainstBaseline,
  computeDiscountSafetyThreshold,
  EXAMPLE_BASELINE_INPUTS,
  formatPercent,
  formatUsd,
  usdToCents,
} from './calculator';
import { generateDecisionBrief } from './decisionEngine';
import { buildSensitivityReport } from './sensitivity';
import { PromotionInputs } from './types';

function makeInputs(overrides: Partial<PromotionInputs>): PromotionInputs {
  return {
    ...EXAMPLE_BASELINE_INPUTS,
    ...overrides,
  };
}

test('Test 1: Core 20% discount margin erosion ($60 -> $17 baseline -> $5 at 20% off, -70.588%)', () => {
  const baseline = calculateScenario(
    makeInputs({
      unitListPriceUsd: 60,
      paidUnitsPerOrder: 1,
      bonusUnitsPerOrder: 0,
      totalOrderCogsUsd: 25,
      offerType: 'baseline',
      discountPercent: 0,
      discountFixedUsd: 0,
      customerShippingRevenueUsd: 0,
      merchantOutboundShippingUsd: 6,
      packagingFulfillmentUsd: 2,
      processingFeePercent: 0,
      processingFeeFixedUsd: 0,
      cacPerOrderUsd: 10, // 6 + 2 + 10 = $18 fixed per-order costs
      refundProbabilityPercent: 0,
      shippingRefundFractionPercent: 0,
      returnHandlingCostUsd: 0,
      recoverableInventoryValueUsd: 0,
      projectedOrderCount: 100,
      fixedCampaignCostUsd: 0,
    })
  );

  assert.equal(baseline.usd.expectedContributionPerOrder, 17);

  const promo20 = calculateScenario({
    ...baseline.inputs,
    offerType: 'percent_discount',
    discountPercent: 20,
  });

  assert.equal(promo20.usd.discountAmount, 12);
  assert.equal(promo20.usd.customerAmountCharged, 48);
  assert.equal(promo20.usd.expectedContributionPerOrder, 5);

  const cmp = compareAgainstBaseline(baseline, promo20);
  assert.ok(cmp.profitChangePercent !== null);
  assert.ok(Math.abs(cmp.profitChangePercent - -70.5882352941) < 0.001);
  // Needs ceil(1700 / 5) = 340 orders (+240 extra orders)
  assert.equal(cmp.ordersNeededToMatchBaseline, 340);
  assert.equal(cmp.extraOrdersRequired, 240);
});

test('Test 2: Contribution <= $0 produces null recovery orders and explicit explanation', () => {
  const baseline = calculateScenario(
    makeInputs({
      unitListPriceUsd: 50,
      totalOrderCogsUsd: 20,
      merchantOutboundShippingUsd: 5,
      packagingFulfillmentUsd: 2,
      cacPerOrderUsd: 10,
      processingFeePercent: 0,
      processingFeeFixedUsd: 0,
      refundProbabilityPercent: 0,
      customerShippingRevenueUsd: 0,
      projectedOrderCount: 100,
    })
  );

  const promo50 = calculateScenario({
    ...baseline.inputs,
    offerType: 'percent_discount',
    discountPercent: 50, // charged = $25, costs = $37 -> -$12/order
  });

  assert.equal(promo50.usd.expectedContributionPerOrder, -12);
  const cmp = compareAgainstBaseline(baseline, promo50);
  assert.equal(cmp.ordersNeededToMatchBaseline, null);
  assert.equal(cmp.extraOrdersRequired, null);
  assert.match(cmp.recoveryExplanation, /cannot recover baseline profit/i);

  const zeroContrib = calculateScenario({
    ...baseline.inputs,
    offerType: 'fixed_discount',
    discountFixedUsd: 13, // $50 - $13 = $37 revenue == $37 costs -> $0/order
  });
  assert.equal(zeroContrib.usd.expectedContributionPerOrder, 0);
  const cmpZero = compareAgainstBaseline(baseline, zeroContrib);
  assert.equal(cmpZero.ordersNeededToMatchBaseline, null);
  assert.equal(zeroContrib.breakEvenCampaignOrders, null);
});

test('Test 3: Free shipping removes customer shipping revenue without erasing merchant outbound shipping cost', () => {
  const baseline = calculateScenario(
    makeInputs({
      unitListPriceUsd: 50,
      totalOrderCogsUsd: 20,
      customerShippingRevenueUsd: 8,
      merchantOutboundShippingUsd: 7,
      packagingFulfillmentUsd: 1,
      processingFeePercent: 0,
      processingFeeFixedUsd: 0,
      cacPerOrderUsd: 10,
      refundProbabilityPercent: 0,
    })
  );
  // Revenue = 58, costs = 20+7+1+10 = 38 => $20
  assert.equal(baseline.usd.customerAmountCharged, 58);
  assert.equal(baseline.usd.expectedContributionPerOrder, 20);

  const freeShip = calculateScenario({
    ...baseline.inputs,
    offerType: 'free_shipping',
  });
  // Revenue = 50, costs still = 38 => $12
  assert.equal(freeShip.usd.effectiveCustomerShipping, 0);
  assert.equal(freeShip.usd.customerAmountCharged, 50);
  assert.equal(freeShip.usd.expectedContributionPerOrder, 12);
});

test('Test 4: Payment processing percentage + fixed fees recalculate on discounted amount with no double charge', () => {
  const baseline = calculateScenario(
    makeInputs({
      unitListPriceUsd: 100,
      paidUnitsPerOrder: 1,
      totalOrderCogsUsd: 30,
      customerShippingRevenueUsd: 10,
      merchantOutboundShippingUsd: 5,
      packagingFulfillmentUsd: 0,
      processingFeePercent: 3, // 3% of $110 = $3.30
      processingFeeFixedUsd: 0.3,
      cacPerOrderUsd: 10,
      refundProbabilityPercent: 0,
    })
  );
  assert.equal(baseline.usd.customerAmountCharged, 110);
  assert.equal(baseline.usd.processingFee, 3.6);

  const discount10 = calculateScenario({
    ...baseline.inputs,
    offerType: 'percent_discount',
    discountPercent: 10, // product charged = $90 + $10 shipping = $100
  });
  assert.equal(discount10.usd.customerAmountCharged, 100);
  // 3% of $100 = $3.00 + $0.30 = $3.30
  assert.equal(discount10.usd.processingFee, 3.3);
});

test('Test 5: Zero refund probability sets all expected refund, handling, and recovery values to zero', () => {
  const calc = calculateScenario(
    makeInputs({
      refundProbabilityPercent: 0,
      shippingRefundFractionPercent: 100,
      returnHandlingCostUsd: 15,
      recoverableInventoryValueUsd: 10,
    })
  );
  assert.equal(calc.usd.expectedRefundedRevenue, 0);
  assert.equal(calc.usd.expectedReturnHandling, 0);
  assert.equal(calc.usd.expectedRecoveredInventory, 0);
});

test('Test 6: Recoverable inventory value is counted once and capped at COGS; $0 recovery keeps full COGS incurred', () => {
  const baseNoRecovery = calculateScenario(
    makeInputs({
      unitListPriceUsd: 100,
      totalOrderCogsUsd: 40,
      customerShippingRevenueUsd: 0,
      merchantOutboundShippingUsd: 0,
      packagingFulfillmentUsd: 0,
      processingFeePercent: 0,
      processingFeeFixedUsd: 0,
      cacPerOrderUsd: 0,
      refundProbabilityPercent: 10,
      shippingRefundFractionPercent: 0,
      returnHandlingCostUsd: 10,
      recoverableInventoryValueUsd: 0,
    })
  );
  // Charged = 100. Expected refund = 10% * 100 = 10. COGS = 40. Return handling = 10% * 10 = 1.
  // Contribution = 100 - 10 - 40 - 1 = 49
  assert.equal(baseNoRecovery.usd.expectedContributionPerOrder, 49);

  const withRecovery = calculateScenario({
    ...baseNoRecovery.inputs,
    recoverableInventoryValueUsd: 30, // 10% * 30 = +$3 recovered
  });
  assert.equal(withRecovery.usd.expectedRecoveredInventory, 3);
  assert.equal(withRecovery.usd.expectedContributionPerOrder, 52);

  // Over-COGS recovery must be capped at $40 COGS (10% * 40 = $4)
  const overCapped = calculateScenario({
    ...baseNoRecovery.inputs,
    recoverableInventoryValueUsd: 99,
  });
  assert.equal(overCapped.usd.expectedRecoveredInventory, 4);
  assert.ok(
    overCapped.validationIssues.some(
      (i) => i.field === 'recoverableInventoryValueUsd' && i.severity === 'warning'
    )
  );
});

test('Test 7: Multiple units per order and Buy 2 Get 1 bundle math', () => {
  // Unit price $30, Buy 2 Get 1 (paid=2, bonus=1, total 3 units shipped, total COGS $30 for 3x$10)
  const b2g1 = calculateScenario(
    makeInputs({
      unitListPriceUsd: 30,
      paidUnitsPerOrder: 2,
      bonusUnitsPerOrder: 1,
      totalOrderCogsUsd: 30,
      offerType: 'bundle',
      discountPercent: 0,
      discountFixedUsd: 0,
      customerShippingRevenueUsd: 0,
      merchantOutboundShippingUsd: 8,
      packagingFulfillmentUsd: 2,
      processingFeePercent: 0,
      processingFeeFixedUsd: 0,
      cacPerOrderUsd: 10,
      refundProbabilityPercent: 0,
    })
  );
  // Charged = 2 * 30 = $60. Full retail shipped = 3 * 30 = $90 (effective 33.33% off retail).
  // Costs = 30 COGS + 8 ship + 2 pack + 10 CAC = 50 => Contribution = $10
  assert.equal(b2g1.usd.productRevenueCharged, 60);
  assert.equal(b2g1.usd.fullRetailShippedValue, 90);
  assert.ok(Math.abs(b2g1.effectiveBundleDiscountPercent - 33.3333) < 0.01);
  assert.equal(b2g1.usd.expectedContributionPerOrder, 10);
});

test('Test 8: Fixed campaign costs deduct from projected campaign contribution & compute break-even orders', () => {
  const baseline = calculateScenario(
    makeInputs({
      unitListPriceUsd: 60,
      totalOrderCogsUsd: 20,
      customerShippingRevenueUsd: 0,
      merchantOutboundShippingUsd: 5,
      packagingFulfillmentUsd: 2,
      processingFeePercent: 0,
      processingFeeFixedUsd: 0,
      cacPerOrderUsd: 13, // contribution = $20/order
      refundProbabilityPercent: 0,
      projectedOrderCount: 100,
      fixedCampaignCostUsd: 0,
    })
  );
  assert.equal(baseline.usd.projectedCampaignContribution, 2000);

  const promoWithFixedSpend = calculateScenario({
    ...baseline.inputs,
    offerType: 'fixed_discount',
    discountFixedUsd: 5, // contribution = $15/order
    fixedCampaignCostUsd: 600,
  });
  // Break-even campaign orders = ceil(600 / 15) = 40
  assert.equal(promoWithFixedSpend.breakEvenCampaignOrders, 40);
  // Campaign contribution at 100 orders = 15 * 100 - 600 = $900
  assert.equal(promoWithFixedSpend.usd.projectedCampaignContribution, 900);

  // Orders needed to match baseline ($2,000 + $600 fixed = $2,600 / $15 = 173.33 -> 174 orders)
  const cmp = compareAgainstBaseline(baseline, promoWithFixedSpend);
  assert.equal(cmp.ordersNeededToMatchBaseline, 174);
  assert.equal(cmp.extraOrdersRequired, 74);
});

test('Test 9: Edge cases - 100% discount, 100% refund rate, zero orders, fixed discount cap, and floating-point precision', () => {
  // 100% discount with 0 shipping => net sales = 0, margin must be null ("N/A"), not Infinity/NaN
  const freeGiveaway = calculateScenario(
    makeInputs({
      unitListPriceUsd: 50,
      offerType: 'percent_discount',
      discountPercent: 100,
      customerShippingRevenueUsd: 0,
      refundProbabilityPercent: 0,
    })
  );
  assert.equal(freeGiveaway.usd.expectedNetSalesRevenue, 0);
  assert.equal(freeGiveaway.contributionMarginPercent, null);
  assert.equal(formatPercent(freeGiveaway.contributionMarginPercent), 'N/A');

  // 100% refund rate => expectedNetSalesRevenue = 0 -> margin null
  const allReturned = calculateScenario(
    makeInputs({
      refundProbabilityPercent: 100,
      shippingRefundFractionPercent: 100,
    })
  );
  assert.equal(allReturned.usd.expectedNetSalesRevenue, 0);
  assert.equal(allReturned.contributionMarginPercent, null);

  // Zero orders
  const zeroOrders = calculateScenario(makeInputs({ projectedOrderCount: 0, fixedCampaignCostUsd: 500 }));
  assert.equal(zeroOrders.usd.projectedGrossSalesRevenue, 0);
  assert.equal(zeroOrders.usd.projectedCampaignContribution, -500);
  const zeroOrdersZeroFixed = calculateScenario(makeInputs({ projectedOrderCount: 0, fixedCampaignCostUsd: 0 }));
  assert.equal(zeroOrdersZeroFixed.usd.projectedCampaignContribution, 0);

  // Fixed discount capped at subtotal
  const overDiscount = calculateScenario(
    makeInputs({
      unitListPriceUsd: 40,
      paidUnitsPerOrder: 1,
      offerType: 'fixed_discount',
      discountFixedUsd: 99,
    })
  );
  assert.equal(overDiscount.usd.discountAmount, 40);
  assert.equal(overDiscount.usd.productRevenueCharged, 0);
  assert.ok(overDiscount.validationIssues.some((i) => i.field === 'discountFixedUsd'));

  // IEEE-754 drift guard: $19.99 * 3 = $59.97 exact
  assert.equal(usdToCents(19.99), 1999);
  const multi = calculateScenario(makeInputs({ unitListPriceUsd: 19.99, paidUnitsPerOrder: 3 }));
  assert.equal(multi.cents.listMerchandiseSubtotal, 5997);
  assert.equal(multi.usd.listMerchandiseSubtotal, 59.97);
  assert.equal(formatUsd(-12.345), '-$12.35');
});

test('Test 10: Mutating offer does not mutate baseline; safety threshold, sensitivity, and Decision Brief stay consistent', () => {
  const baselineInputs = makeInputs({ minContributionPerOrderUsd: 10 });
  const baselineSnapshot = structuredClone(baselineInputs);
  const offerInputs = makeInputs({
    offerType: 'percent_discount',
    discountPercent: 25,
    minContributionPerOrderUsd: 10,
  });

  const baseline = calculateScenario(baselineInputs);
  const offer = calculateScenario(offerInputs);
  assert.deepEqual(baselineInputs, baselineSnapshot);
  assert.notEqual(baseline.usd.expectedContributionPerOrder, offer.usd.expectedContributionPerOrder);

  const safety = computeDiscountSafetyThreshold(baselineInputs);
  assert.ok(safety.maxSafeDiscountPercent >= 0 && safety.maxSafeDiscountPercent <= 100);
  const atThreshold = calculateScenario({
    ...baselineInputs,
    offerType: 'percent_discount',
    discountPercent: safety.maxSafeDiscountPercent,
  });
  assert.ok(atThreshold.usd.expectedContributionPerOrder >= baselineInputs.minContributionPerOrderUsd);

  const sensitivity = buildSensitivityReport(offerInputs);
  assert.equal(sensitivity.demandSwings.length, 3);
  assert.equal(sensitivity.cacSwings.length, 4);
  assert.equal(sensitivity.refundSwings.length, 4);

  const brief = generateDecisionBrief(baselineInputs, offerInputs);
  assert.ok(brief.whatChanged.length > 0);
  assert.ok(brief.assumptionsUsed.length > 0);
  assert.ok(brief.riskFactors.length > 0);
  assert.ok(brief.alternativeStrategy.title.length > 0);
  assert.match(brief.methodologyNote, /never guaranteed/i);
});

import { buildScenariosCsv } from './csvExport';

test('Test 11: CSV export preserves exact numbers, sample labels, and N/A margins safely', () => {
  const csv = buildScenariosCsv(
    'Baseline Store',
    EXAMPLE_BASELINE_INPUTS,
    [
      {
        title: '20% Off Sample',
        isSample: true,
        inputs: { ...EXAMPLE_BASELINE_INPUTS, offerType: 'percent_discount', discountPercent: 20 },
      },
      {
        title: '100% Giveaway',
        isSample: false,
        inputs: {
          ...EXAMPLE_BASELINE_INPUTS,
          offerType: 'percent_discount',
          discountPercent: 100,
          customerShippingRevenueUsd: 0,
        },
      },
    ],
    'Test "Quoted" Store'
  );
  assert.match(csv, /"Test ""Quoted"" Store"/);
  assert.match(csv, /SAMPLE DATA/);
  assert.match(csv, /N\/A/);
  assert.match(csv, /Cannot Recover/);
});
