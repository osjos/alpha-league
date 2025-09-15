// scripts/seed.js
// Seeds Firestore EMULATOR using Admin SDK (bypasses rules)
// Make sure the emulators are running (npm run emu) before running this.

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// ----- Emulator env -----
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

// Use a throwaway projectId for emulators
initializeApp({ projectId: 'alpha-league-emulator' });

const db = getFirestore();

async function seed() {
  // Timestamps
  const now = new Date();
  const toDate = (d) => d instanceof Date ? d : new Date(d);

  // --- traders ---
  const traders = [
    {
      uid: 'trader_olof',
      handle: 'olof',
      display_name: 'Olof S',
      bio: 'Nordic trader focusing on BTC & MAG7 spreads.',
      role: 'trader',
      status: 'active',
      kyc_verified: true,
      created_at: now,
      pnl_30d: 4.2,
      pnl_365d: 37.5,
    },
    {
      uid: 'admin_alexa',
      handle: 'alexa',
      display_name: 'Alexa (Admin)',
      bio: 'Reviewer / compliance.',
      role: 'admin',
      status: 'active',
      kyc_verified: true,
      created_at: now,
    },
  ];

  for (const t of traders) {
    await db.collection('traders').doc(t.uid).set({ ...t, uid: t.uid });
  }

  // --- ideas ---
  const ideas = [
    {
      id: 'idea_draft_1',
      trader_id: 'trader_olof',
      title: 'BTC breakout with risk-managed trailing SL',
      thesis: 'Momentum continuation after consolidation.',
      symbols: ['BTC-USD'],
      side: 'long',
      entry: 62000,
      tp: 69000,
      sl: 58500,
      risk: 3,
      status: 'draft',
      visibility: 'private',
      tags: ['momentum', 'btc'],
      version: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'idea_submitted_1',
      trader_id: 'trader_olof',
      title: 'NVDA mean reversion scalp',
      thesis: 'Overextension on earnings gap; intraday fade.',
      symbols: ['NVDA'],
      side: 'short',
      entry: 120,
      tp: 112,
      sl: 124,
      risk: 2,
      status: 'submitted',
      visibility: 'private',
      tags: ['equities', 'scalp'],
      version: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'idea_approved_1',
      trader_id: 'trader_olof',
      title: 'BTC/MAG7 relative strength rotation',
      thesis: 'Alloc shift toward BTC as Mag7 stalls.',
      symbols: ['BTC-USD', 'MAG7'],
      side: 'long',
      entry: 63000,
      tp: 72000,
      sl: 60000,
      risk: 3,
      status: 'approved',
      visibility: 'public',
      tags: ['rotation', 'btc', 'mag7'],
      version: 1,
      created_at: now,
      updated_at: now,
      approved_by: 'admin_alexa',
      approved_at: now,
    },
    {
      id: 'idea_rejected_1',
      trader_id: 'trader_olof',
      title: 'Random microcap punt',
      thesis: 'Too illiquid for platform standards.',
      symbols: ['MICRO'],
      side: 'long',
      entry: 1.2,
      tp: 2.0,
      sl: 0.8,
      risk: 5,
      status: 'rejected',
      visibility: 'private',
      tags: ['illiquid'],
      version: 1,
      created_at: now,
      updated_at: now,
      approved_by: 'admin_alexa',
      approved_at: now,
    },
  ];

  for (const i of ideas) {
    await db.collection('ideas').doc(i.id).set(i);
  }

  // --- fills ---
  const fills = [
    {
      id: 'fill_1',
      idea_id: 'idea_approved_1',
      trader_id: 'trader_olof',
      exchange: 'binance',
      side: 'buy',
      quantity: 0.25,
      price: 63500,
      timestamp: now,
      txid: 'demo-tx-001',
    },
  ];
  for (const f of fills) {
    await db.collection('fills').doc(f.id).set(f);
  }

  // --- prices ---
  const prices = [
    { id: 'BTC-USD_1', symbol: 'BTC-USD', ts: now, open: 62800, high: 64000, low: 62500, close: 63500, source: 'yfinance' },
    { id: 'NVDA_1', symbol: 'NVDA', ts: now, open: 118, high: 122, low: 116, close: 120, source: 'yfinance' },
  ];
  for (const p of prices) {
    await db.collection('prices').doc(p.id).set(p);
  }

  // --- metrics_daily ---
  const metrics = [
    { id: 'activeTraders_2025-09-15', key: 'platform.activeTraders', date: '2025-09-15', value: 42, extra: { rolling: 7 } },
    { id: 'symbol.BTC.vol_30d_2025-09-15', key: 'symbol.BTC.vol_30d', date: '2025-09-15', value: 0.62 },
  ];
  for (const m of metrics) {
    await db.collection('metrics_daily').doc(m.id).set(m);
  }

  // --- allocations ---
  const allocations = [
    {
      id: 'alloc_olof_2025-09-15',
      trader_id: 'trader_olof',
      date: '2025-09-15',
      nav: 100000,
      cash: 15000,
      positions: [
        { symbol: 'BTC-USD', weight: 0.5, exposure: 50000 },
        { symbol: 'NVDA', weight: 0.2, exposure: 20000 },
      ],
    },
  ];
  for (const a of allocations) {
    await db.collection('allocations').doc(a.id).set(a);
  }

  // --- audits ---
  const audits = [
    {
      id: 'audit_1',
      entity: 'idea',
      entity_id: 'idea_approved_1',
      action: 'update.status.approved',
      actor_uid: 'admin_alexa',
      at: now,
      details: { reason: 'Meets liquidity & risk standards.' },
    },
  ];
  for (const au of audits) {
    await db.collection('audits').doc(au.id).set(au);
  }

  console.log('✅ Seed complete.');
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  });