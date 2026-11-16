import { calculateScenario } from './calculator';
import { PromotionInputs, SensitivityPoint, SensitivityReport } from './types';

export function buildSensitivityReport(
  inputs: PromotionInputs,
  options?: {
    refundRates?: number[];
    cacMultipliers?: number[];
  }
): SensitivityReport {
  const baseCalc = calculateScenario(inputs);
  const baseOrders = inputs.projectedOrderCount;
  const baseCac = inputs.cacPerOrderUsd;

  const demandMultipliers = [
    { label: '-20% Volume', mult: 0.8 },
    { label: 'Baseline Volume', mult: 1.0 },
    { label: '+20% Volume', mult: 1.2 },
  ];

  const demandSwings: SensitivityPoint[] = demandMultipliers.map(({ label, mult }) => {
    const orders = Math.round(baseOrders * mult);
    const calc = calculateScenario({
      ...inputs,
      projectedOrderCount: orders,
    });
    return {
      label,
      demandMultiplier: mult,
      projectedOrders: orders,
      cacUsd: inputs.cacPerOrderUsd,
      refundRatePercent: inputs.refundProbabilityPercent,
      contributionPerOrderUsd: calc.usd.expectedContributionPerOrder,
      campaignContributionUsd: calc.usd.projectedCampaignContribution,
      marginPercent: calc.contributionMarginPercent,
    };
  });

  const cacFactors = options?.cacMultipliers ?? [0.85, 1.0, 1.25, 1.5];
  const cacSwings: SensitivityPoint[] = cacFactors.map((factor) => {
    const newCac = Math.round(baseCac * factor * 100) / 100;
    const calc = calculateScenario({
      ...inputs,
      cacPerOrderUsd: newCac,
    });
    const pctDiff = Math.round((factor - 1) * 100);
    const label =
      factor === 1
        ? 'Current CAC'
        : pctDiff > 0
          ? `CAC +${pctDiff}%`
          : `CAC ${pctDiff}%`;
    return {
      label,
      demandMultiplier: 1,
      projectedOrders: baseCalc.inputs.projectedOrderCount,
      cacUsd: newCac,
      refundRatePercent: inputs.refundProbabilityPercent,
      contributionPerOrderUsd: calc.usd.expectedContributionPerOrder,
      campaignContributionUsd: calc.usd.projectedCampaignContribution,
      marginPercent: calc.contributionMarginPercent,
    };
  });

  const refundRates = options?.refundRates ?? [0, 5, 10, 15];
  const refundSwings: SensitivityPoint[] = refundRates.map((rate) => {
    const calc = calculateScenario({
      ...inputs,
      refundProbabilityPercent: rate,
    });
    return {
      label: `${rate}% Refunds`,
      demandMultiplier: 1,
      projectedOrders: baseCalc.inputs.projectedOrderCount,
      cacUsd: inputs.cacPerOrderUsd,
      refundRatePercent: rate,
      contributionPerOrderUsd: calc.usd.expectedContributionPerOrder,
      campaignContributionUsd: calc.usd.projectedCampaignContribution,
      marginPercent: calc.contributionMarginPercent,
    };
  });

  return {
    demandSwings,
    cacSwings,
    refundSwings,
  };
}
