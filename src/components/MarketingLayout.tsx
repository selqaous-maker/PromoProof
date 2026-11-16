import { Menu, X } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PRODUCT_CONFIG } from '../config/brand';
import { BrandMark } from './BrandMark';

interface MarketingLayoutProps {
  children: ReactNode;
  brandName?: string;
  isAuthenticated?: boolean;
}

export function MarketingLayout({
  children,
  brandName,
  isAuthenticated = false,
}: MarketingLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const activeBrand = brandName || PRODUCT_CONFIG.brandName;

  const navItems = [
    { label: 'How it works', to: '/features' },
    { label: 'Demo', to: '/demo' },
    { label: 'Pricing', to: '/pricing' },
    { label: 'FAQ', to: '/faq' },
    {
      label: isAuthenticated ? 'Workspace' : 'Sign in',
      to: isAuthenticated ? '/app/dashboard' : '/login',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1220] text-[#F8FAFC]">
      <header className="sticky top-0 z-40 bg-[#0B1220]/95 backdrop-blur-sm border-b border-[#263449] no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EE4A4] rounded-md"
            onClick={() => setMobileOpen(false)}
          >
            <BrandMark nameOverride={activeBrand} />
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#9CAFC6]"
          >
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EE4A4] rounded px-1 py-1 ${
                    isActive ? 'text-[#F8FAFC]' : ''
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center shrink-0">
            <Link
              to="/demo"
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#5EE4A4] text-[#0B1220] hover:bg-[#4AD493] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EE4A4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]"
            >
              Try the free calculator
            </Link>
          </div>

          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-[#263449] text-[#F8FAFC] hover:bg-[#111C2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EE4A4]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-[#263449] bg-[#0B1220] px-4 py-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-3 rounded-lg text-base font-medium text-[#F8FAFC] hover:bg-[#111C2E]"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2">
              <Link
                to="/demo"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center px-4 py-3 text-sm font-semibold rounded-lg bg-[#5EE4A4] text-[#0B1220] hover:bg-[#4AD493]"
              >
                Try the free calculator
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#263449] bg-[#0B1220] no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[#263449]">
            <div className="md:col-span-2 space-y-3">
              <BrandMark nameOverride={activeBrand} size="sm" />
              <p className="text-sm text-[#9CAFC6] max-w-md leading-relaxed">
                Pre-launch unit-economics and promotion modeling for independent e-commerce
                merchants. All calculations reflect user-entered assumptions—not accounting, tax,
                or guaranteed profit advice.
              </p>
            </div>

            <div className="space-y-2.5 text-sm">
              <p className="font-semibold text-[#F8FAFC]">Product</p>
              <ul className="space-y-2 text-[#9CAFC6]">
                <li>
                  <Link to="/demo" className="hover:text-[#F8FAFC] transition-colors">
                    Free Calculator
                  </Link>
                </li>
                <li>
                  <Link to="/features" className="hover:text-[#F8FAFC] transition-colors">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="hover:text-[#F8FAFC] transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="hover:text-[#F8FAFC] transition-colors">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5 text-sm">
              <p className="font-semibold text-[#F8FAFC]">Legal &amp; Support</p>
              <ul className="space-y-2 text-[#9CAFC6]">
                <li>
                  <Link to="/contact" className="hover:text-[#F8FAFC] transition-colors">
                    Contact Support
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-[#F8FAFC] transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-[#F8FAFC] transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/refund-policy" className="hover:text-[#F8FAFC] transition-colors">
                    Refund Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#9CAFC6]">
            <p>
              &copy; {PRODUCT_CONFIG.copyrightYear} {activeBrand} (Internal working name).{' '}
              {PRODUCT_CONFIG.isLegalPlaceholder
                ? 'Legal entity details pending owner review before launch.'
                : PRODUCT_CONFIG.legalEntityName}
            </p>
            <p>Estimation software only · USD default</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
