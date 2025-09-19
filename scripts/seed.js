// scripts/seed.js
// Run with: npm run seed:traders-ideas
// Requires secrets: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

const admin = require("firebase-admin");
const { faker } = require("@faker-js/faker");

function initFirebaseAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      "Missing one of FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in Replit Secrets."
    );
    process.exit(1);
  }

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }
  return admin.firestore();
}

const CRYPTO = [
  { symbol: "BTC", basePrice: 65000 },
  { symbol: "ETH", basePrice: 3200 },
  { symbol: "SOL", basePrice: 160 },
  { symbol: "AVAX", basePrice: 40 },
  { symbol: "LINK", basePrice: 18 },
  { symbol: "MATIC", basePrice: 0.8 },
  { symbol: "BNB", basePrice: 550 },
  { symbol: "DOGE", basePrice: 0.12 },
  { symbol: "ADA", basePrice: 0.45 },
  { symbol: "XRP", basePrice: 0.55 },
];

const EQUITY = [
  { symbol: "AAPL", basePrice: 200 },
  { symbol: "MSFT", basePrice: 450 },
  { symbol: "NVDA", basePrice: 950 },
  { symbol: "AMZN", basePrice: 180 },
  { symbol: "GOOGL", basePrice: 175 },
  { symbol: "META", basePrice: 520 },
  { symbol: "TSLA", basePrice: 250 },
];

function randomFloatAround(base, pct = 0.15) {
  const d = base * pct;
  return +(base + faker.number.float({ min: -d, max: d })).toFixed(6);
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Generate traders */
function makeTraders(n = 10) {
  const traders = [];
  for (let i = 0; i < n; i++) {
    const name = faker.person.fullName();
    const handle = "@" + slugify(faker.internet.userName().slice(0, 10));
    const id = slugify(`${name}-${faker.string.alphanumeric(4)}`);
    traders.push({
      id,
      handle,
      displayName: name,
      bio: faker.lorem.sentence(),
      avatarUrl: `https://api.dicebear.com/8.x/identicon/svg?seed=${encodeURIComponent(
        id
      )}`,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      stats: {
        ideas_open: 0,
        ideas_closed: 0,
        win_rate: 0,
        total_pnl: 0,
        pnl_7d: 0,
        pnl_30d: 0,
        r_multiple_avg: 0,
      },
      links: {
        twitter: `https://x.com/${handle.replace("@", "")}`,
      },
    });
  }
  return traders;
}

/** Choose a symbol from CRYPTO+EQUITY */
function pickInstrument() {
  const pool = Math.random() < 0.7 ? CRYPTO : EQUITY; // 70% crypto ideas
  const x = faker.helpers.arrayElement(pool);
  return {
    market: pool === CRYPTO ? "CRYPTO" : "EQUITY",
    symbol: x.symbol,
    basePrice: x.basePrice,
  };
}

/** Generate ideas (OPEN) */
function makeIdeas(traders, count = 28) {
  const ideas = [];
  for (let i = 0; i < count; i++) {
    const t = faker.helpers.arrayElement(traders);
    const { market, symbol, basePrice } = pickInstrument();
    const side = faker.helpers.arrayElement(["LONG", "SHORT"]);
    const entry = randomFloatAround(basePrice, 0.12);
    const qty = faker.number.int({ min: 1, max: 10 });
    const notionalUsd = +(entry * qty).toFixed(2);

    const stop =
      side === "LONG"
        ? +(entry * (1 - faker.number.float({ min: 0.05, max: 0.15 }))).toFixed(6)
        : +(entry * (1 + faker.number.float({ min: 0.05, max: 0.15 }))).toFixed(6);

    const target =
      side === "LONG"
        ? +(entry * (1 + faker.number.float({ min: 0.08, max: 0.30 }))).toFixed(6)
        : +(entry * (1 - faker.number.float({ min: 0.08, max: 0.30 }))).toFixed(6);

    const openedAt = new Date(Date.now() - faker.number.int({ min: 0, max: 6 }) * 86400e3);

    const thesis = faker.lorem.sentences({ min: 1, max: 3 });

    ideas.push({
      id: slugify(`${symbol}-${t.id}-${faker.string.alphanumeric(6)}`),
      traderId: t.id,
      traderHandle: t.handle,
      symbol,
      market,
      side, // LONG | SHORT
      entry_price: entry,
      qty,
      notional_usd: notionalUsd,
      stop,
      target,
      risk_usd: +(notionalUsd * 0.02).toFixed(2), // simple 2% account risk proxy
      status: "OPEN",
      thesis,
      tags: faker.helpers.arrayElements(
        ["momentum", "swing", "mean-revert", "news", "breakout", "range"],
        { min: 1, max: 2 }
      ),
      opened_at: admin.firestore.Timestamp.fromDate(openedAt),
      last_price: entry, // starts equal to entry; updater will move this
      pnl_unrealized: 0,
      r_multiple_unrealized: 0,
      price_source: "mock",
      version: 0,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  return ideas;
}

/** Derive a sensible starting price per symbol for prices/{symbol} */
function buildInitialPrices(ideas) {
  const map = new Map();
  for (const idea of ideas) {
    if (!map.has(idea.symbol)) {
      map.set(idea.symbol, {
        symbol: idea.symbol,
        market: idea.market,
        price: idea.entry_price,
        asOf: admin.firestore.FieldValue.serverTimestamp(),
        source: "seed",
      });
    }
  }
  return [...map.values()];
}

async function writeCollectionBatch(db, col, docs) {
  const chunks = [];
  const size = 400; // Firestore batch limit is 500, keep headroom
  for (let i = 0; i < docs.length; i += size) chunks.push(docs.slice(i, i + size));

  let total = 0;
  for (const chunk of chunks) {
    const batch = db.batch();
    for (const doc of chunk) {
      const ref = db.collection(col).doc(doc.id || undefined); // if id exists use it, else auto
      batch.set(ref, doc, { merge: true });
    }
    await batch.commit();
    total += chunk.length;
  }
  return total;
}

async function main() {
  faker.seed(42042); // deterministic-ish results, reruns are stable
  const db = initFirebaseAdmin();

  // 1) Traders
  const traders = makeTraders(10);
  const tradersWritten = await writeCollectionBatch(db, "traders", traders);

  // 2) Ideas
  const ideas = makeIdeas(traders, 28);
  const ideasWritten = await writeCollectionBatch(db, "ideas", ideas);

  // 3) Prices
  const priceDocs = buildInitialPrices(ideas).map(p => ({
    ...p,
    id: p.symbol, // use symbol as doc id
  }));
  const pricesWritten = await writeCollectionBatch(db, "prices", priceDocs);

  console.log(`✅ Seed complete:
  traders: ${tradersWritten}
  ideas:   ${ideasWritten}
  prices:  ${pricesWritten}
  `);

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});