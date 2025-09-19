// scripts/update_prices_core.js
// Core function to update prices. Used by both one-off runner and HTTP route.

import admin from "firebase-admin";

function initFirebaseAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE_* secrets");
  }

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }
  return admin.firestore();
}

/**
 * Random-walk step: price_t+1 = price_t * (1 + N(mu, sigma))
 * - mu ~ 0 (drift 0.00–0.02% per step)
 * - sigma ~ 0.10–0.30% per step (tunable)
 */
function stepPrice(p) {
  const drift = (Math.random() - 0.5) * 0.0004; // ~[-0.02%, +0.02%]
  const vol = 0.0015 + Math.random() * 0.0015;  // 0.15%–0.30%
  // Approx normal via sum of uniforms (quick and dirty)
  const u = (Math.random() + Math.random() + Math.random() + Math.random() - 2);
  const shock = u * vol + drift;
  let next = p * (1 + shock);
  if (next <= 0) next = p * 0.98; // clamp if something goes weird
  return +next.toFixed(6);
}

export async function tickUpdatePrices({ log = console.log } = {}) {
  const db = initFirebaseAdmin();
  const now = admin.firestore.FieldValue.serverTimestamp();

  const snap = await db.collection("prices").get();
  if (snap.empty) {
    log("No prices docs found. Did you run the seed?");
    return { updated: 0 };
  }

  let updated = 0;
  const batch = db.batch();

  snap.forEach((doc) => {
    const d = doc.data();
    const current = typeof d.price === "number" ? d.price : parseFloat(d.price);
    if (!current || Number.isNaN(current)) return;

    const next = stepPrice(current);
    batch.update(doc.ref, {
      price: next,
      asOf: now,
      source: "mock",
    });
    updated++;
  });

  await batch.commit();
  log(`Prices updated: ${updated}`);
  return { updated };
}