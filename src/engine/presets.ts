import { EXAMPLE_BASELINE_INPUTS } from './calculator';
import { OfferType, PromotionInputs } from './types';

export interface ScenarioPreset {
  id: string;
  title: string;
  subtitle: string;
  isSample: boolean;
  offerType: OfferType;
  applyToBaseline: (base: PromotionInputs) => PromotionInputs;
}

export const OFFER_PRESETS: ScenarioPreset[] = [
  {
    id: 'preset-10-pct',
    title: '10% Off Storewide',
    subtitle: 'Modest percentage discount for list-building or seasonal promos',
    isSample: true,
    offerType: 'percent_discount',
    applyToBaseline: (base) => ({
      ...base,
      offerType: 'percent_discount',
      discountPercent: 10,
      discountFixedUsd: 0,
      bonusUnitsPerOrder: 0,
    }),
  },
  {
    id: 'preset-20-pct',
    title: '20% Off Flash Sale',
    subtitle: 'Common site-wide markdown that sharply compresses net contribution',
    isSample: true,
    offerType: 'percent_discount',
    applyToBaseline: (base) => ({
      ...base,
      offerType: 'percent_discount',
      discountPercent: 20,
      discountFixedUsd: 0,
      bonusUnitsPerOrder: 0,
    }),
  },
  {
    id: 'preset-free-ship',
    title: 'Free Shipping Offer',
    subtitle: 'Removes customer shipping charge while merchant outbound shipping remains',
    isSample: true,
    offerType: 'free_shipping',
    applyToBaseline: (base) => ({
      ...base,
      offerType: 'free_shipping',
      discountPercent: 0,
      discountFixedUsd: 0,
      bonusUnitsPerOrder: 0,
    }),
  },
  {
    id: 'preset-10-usd',
    title: '$10 Off Order',
    subtitle: 'Fixed dollar discount capped at eligible merchandise subtotal',
    isSample: true,
    offerType: 'fixed_discount',
    applyToBaseline: (base) => ({
      ...base,
      offerType: 'fixed_discount',
      discountPercent: 0,
      discountFixedUsd: 10,
      bonusUnitsPerOrder: 0,
    }),
  },
  {
    id: 'preset-b2g1',
    title: 'Buy 2 Get 1 Free Bundle',
    subtitle: 'Charges 2 paid units while shipping 3 total units (scales COGS to 3 units)',
    isSample: true,
    offerType: 'bundle',
    applyToBaseline: (base) => {
      const totalCurrentUnits = Math.max(1, base.paidUnitsPerOrder + base.bonusUnitsPerOrder);
      const perUnitCogs = base.totalOrderCogsUsd / totalCurrentUnits;
      return {
        ...base,
        offerType: 'bundle',
        paidUnitsPerOrder: 2,
        bonusUnitsPerOrder: 1,
        totalOrderCogsUsd: Math.round(perUnitCogs * 3 * 100) / 100,
        discountPercent: 0,
        discountFixedUsd: 0,
      };
    },
  },
];

export interface SampleScenarioRecord {
  id: string;
  title: string;
  isSample: true;
  inputs: PromotionInputs;
}

/**
 * Three labeled SAMPLE DATA scenarios (20% Discount, Free Shipping, Buy 2 Get 1 Bundle)
 * built directly from EXAMPLE_BASELINE_INPUTS.
 */
export const SAMPLE_WORKSPACE_SCENARIOS: SampleScenarioRecord[] = [
  {
    id: 'sample-20-off',
    title: '20% Off Sitewide',
    isSample: true,
    inputs: OFFER_PRESETS[1].applyToBaseline(EXAMPLE_BASELINE_INPUTS),
  },
  {
    id: 'sample-free-shipping',
    title: 'Free Shipping Threshold',
    isSample: true,
    inputs: OFFER_PRESETS[2].applyToBaseline(EXAMPLE_BASELINE_INPUTS),
  },
  {
    id: 'sample-b2g1-bundle',
    title: 'Buy 2 Get 1 Bundle',
    isSample: true,
    inputs: OFFER_PRESETS[4].applyToBaseline(EXAMPLE_BASELINE_INPUTS),
  },
];
