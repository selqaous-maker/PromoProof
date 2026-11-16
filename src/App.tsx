import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ForgotPasswordPage, LoginPage, SignupPage } from './pages/AuthPages';
import { CheckoutCancelPage, CheckoutSuccessPage } from './pages/CheckoutPages';
import { DashboardPage } from './pages/DashboardPage';
import { DemoPage } from './pages/DemoPage';
import { FaqPage } from './pages/FaqPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { LandingPage } from './pages/LandingPage';
import {
  ContactPage,
  PrivacyPage,
  RefundPolicyPage,
  TermsPage,
} from './pages/LegalPages';
import { OnboardingPage } from './pages/OnboardingPage';
import { PricingPage } from './pages/PricingPage';
import { ReportsPage } from './pages/ReportsPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { SettingsPage } from './pages/SettingsPage';

function ScrollToTopAndTitle() {
  const { pathname } = useLocation();
  const { publicConfig } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
    const brand = publicConfig.brandName;
    const titles: Record<string, string> = {
      '/': `${brand} — Know Your Profit Before You Launch a Promotion`,
      '/demo': `Free Promotion Calculator — ${brand}`,
      '/features': `How It Works — ${brand}`,
      '/pricing': `Pricing — ${brand}`,
      '/faq': `FAQ & Methodology — ${brand}`,
      '/login': `Sign In — ${brand}`,
      '/signup': `Create Account — ${brand}`,
      '/app/dashboard': `Dashboard — ${brand}`,
      '/app/onboarding': `Store Onboarding — ${brand}`,
      '/app/scenarios': `Scenario Lab — ${brand}`,
      '/app/reports': `Reports & Exports — ${brand}`,
      '/app/settings': `Account Settings — ${brand}`,
    };
    document.title = titles[pathname] || brand;
  }, [pathname, publicConfig.brandName]);

  return null;
}

function AppRoutes() {
  const {
    user,
    isVerified,
    hasProEntitlement,
    publicConfig,
    getIdToken,
  } = useAuth();

  const isAuthenticated = Boolean(user && isVerified);

  return (
    <>
      <ScrollToTopAndTitle />
      <Routes>
        <Route
          path="/"
          element={
            <LandingPage
              brandName={publicConfig.brandName}
              regularPriceUsd={publicConfig.regularPriceUsd}
              activePromoPriceUsd={publicConfig.activePromoPriceUsd}
              isAuthenticated={isAuthenticated}
            />
          }
        />
        <Route
          path="/demo"
          element={
            <DemoPage
              brandName={publicConfig.brandName}
              isAuthenticated={isAuthenticated}
            />
          }
        />
        <Route
          path="/features"
          element={
            <FeaturesPage
              brandName={publicConfig.brandName}
              isAuthenticated={isAuthenticated}
            />
          }
        />
        <Route
          path="/pricing"
          element={
            <PricingPage
              brandName={publicConfig.brandName}
              regularPriceUsd={publicConfig.regularPriceUsd}
              activePromoPriceUsd={publicConfig.activePromoPriceUsd}
              activePromoLabel={publicConfig.activePromoLabel}
              checkoutConnected={publicConfig.checkoutConnected}
              checkoutProviderName={publicConfig.checkoutProvider}
              isAuthenticated={isAuthenticated}
              hasProEntitlement={hasProEntitlement}
              userEmail={user?.email}
              userId={user?.uid}
              getIdToken={getIdToken}
            />
          }
        />
        <Route
          path="/faq"
          element={
            <FaqPage
              brandName={publicConfig.brandName}
              regularPriceUsd={publicConfig.regularPriceUsd}
              activePromoPriceUsd={publicConfig.activePromoPriceUsd}
              isAuthenticated={isAuthenticated}
            />
          }
        />

        {/* Legal & Support */}
        <Route
          path="/privacy"
          element={
            <PrivacyPage
              brandName={publicConfig.brandName}
              supportEmail={publicConfig.supportEmail}
              isAuthenticated={isAuthenticated}
            />
          }
        />
        <Route
          path="/terms"
          element={
            <TermsPage
              brandName={publicConfig.brandName}
              supportEmail={publicConfig.supportEmail}
              isAuthenticated={isAuthenticated}
            />
          }
        />
        <Route
          path="/refund-policy"
          element={
            <RefundPolicyPage
              brandName={publicConfig.brandName}
              supportEmail={publicConfig.supportEmail}
              isAuthenticated={isAuthenticated}
            />
          }
        />
        <Route
          path="/contact"
          element={
            <ContactPage
              brandName={publicConfig.brandName}
              supportEmail={publicConfig.supportEmail}
              isAuthenticated={isAuthenticated}
            />
          }
        />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Checkout Status */}
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />

        {/* Authenticated Product */}
        <Route path="/app/onboarding" element={<OnboardingPage />} />
        <Route path="/app/dashboard" element={<DashboardPage />} />
        <Route path="/app/scenarios" element={<ScenariosPage />} />
        <Route path="/app/scenarios/new" element={<ScenariosPage createMode />} />
        <Route path="/app/reports" element={<ReportsPage />} />
        <Route path="/app/settings" element={<SettingsPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
