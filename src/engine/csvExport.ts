import { calculateScenario, compareAgainstBaseline } from './calculator';
import { PromotionInputs } from './types';

export interface CsvScenarioRow {
  title: string;
  isSample?: boolean;
  inputs: PromotionInputs;
}

function csvEscape(val: string | number | boolean | null | undefined): string {
  const str = val === null || val === undefined ? '' : String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildScenariosCsv(
  baselineTitle: string,
  baselineInputs: PromotionInputs,
  scenarios: CsvScenarioRow[],
  storeName?: string
): string {
  const baselineCalc = calculateScenario(baselineInputs);

  const headers = [
    'Store Name',
    'Scenario Title',
    'Data Label',
    'Offer Type',
    'Unit List Price ($)',
    'Paid Units / Order',
    'Bonus Units / Order',
    'Total Order COGS ($)',
    'Discount %',
    'Fixed Discount ($)',
    'Customer Charged ($)',
    'Expected Net Sales / Order ($)',
    'Processing Fee / Order ($)',
    'Outbound Shipping ($)',
    'Packaging ($)',
    'CAC / Order ($)',
    'Refund Prob (%)',
    'Expected Return Handling ($)',
    'Expected Recovered Inventory ($)',
    'Expected Contribution / Order ($)',
    'Contribution Margin (%)',
    'Profit Change vs Baseline (%)',
    'Projected Orders',
    'Fixed Campaign Cost ($)',
    'Projected Campaign Contribution ($)',
    'Orders Needed to Match Baseline',
    'Extra Orders Required',
    'Break-Even Campaign Orders',
    'Meets Min Contribution Floor',
  ];

  const rows: (string | number | boolean | null)[][] = [];

  const allEntries: CsvScenarioRow[] = [
    { title: baselineTitle || 'Baseline (No Promotion)', isSample: false, inputs: baselineInputs },
    ...scenarios,
  ];

  allEntries.forEach((entry, index) => {
    const calc = calculateScenario(entry.inputs);
    const isBaseline = index === 0;
    const cmp = isBaseline ? null : compareAgainstBaseline(baselineCalc, calc);

    rows.push([
      storeName || 'Unconfigured Store',
      entry.title,
      entry.isSample ? 'SAMPLE DATA' : 'User Model',
      entry.inputs.offerType,
      entry.inputs.unitListPriceUsd.toFixed(2),
      entry.inputs.paidUnitsPerOrder,
      entry.inputs.bonusUnitsPerOrder,
      entry.inputs.totalOrderCogsUsd.toFixed(2),
      entry.inputs.discountPercent.toFixed(2),
      entry.inputs.discountFixedUsd.toFixed(2),
      calc.usd.customerAmountCharged.toFixed(2),
      calc.usd.expectedNetSalesRevenue.toFixed(2),
      calc.usd.processingFee.toFixed(2),
      entry.inputs.merchantOutboundShippingUsd.toFixed(2),
      entry.inputs.packagingFulfillmentUsd.toFixed(2),
      entry.inputs.cacPerOrderUsd.toFixed(2),
      entry.inputs.refundProbabilityPercent.toFixed(2),
      calc.usd.expectedReturnHandling.toFixed(2),
      calc.usd.expectedRecoveredInventory.toFixed(2),
      calc.usd.expectedContributionPerOrder.toFixed(2),
      calc.contributionMarginPercent !== null ? calc.contributionMarginPercent.toFixed(2) : 'N/A',
      cmp && cmp.profitChangePercent !== null ? cmp.profitChangePercent.toFixed(2) : isBaseline ? '0.00' : 'N/A',
      entry.inputs.projectedOrderCount,
      entry.inputs.fixedCampaignCostUsd.toFixed(2),
      calc.usd.projectedCampaignContribution.toFixed(2),
      cmp ? cmp.ordersNeededToMatchBaseline ?? 'Cannot Recover' : entry.inputs.projectedOrderCount,
      cmp ? cmp.extraOrdersRequired ?? 'Cannot Recover' : 0,
      calc.breakEvenCampaignOrders ?? 'N/A',
      calc.meetsMinContributionThreshold ? 'Yes' : 'No',
    ]);
  });

  return [
    headers.map(csvEscape).join(','),
    ...rows.map((r) => r.map(csvEscape).join(',')),
  ].join('\r\n');
}

export function triggerCsvDownload(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
