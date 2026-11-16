/**
 * Central Brand, Pricing & Legal Configuration
 *
 * IMPORTANT BRAND NOTE:
 * "PromoProof" is an INTERNAL WORKING NAME ONLY.
 * Change PRODUCT_CONFIG below in one place before public launch once final
 * trademark/name clearance and business entity details are finalized.
 */

export interface ProductConfig {
  brandName: string;
  tagline: string;
  subheadline: string;
  positioning: string;
  currency: 'USD';
  regularPriceUsd: number;
  activePromoPriceUsd: number | null; // Set to a number (e.g. 49) only when a genuine owner offer is active
  activePromoLabel: string | null;
  supportEmail: string;
  legalEntityName: string;
  legalJurisdiction: string;
  businessAddressPlaceholder: string;
  isLegalPlaceholder: boolean;
  copyrightYear: number;
}

export const PRODUCT_CONFIG: ProductConfig = {
  brandName: 'PromoProof',
  tagline: 'Know your profit before you launch a promotion.',
  subheadline:
    'Model discounts, shipping offers, bundles, ad costs, and returns before they eat your margin.',
  positioning: 'The pre-launch reality check for your next discount.',
  currency: 'USD',
  regularPriceUsd: 79,
  activePromoPriceUsd: null,
  activePromoLabel: null,
  supportEmail: 'support@example.com',
  legalEntityName: '[OWNER REVIEW REQUIRED: Legal Business Entity Name]',
  legalJurisdiction: '[OWNER REVIEW REQUIRED: State / Country Jurisdiction]',
  businessAddressPlaceholder: '[OWNER REVIEW REQUIRED: Registered Business Address]',
  isLegalPlaceholder: true,
  copyrightYear: 2026,
};

export function getDisplayPriceUsd(override?: {
  regularPriceUsd?: number;
  activePromoPriceUsd?: number | null;
}): { currentPriceUsd: number; regularPriceUsd: number; hasActiveOffer: boolean } {
  const regular = override?.regularPriceUsd ?? PRODUCT_CONFIG.regularPriceUsd;
  const promo =
    override?.activePromoPriceUsd !== undefined
      ? override.activePromoPriceUsd
      : PRODUCT_CONFIG.activePromoPriceUsd;

  if (typeof promo === 'number' && promo > 0 && promo < regular) {
    return {
      currentPriceUsd: promo,
      regularPriceUsd: regular,
      hasActiveOffer: true,
    };
  }

  return {
    currentPriceUsd: regular,
    regularPriceUsd: regular,
    hasActiveOffer: false,
  };
}
