import {
  FileText,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  PlusCircle,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { ReactNode, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandMark } from './BrandMark';

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function AppShell({ title, subtitle, children, actions }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const {
    user,
    authReady,
    isVerified,
    isAdmin,
    hasProEntitlement,
    stores,
    publicConfig,
    signOut,
  } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC] flex items-center justify-center p-6">
        <div className="space-y-3 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#5EE4A4] border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-[#9CAFC6]">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!user || !isVerified) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const activeStore = stores[0];

  const navLinks = [
    { label: 'Dashboard', to: '/app/dashboard', Icon: LayoutDashboard },
    { label: 'Scenarios', to: '/app/scenarios', Icon: Layers },
    { label: 'New Offer', to: '/app/scenarios/new', Icon: PlusCircle },
    { label: 'Reports & Export', to: '/app/reports', Icon: FileText },
    { label: 'Onboarding', to: '/app/onboarding', Icon: SlidersHorizontal },
    { label: 'Settings', to: '/app/settings', Icon: Settings },
  ];

  const accessBadge = hasProEntitlement
    ? { label: 'Pro Active', style: 'text-[#34D399] border-[#34D399]/40 bg-[#34D399]/10' }
    : isAdmin
      ? { label: 'Owner Admin', style: 'text-[#5EE4A4] border-[#5EE4A4]/40 bg-[#5EE4A4]/10' }
      : { label: 'Free Account', style: 'text-[#FBBF24] border-[#FBBF24]/40 bg-[#FBBF24]/10' };

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC] flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-[#263449] bg-[#0B1220] no-print">
        <div className="h-16 px-5 flex items-center border-b border-[#263449]">
          <Link to="/" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EE4A4] rounded">
            <BrandMark nameOverride={publicConfig.brandName} size="sm" />
          </Link>
        </div>

        <div className="p-4 border-b border-[#263449]">
          <p className="text-xs text-[#9CAFC6]">Active store</p>
          <p className="text-sm font-semibold text-[#F8FAFC] truncate mt-0.5">
            {activeStore ? activeStore.name : 'Setup pending'}
          </p>
          <div className="mt-2.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${accessBadge.style}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              {accessBadge.label}
            </span>
          </div>
        </div>

        <nav aria-label="Workspace navigation" className="flex-1 p-3 space-y-1">
          {navLinks.map(({ label, to, Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#111C2E] text-[#5EE4A4] border border-[#263449]'
                    : 'text-[#9CAFC6] hover:text-[#F8FAFC] hover:bg-[#111C2E]/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#263449] space-y-2">
          <p className="text-xs text-[#9CAFC6] truncate" title={user.email || ''}>
            {user.email}
          </p>
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#9CAFC6] hover:text-[#F8FAFC] hover:bg-[#111C2E] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Mobile/Contextual Header */}
        <header className="sticky top-0 z-30 h-16 bg-[#0B1220]/95 backdrop-blur-sm border-b border-[#263449] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label={mobileNavOpen ? 'Close workspace menu' : 'Open workspace menu'}
              onClick={() => setMobileNavOpen((prev) => !prev)}
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-[#263449] text-[#F8FAFC] hover:bg-[#111C2E]"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[#F8FAFC] truncate">{title}</h1>
              {subtitle && (
                <p className="hidden sm:block text-xs text-[#9CAFC6] truncate">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {actions}
            {!hasProEntitlement && !isAdmin && (
              <Link
                to="/pricing"
                className="px-3.5 py-2 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-xs font-semibold hover:bg-[#4AD493] whitespace-nowrap shrink-0"
              >
                Upgrade Pro
              </Link>
            )}
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileNavOpen && (
          <div className="lg:hidden border-b border-[#263449] bg-[#111C2E] px-4 py-3 space-y-1 no-print">
            {navLinks.map(({ label, to, Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                  location.pathname === to
                    ? 'bg-[#0B1220] text-[#5EE4A4]'
                    : 'text-[#F8FAFC] hover:bg-[#0B1220]/60'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ))}
            <button
              type="button"
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-[#9CAFC6] hover:text-[#F8FAFC]"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-20 lg:pb-12">
          {children}
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav
          aria-label="Mobile quick navigation"
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0B1220]/95 backdrop-blur-sm border-t border-[#263449] grid grid-cols-4 h-14 no-print"
        >
          {[
            { label: 'Home', to: '/app/dashboard', Icon: LayoutDashboard },
            { label: 'Scenarios', to: '/app/scenarios', Icon: Layers },
            { label: 'New', to: '/app/scenarios/new', Icon: PlusCircle },
            { label: 'Reports', to: '/app/reports', Icon: FileText },
          ].map(({ label, to, Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                  active ? 'text-[#5EE4A4]' : 'text-[#9CAFC6]'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
