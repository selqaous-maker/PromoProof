import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { cert, getApps, initializeApp as initAdminApp } from 'firebase-admin/app';
import { FieldValue, getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { createServer as createViteServer } from 'vite';
import { PRODUCT_CONFIG } from './src/config/brand.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

// Load Firebase project & database ID safely
const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = fs.existsSync(firebaseConfigPath)
  ? JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'))
  : { projectId: '', firestoreDatabaseId: '' };

// Initialize Firebase Admin SDK only when explicit service account credentials exist
let adminDb: ReturnType<typeof getAdminFirestore> | null = null;
try {
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (saJson && getApps().length === 0) {
    const parsed = JSON.parse(saJson);
    const adminApp = initAdminApp({ credential: cert(parsed) });
    adminDb = getAdminFirestore(adminApp, firebaseConfig.firestoreDatabaseId || undefined);
  }
} catch (err) {
  console.warn('Firebase Admin initialization skipped:', err instanceof Error ? err.message : err);
}

// Simple in-memory rate limiter for sensitive endpoints
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxPerMinute: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip || 'unknown'}:${req.path}`;
    const now = Date.now();
    const entry = rateBuckets.get(key);
    if (!entry || entry.resetAt < now) {
      rateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
      return next();
    }
    if (entry.count >= maxPerMinute) {
      return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
    }
    entry.count += 1;
    return next();
  };
}

// Cached Google public certificates for zero-dependency Firebase JWT verification
let cachedCerts: Record<string, string> = {};
let certsExpiresAt = 0;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  if (Date.now() < certsExpiresAt && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error('Unable to fetch Firebase public keys');
  }
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  cachedCerts = (await resp.json()) as Record<string, string>;
  certsExpiresAt = Date.now() + maxAgeSec * 1000;
  return cachedCerts;
}

interface VerifiedFirebaseToken {
  uid: string;
  email?: string;
  emailVerified: boolean;
}

async function verifyFirebaseBearerToken(authHeader?: string): Promise<VerifiedFirebaseToken | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8')) as {
      alg?: string;
      kid?: string;
    };
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as {
      aud?: string;
      iss?: string;
      sub?: string;
      exp?: number;
      email?: string;
      email_verified?: boolean;
    };

    if (header.alg !== 'RS256' || !header.kid) return null;
    if (!firebaseConfig.projectId) return null;
    if (payload.aud !== firebaseConfig.projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${firebaseConfig.projectId}`) return null;
    if (!payload.sub || !payload.exp || payload.exp * 1000 < Date.now()) return null;

    const certs = await getGooglePublicCerts();
    const certPem = certs[header.kid];
    if (!certPem) return null;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`);
    const sigBuffer = Buffer.from(parts[2], 'base64url');
    const valid = verifier.verify(certPem, sigBuffer);
    if (!valid) return null;

    return {
      uid: payload.sub,
      email: payload.email,
      emailVerified: Boolean(payload.email_verified),
    };
  } catch {
    return null;
  }
}

function getCheckoutStatus() {
  const lsHostedUrl = process.env.LEMON_SQUEEZY_CHECKOUT_URL || '';
  const lsApiKey = process.env.LEMON_SQUEEZY_API_KEY || '';
  const lsStoreId = process.env.LEMON_SQUEEZY_STORE_ID || '';
  const lsVariantId = process.env.LEMON_SQUEEZY_VARIANT_ID || '';
  const lsWebhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || '';

  const canCreateCheckout = Boolean(lsHostedUrl || (lsApiKey && lsStoreId && lsVariantId));
  const webhookConfigured = Boolean(lsWebhookSecret && adminDb);

  return {
    provider: 'lemonsqueezy',
    checkoutConnected: canCreateCheckout,
    webhookConfigured,
    lsHostedUrl,
    lsApiKey,
    lsStoreId,
    lsVariantId,
    lsWebhookSecret,
  };
}

export function verifyLemonSqueezySignature(
  rawBody: Buffer,
  signatureHex: string,
  secret: string
): boolean {
  if (!signatureHex || !secret) return false;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
  const signature = Buffer.from(signatureHex, 'utf8');
  if (digest.length !== signature.length) return false;
  return crypto.timingSafeEqual(digest, signature);
}

async function startServer() {
  const app = express();

  // Security headers compatible with iframe preview
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Raw-body webhook handler MUST be mounted before express.json()
  app.post(
    '/api/webhooks/lemonsqueezy',
    rateLimit(60),
    express.raw({ type: 'application/json' }),
    async (req: Request, res: Response) => {
      const status = getCheckoutStatus();
      if (!status.lsWebhookSecret) {
        return res.status(503).json({
          error: 'Webhook secret not configured (LEMON_SQUEEZY_WEBHOOK_SECRET missing).',
        });
      }

      const sigHeader = String(req.headers['x-signature'] || '');
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
      if (!verifyLemonSqueezySignature(rawBody, sigHeader, status.lsWebhookSecret)) {
        return res.status(401).json({ error: 'Invalid webhook signature.' });
      }

      if (!adminDb) {
        return res.status(503).json({
          error: 'Server Firestore Admin credentials not configured (FIREBASE_SERVICE_ACCOUNT_JSON missing).',
        });
      }

      try {
        const event = JSON.parse(rawBody.toString('utf-8')) as {
          meta?: {
            event_name?: string;
            custom_data?: { user_id?: string };
          };
          data?: {
            id?: string;
            attributes?: {
              order_number?: number;
              status?: string;
              user_email?: string;
              first_order_item?: { variant_id?: number; product_id?: number };
            };
          };
        };

        const eventName = event.meta?.event_name || '';
        const orderId = String(event.data?.id || '');
        const userId = event.meta?.custom_data?.user_id || '';
        const productId = String(
          event.data?.attributes?.first_order_item?.product_id || 'promoproof_pro'
        );

        if (!orderId) {
          return res.status(400).json({ error: 'Missing order ID in webhook payload.' });
        }

        const docId = `ls_${orderId}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
        const entRef = adminDb.collection('purchase_entitlements').doc(docId);

        if (eventName === 'order_created') {
          if (!userId) {
            return res.status(400).json({ error: 'Missing custom_data.user_id in order.' });
          }
          const existing = await entRef.get();
          if (existing.exists && existing.data()?.status === 'active') {
            return res.status(200).json({ ok: true, idempotent: true });
          }

          await entRef.set({
            id: docId,
            userId,
            provider: 'lemonsqueezy',
            providerOrderId: orderId,
            productId,
            status: 'active',
            activatedAt: FieldValue.serverTimestamp(),
          });
          return res.status(200).json({ ok: true, status: 'activated' });
        }

        if (eventName === 'order_refunded') {
          const existing = await entRef.get();
          if (existing.exists) {
            await entRef.update({
              status: 'refunded',
              revokedAt: FieldValue.serverTimestamp(),
            });
          }
          return res.status(200).json({ ok: true, status: 'refunded' });
        }

        return res.status(200).json({ ok: true, ignoredEvent: eventName });
      } catch (err) {
        console.error('Webhook processing error:', err);
        return res.status(500).json({ error: 'Webhook processing error.' });
      }
    }
  );

  app.use(express.json({ limit: '1mb' }));

  // Public safe brand, pricing & checkout connection status (NEVER returns secrets)
  app.get('/api/config/public', async (_req, res) => {
    const checkout = getCheckoutStatus();
    let settings = {
      brandName: PRODUCT_CONFIG.brandName,
      regularPriceUsd: PRODUCT_CONFIG.regularPriceUsd,
      activePromoPriceUsd: PRODUCT_CONFIG.activePromoPriceUsd,
      activePromoLabel: PRODUCT_CONFIG.activePromoLabel,
      supportEmail: PRODUCT_CONFIG.supportEmail,
      checkoutProvider: checkout.provider,
      checkoutConnected: checkout.checkoutConnected,
    };

    if (adminDb) {
      try {
        const snap = await adminDb.collection('admin_settings').doc('global').get();
        if (snap.exists) {
          const data = snap.data();
          if (data) {
            settings = {
              brandName: String(data.brandName || settings.brandName),
              regularPriceUsd: Number(data.regularPriceUsd || settings.regularPriceUsd),
              activePromoPriceUsd:
                data.activePromoPriceUsd !== undefined ? data.activePromoPriceUsd : null,
              activePromoLabel: data.activePromoLabel ?? null,
              supportEmail: String(data.supportEmail || settings.supportEmail),
              checkoutProvider: String(data.checkoutProvider || checkout.provider),
              checkoutConnected: checkout.checkoutConnected,
            };
          }
        }
      } catch {
        // Ignore read error and return central config defaults
      }
    }

    res.json(settings);
  });

  // Server-authoritative entitlement check
  app.get('/api/entitlement', rateLimit(60), async (req, res) => {
    const verifiedUser = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!verifiedUser || !verifiedUser.emailVerified) {
      return res.status(401).json({ error: 'Unauthorized', hasPro: false });
    }

    if (!adminDb) {
      return res.json({
        hasPro: false,
        serverVerified: false,
        note: 'Server Firestore Admin credentials not configured; client falls back to owner-scoped Firestore rules.',
      });
    }

    try {
      const snap = await adminDb
        .collection('purchase_entitlements')
        .where('userId', '==', verifiedUser.uid)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      return res.json({
        hasPro: !snap.empty,
        serverVerified: true,
      });
    } catch {
      return res.json({ hasPro: false, serverVerified: false });
    }
  });

  // Create provider checkout session (Lemon Squeezy API or owner-configured hosted URL)
  app.post('/api/checkout/session', rateLimit(20), async (req, res) => {
    const verifiedUser = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!verifiedUser || !verifiedUser.emailVerified) {
      return res.status(401).json({ error: 'Please sign in with a verified account first.' });
    }

    const checkout = getCheckoutStatus();
    if (!checkout.checkoutConnected) {
      return res.status(503).json({
        error: 'Checkout is not yet connected by the merchant owner.',
        checkoutConnected: false,
      });
    }

    const appUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

    if (checkout.lsApiKey && checkout.lsStoreId && checkout.lsVariantId) {
      try {
        const lsResp = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
          method: 'POST',
          headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            Authorization: `Bearer ${checkout.lsApiKey}`,
          },
          body: JSON.stringify({
            data: {
              type: 'checkouts',
              attributes: {
                checkout_data: {
                  email: verifiedUser.email,
                  custom: {
                    user_id: verifiedUser.uid,
                  },
                },
                product_options: {
                  redirect_url: `${appUrl}/checkout/success`,
                },
              },
              relationships: {
                store: { data: { type: 'stores', id: checkout.lsStoreId } },
                variant: { data: { type: 'variants', id: checkout.lsVariantId } },
              },
            },
          }),
        });

        const payload = (await lsResp.json()) as {
          data?: { attributes?: { url?: string } };
        };
        const url = payload?.data?.attributes?.url;
        if (!lsResp.ok || !url) {
          return res.status(502).json({ error: 'Lemon Squeezy checkout creation failed.' });
        }
        return res.json({ checkoutUrl: url });
      } catch {
        return res.status(502).json({ error: 'Unable to reach Lemon Squeezy checkout API.' });
      }
    }

    // Fallback to owner-provided hosted Lemon Squeezy checkout URL with custom user_id param
    const hosted = new URL(checkout.lsHostedUrl);
    hosted.searchParams.set('checkout[custom][user_id]', verifiedUser.uid);
    if (verifiedUser.email) {
      hosted.searchParams.set('checkout[email]', verifiedUser.email);
    }
    return res.json({ checkoutUrl: hosted.toString() });
  });

  // Frontend Vite middleware in dev; static dist/ in production
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} (${IS_PROD ? 'prod' : 'dev'})`);
  });
}

startServer();
