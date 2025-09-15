// scripts/peek.js
// Reads back a few docs from the EMULATOR using Admin (no rules), to confirm data is present.

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085';

initializeApp({ projectId: 'alpha-league-emulator' });
const db = getFirestore();

(async () => {
  const colls = ['traders', 'ideas', 'fills', 'prices', 'metrics_daily', 'allocations', 'audits'];

  for (const c of colls) {
    const snap = await db.collection(c).limit(5).get();
    console.log(`\n== ${c} (${snap.size}) ==`);
    snap.forEach((doc) => console.log(doc.id, doc.data()));
  }
})();