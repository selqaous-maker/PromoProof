import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { PRODUCT_CONFIG } from '../config/brand';
import { OfferType, PromotionInputs } from '../engine/types';
import { db, handleFirestoreError, OperationType } from './firebase';

export interface UserProfileDoc {
  id: string;
  email: string;
  displayName: string;
  preferredCurrency: 'USD';
  onboardingCompleted: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface StoreDoc {
  id: string;
  ownerId: string;
  name: string;
  currency: 'USD';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CostProfileDoc {
  id: string;
  ownerId: string;
  storeId: string;
  version: number;
  inputs: PromotionInputs;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ScenarioDoc {
  id: string;
  ownerId: string;
  storeId: string;
  title: string;
  isSample: boolean;
  offerType: OfferType;
  offerValue: number;
  inputSnapshot: PromotionInputs;
  assumptionsNote: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PurchaseEntitlementDoc {
  id: string;
  userId: string;
  provider: string;
  providerOrderId: string;
  productId: string;
  status: 'active' | 'refunded' | 'revoked';
  activatedAt?: Timestamp;
  revokedAt?: Timestamp;
}

export interface AdminSettingsDoc {
  id: string;
  brandName: string;
  regularPriceUsd: number;
  activePromoPriceUsd: number | null;
  activePromoLabel: string | null;
  supportEmail: string;
  checkoutProvider: string;
  checkoutConnected: boolean;
  updatedAt?: Timestamp;
}

function clampString(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

export function generateSafeId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/[^a-zA-Z0-9_-]/g, '')
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${randomPart}`.slice(0, 120);
}

export async function ensureUserProfile(
  uid: string,
  email: string,
  displayName: string
): Promise<UserProfileDoc> {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfileDoc;
    }
    const payload = {
      id: uid,
      email: clampString(email, 254),
      displayName: clampString(displayName || email.split('@')[0] || 'Merchant', 120),
      preferredCurrency: 'USD' as const,
      onboardingCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload);
    const created = await getDoc(ref);
    return created.data() as UserProfileDoc;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: { displayName?: string; onboardingCompleted?: boolean }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const patch: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.displayName !== undefined) {
      patch.displayName = clampString(updates.displayName, 120);
    }
    if (updates.onboardingCompleted !== undefined) {
      patch.onboardingCompleted = updates.onboardingCompleted;
    }
    await updateDoc(doc(db, 'users', uid), patch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function upsertStoreAndCostProfile(
  uid: string,
  storeName: string,
  inputs: PromotionInputs,
  existingStoreId?: string,
  existingProfileId?: string,
  existingVersion = 1
): Promise<{ storeId: string; profileId: string }> {
  const storeId = existingStoreId || generateSafeId('store');
  const profileId = existingProfileId || generateSafeId('prof');
  const cleanName = clampString(storeName || 'My E-Commerce Store', 120);

  try {
    if (existingStoreId) {
      await updateDoc(doc(db, 'stores', storeId), {
        name: cleanName,
        currency: 'USD',
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'stores', storeId), {
        id: storeId,
        ownerId: uid,
        name: cleanName,
        currency: 'USD',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    if (existingProfileId) {
      await updateDoc(doc(db, 'cost_profiles', profileId), {
        version: existingVersion + 1,
        inputs: { ...inputs },
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'cost_profiles', profileId), {
        id: profileId,
        ownerId: uid,
        storeId,
        version: 1,
        inputs: { ...inputs },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await updateUserProfile(uid, { onboardingCompleted: true });
    return { storeId, profileId };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `stores/${storeId}`);
  }
}

export async function createScenario(
  uid: string,
  storeId: string,
  params: {
    title: string;
    isSample: boolean;
    offerType: OfferType;
    offerValue: number;
    inputSnapshot: PromotionInputs;
    assumptionsNote?: string;
  }
): Promise<string> {
  const id = generateSafeId('scen');
  const path = `scenarios/${id}`;
  try {
    await setDoc(doc(db, 'scenarios', id), {
      id,
      ownerId: uid,
      storeId,
      title: clampString(params.title || 'Untitled Scenario', 120),
      isSample: params.isSample,
      offerType: params.offerType,
      offerValue: Math.max(0, Number(params.offerValue) || 0),
      inputSnapshot: { ...params.inputSnapshot },
      assumptionsNote: clampString(params.assumptionsNote || 'Manual unit-economics assumptions', 500),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateScenario(
  scenarioId: string,
  params: {
    title: string;
    isSample: boolean;
    offerType: OfferType;
    offerValue: number;
    inputSnapshot: PromotionInputs;
    assumptionsNote?: string;
  }
): Promise<void> {
  const path = `scenarios/${scenarioId}`;
  try {
    await updateDoc(doc(db, 'scenarios', scenarioId), {
      title: clampString(params.title || 'Untitled Scenario', 120),
      isSample: params.isSample,
      offerType: params.offerType,
      offerValue: Math.max(0, Number(params.offerValue) || 0),
      inputSnapshot: { ...params.inputSnapshot },
      assumptionsNote: clampString(params.assumptionsNote || 'Manual unit-economics assumptions', 500),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteScenario(scenarioId: string): Promise<void> {
  const path = `scenarios/${scenarioId}`;
  try {
    await deleteDoc(doc(db, 'scenarios', scenarioId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createDeletionRequest(
  uid: string,
  email: string,
  reason: string
): Promise<void> {
  const id = generateSafeId('delreq');
  const path = `deletion_requests/${id}`;
  try {
    await setDoc(doc(db, 'deletion_requests', id), {
      id,
      userId: uid,
      email: clampString(email, 254),
      reason: clampString(reason || 'User requested account & data deletion', 500),
      status: 'requested',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function saveAdminSettings(settings: {
  brandName: string;
  regularPriceUsd: number;
  activePromoPriceUsd: number | null;
  activePromoLabel: string | null;
  supportEmail: string;
  checkoutProvider: string;
  checkoutConnected: boolean;
}): Promise<void> {
  const path = 'admin_settings/global';
  try {
    await setDoc(doc(db, 'admin_settings', 'global'), {
      id: 'global',
      brandName: clampString(settings.brandName || PRODUCT_CONFIG.brandName, 80),
      regularPriceUsd: Math.max(1, Number(settings.regularPriceUsd) || 79),
      activePromoPriceUsd:
        settings.activePromoPriceUsd !== null && settings.activePromoPriceUsd > 0
          ? Number(settings.activePromoPriceUsd)
          : null,
      activePromoLabel: settings.activePromoLabel
        ? clampString(settings.activePromoLabel, 80)
        : null,
      supportEmail: clampString(settings.supportEmail || PRODUCT_CONFIG.supportEmail, 254),
      checkoutProvider: clampString(settings.checkoutProvider || 'lemonsqueezy', 40),
      checkoutConnected: Boolean(settings.checkoutConnected),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchUserStoresAndProfiles(uid: string): Promise<{
  stores: StoreDoc[];
  profiles: CostProfileDoc[];
}> {
  try {
    const storesSnap = await getDocs(query(collection(db, 'stores'), where('ownerId', '==', uid)));
    const profilesSnap = await getDocs(
      query(collection(db, 'cost_profiles'), where('ownerId', '==', uid))
    );
    return {
      stores: storesSnap.docs.map((d) => d.data() as StoreDoc),
      profiles: profilesSnap.docs.map((d) => d.data() as CostProfileDoc),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'stores');
  }
}

export function subscribeUserWorkspace(
  uid: string,
  callbacks: {
    onStores: (stores: StoreDoc[]) => void;
    onProfiles: (profiles: CostProfileDoc[]) => void;
    onScenarios: (scenarios: ScenarioDoc[]) => void;
    onEntitlements: (entitlements: PurchaseEntitlementDoc[]) => void;
    onError: (err: Error) => void;
  }
): () => void {
  const unsubStores = onSnapshot(
    query(collection(db, 'stores'), where('ownerId', '==', uid)),
    (snap) => callbacks.onStores(snap.docs.map((d) => d.data() as StoreDoc)),
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'stores');
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  const unsubProfiles = onSnapshot(
    query(collection(db, 'cost_profiles'), where('ownerId', '==', uid)),
    (snap) => callbacks.onProfiles(snap.docs.map((d) => d.data() as CostProfileDoc)),
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'cost_profiles');
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  const unsubScenarios = onSnapshot(
    query(collection(db, 'scenarios'), where('ownerId', '==', uid)),
    (snap) => {
      const list = snap.docs.map((d) => d.data() as ScenarioDoc);
      list.sort((a, b) => {
        const aSec = a.updatedAt?.seconds ?? 0;
        const bSec = b.updatedAt?.seconds ?? 0;
        return bSec - aSec;
      });
      callbacks.onScenarios(list);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'scenarios');
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  const unsubEntitlements = onSnapshot(
    query(collection(db, 'purchase_entitlements'), where('userId', '==', uid)),
    (snap) => callbacks.onEntitlements(snap.docs.map((d) => d.data() as PurchaseEntitlementDoc)),
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'purchase_entitlements');
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  return () => {
    unsubStores();
    unsubProfiles();
    unsubScenarios();
    unsubEntitlements();
  };
}
