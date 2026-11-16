import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { PRODUCT_CONFIG } from '../config/brand';
import { auth, googleProvider } from '../lib/firebase';
import {
  CostProfileDoc,
  ensureUserProfile,
  PurchaseEntitlementDoc,
  ScenarioDoc,
  StoreDoc,
  subscribeUserWorkspace,
  UserProfileDoc,
} from '../lib/firestoreRepo';

export interface PublicAppConfig {
  brandName: string;
  regularPriceUsd: number;
  activePromoPriceUsd: number | null;
  activePromoLabel: string | null;
  supportEmail: string;
  checkoutProvider: string;
  checkoutConnected: boolean;
}

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  isVerified: boolean;
  isAdmin: boolean;
  profile: UserProfileDoc | null;
  stores: StoreDoc[];
  costProfiles: CostProfileDoc[];
  scenarios: ScenarioDoc[];
  entitlements: PurchaseEntitlementDoc[];
  hasProEntitlement: boolean;
  canAccessProFeatures: boolean;
  workspaceLoading: boolean;
  workspaceError: string | null;
  publicConfig: PublicAppConfig;
  refreshPublicConfig: () => Promise<void>;
  refreshEntitlementFromServer: () => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUserVerification: () => Promise<boolean>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const DEFAULT_PUBLIC_CONFIG: PublicAppConfig = {
  brandName: PRODUCT_CONFIG.brandName,
  regularPriceUsd: PRODUCT_CONFIG.regularPriceUsd,
  activePromoPriceUsd: PRODUCT_CONFIG.activePromoPriceUsd,
  activePromoLabel: PRODUCT_CONFIG.activePromoLabel,
  supportEmail: PRODUCT_CONFIG.supportEmail,
  checkoutProvider: 'lemonsqueezy',
  checkoutConnected: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);
  const [stores, setStores] = useState<StoreDoc[]>([]);
  const [costProfiles, setCostProfiles] = useState<CostProfileDoc[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioDoc[]>([]);
  const [entitlements, setEntitlements] = useState<PurchaseEntitlementDoc[]>([]);
  const [serverHasPro, setServerHasPro] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [publicConfig, setPublicConfig] = useState<PublicAppConfig>(DEFAULT_PUBLIC_CONFIG);

  const refreshPublicConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config/public');
      if (res.ok) {
        const data = await res.json();
        setPublicConfig((prev) => ({
          ...prev,
          ...data,
        }));
      }
    } catch {
      // Keep central config defaults if server route unavailable
    }
  }, []);

  useEffect(() => {
    refreshPublicConfig();
  }, [refreshPublicConfig]);

  const getIdToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  }, []);

  const refreshEntitlementFromServer = useCallback(async () => {
    if (!auth.currentUser) {
      setServerHasPro(false);
      return false;
    }
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/entitlement', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const active = Boolean(data.hasPro);
        setServerHasPro(active);
        return active;
      }
    } catch {
      // Fall back to Firestore entitlement listener
    }
    return false;
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);

      if (!nextUser) {
        setProfile(null);
        setStores([]);
        setCostProfiles([]);
        setScenarios([]);
        setEntitlements([]);
        setServerHasPro(false);
        setWorkspaceLoading(false);
        setWorkspaceError(null);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user || !user.emailVerified) {
      setWorkspaceLoading(false);
      return;
    }

    let unsubWorkspace: (() => void) | undefined;
    let active = true;

    const initUser = async () => {
      setWorkspaceLoading(true);
      setWorkspaceError(null);
      try {
        const userProf = await ensureUserProfile(
          user.uid,
          user.email || '',
          user.displayName || ''
        );
        if (!active) return;
        setProfile(userProf);

        unsubWorkspace = subscribeUserWorkspace(user.uid, {
          onStores: (s) => {
            setStores(s);
            setWorkspaceLoading(false);
          },
          onProfiles: (p) => setCostProfiles(p),
          onScenarios: (sc) => setScenarios(sc),
          onEntitlements: (ent) => setEntitlements(ent),
          onError: (err) => {
            setWorkspaceError(err.message);
            setWorkspaceLoading(false);
          },
        });

        await refreshEntitlementFromServer();
      } catch (err) {
        if (active) {
          setWorkspaceError(err instanceof Error ? err.message : 'Unable to load workspace');
          setWorkspaceLoading(false);
        }
      }
    };

    initUser();

    return () => {
      active = false;
      if (unsubWorkspace) unsubWorkspace();
    };
  }, [user, user?.emailVerified, refreshEntitlementFromServer]);

  const isVerified = Boolean(user?.emailVerified);
  const isAdmin = Boolean(user?.emailVerified && user.email === 'sarinasel90@gmail.com');
  const firestoreHasPro = entitlements.some((e) => e.status === 'active');
  const hasProEntitlement = firestoreHasPro || serverHasPro;
  const canAccessProFeatures = hasProEntitlement || isAdmin;

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }
    await sendEmailVerification(cred.user);
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const refreshUserVerification = async () => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    setUser({ ...auth.currentUser } as User);
    return auth.currentUser.emailVerified;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        isVerified,
        isAdmin,
        profile,
        stores,
        costProfiles,
        scenarios,
        entitlements,
        hasProEntitlement,
        canAccessProFeatures,
        workspaceLoading,
        workspaceError,
        publicConfig,
        refreshPublicConfig,
        refreshEntitlementFromServer,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        resendVerificationEmail,
        refreshUserVerification,
        signOut,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
