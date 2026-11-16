import { PRODUCT_CONFIG } from '../config/brand';

interface BrandMarkProps {
  nameOverride?: string;
  size?: 'sm' | 'md';
}

export function BrandMark({ nameOverride, size = 'md' }: BrandMarkProps) {
  const brandName = nameOverride || PRODUCT_CONFIG.brandName;
  const iconSize = size === 'sm' ? 'w-6 h-6' : 'w-7 h-7';
  const textSize = size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      <svg
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className={iconSize}
      >
        <path
          d="M16 3.5L26.5 7.6V15.4C26.5 21.6 22 26.7 16 28.5C10 26.7 5.5 21.6 5.5 15.4V7.6L16 3.5Z"
          fill="#111C2E"
          stroke="#5EE4A4"
          strokeWidth="2"
        />
        <path
          d="M11.8 16.2L14.7 19.1L20.6 12.9"
          stroke="#5EE4A4"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`${textSize} font-bold tracking-tight text-[#F8FAFC]`}>
        {brandName}
      </span>
    </span>
  );
}
