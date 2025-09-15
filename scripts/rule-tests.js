// scripts/rule-tests.js
// Runs HAPPY + DENIAL paths against Firestore rules on the EMULATOR.

// --- Admin SDK (to create users + claims in AUTH EMULATOR) ---
const { initializeApp: initAdmin } = require('firebase-admin/app');
const { getAuth: getAdminAuth } = require('firebase-admin/auth');

// --- Web SDK (rules are enforced here) ---
const { initializeApp } = require('firebase/app');
const {
  getFirestore, connectFirestoreEmulator,
  collection, doc, query, where, getDocs, getDoc, setDoc, updateDoc
} = require('firebase/firestore');
const {
  getAuth, connectAuthEmulator,
  signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword
} = require('firebase/auth');

// ---- Emulator config (ports must match your running emulators) ----
const PROJECT_ID = 'alpha-league-emulator';
const FS_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9095';

// ----- Helpers -----
function hr(title) {
  console.log('\n' + '='.repeat(20) + ' ' + title + ' ' + '='.repeat(20));
}
async function expectOk(promise, label) {
  try {
    const res = await promise;
    console.log('✅ PASS:', label);
    return res;
  } catch (e) {
    console.log('❌ FAIL (unexpected):', label, '-', e.code || e.message);
  }
}
async function expectDenied(promise, label) {
  try {
    await promise;
    console.log('❌ FAIL (should be denied):', label);
  } catch (e) {
    if ((e.code || e.message || '').includes('permission-denied')) {
      console.log('✅ PASS (denied as expected):', label);
    } else {
      console.log('❌ FAIL (wrong error):', label, '-', e.code || e.message);
    }
  }
}

// ----- 1) Prepare AUTH emulator users & claims via Admin SDK -----
async function ensureUsers() {
  initAdmin({ projectId: PROJECT_ID });
  const aa = getAdminAuth();

  // trader
  let trader;
  try { trader = await aa.getUserByEmail('trader@demo.local'); }
  catch { trader = await aa.createUser({ uid: 'trader_olof', email: 'trader@demo.local', password: 'demo1234' }); }

  // admin
  let admin;
  try { admin = await aa.getUserByEmail('admin@demo.local'); }
  catch { admin = await aa.createUser({ uid: 'admin_alexa', email: 'admin@demo.local', password: 'demo1234' }); }

  // set admin claim
  await aa.setCustomUserClaims('admin_alexa', { admin: true });

  console.log('Auth emulator users ready:', {
    trader: trader.uid, admin: (admin.uid || 'admin_alexa'),
  });
}

// ----- 2) Init Web SDK (rules-enforced) -----
function initClient() {
  const app = initializeApp({ projectId: PROJECT_ID, apiKey: 'fake-key', authDomain: 'fake' });
  const db = getFirestore(app);
  const auth = getAuth(app);

  const [fsHost, fsPort] = FS_HOST.split(':');
  const [auHost, auPort] = AUTH_HOST.split(':');
  connectFirestoreEmulator(db, fsHost, Number(fsPort));
  connectAuthEmulator(auth, `http://${auHost}:${auPort}`, { disableWarnings: true });

  return { app, db, auth };
}

async function run() {
  await ensureUsers();
  const { db, auth } = initClient();

  // ---------- PUBLIC (unauth) ----------
  hr('PUBLIC (unauth)');
  await signOut(auth);

  // Query approved ideas (should succeed & only return approved docs)
  await expectOk(
    getDocs(query(collection(db, 'ideas'), where('status', '==', 'approved'))),
    'Public can list approved ideas'
  );

  // Try to read a draft idea directly (should be denied)
  await expectDenied(
    getDoc(doc(db, 'ideas', 'idea_draft_1')),
    'Public cannot get draft idea'
  );

  // ---------- TRADER (owner, not admin) ----------
  hr('TRADER (owner)');
  await signOut(auth);

  // sign in trader
  try { await createUserWithEmailAndPassword(auth, 'trader@demo.local', 'demo1234'); } catch {}
  await signInWithEmailAndPassword(auth, 'trader@demo.local', 'demo1234');

  // Create own draft idea (OK)
  const myIdeaId = 'idea_from_trader_' + Math.floor(Math.random() * 1e6);
  await expectOk(
    setDoc(doc(db, 'ideas', myIdeaId), {
      trader_id: 'trader_olof',
      title: 'Trader idea test',
      thesis: 'Test thesis',
      symbols: ['BTC-USD'],
      side: 'long',
      entry: 1, tp: 2, sl: 0.5,
      risk: 1,
      status: 'draft',
      visibility: 'private',
      version: 1,
      created_at: new Date(), updated_at: new Date()
    }),
    'Trader can create own draft idea'
  );

  // Try create idea impersonating another trader (DENIED)
  await expectDenied(
    setDoc(doc(db, 'ideas', myIdeaId + '_bad'), {
      trader_id: 'someone_else',
      title: 'Nope', thesis: 'Nope',
      symbols: [], side: 'long', entry: 1, tp: 2, sl: 0.5,
      risk: 1, status: 'draft', visibility: 'private',
      version: 1, created_at: new Date(), updated_at: new Date()
    }),
    'Trader cannot create idea for another trader'
  );

  // Update own idea while not approved (OK)
  await expectOk(
    updateDoc(doc(db, 'ideas', 'idea_submitted_1'), { thesis: 'Edited by owner before approval', updated_at: new Date() }),
    'Owner can update own idea while not approved'
  );

  // Try update an approved idea as owner (DENIED)
  await expectDenied(
    updateDoc(doc(db, 'ideas', 'idea_approved_1'), { thesis: 'Owner tries to edit approved', updated_at: new Date() }),
    'Owner cannot update once approved'
  );

  // ---------- ADMIN (override) ----------
  hr('ADMIN');
  await signOut(auth);
  try { await createUserWithEmailAndPassword(auth, 'admin@demo.local', 'demo1234'); } catch {}
  await signInWithEmailAndPassword(auth, 'admin@demo.local', 'demo1234'); // token carries admin:true claim

  // Admin can update approved idea
  await expectOk(
    updateDoc(doc(db, 'ideas', 'idea_approved_1'), { thesis: 'Edited by admin', updated_at: new Date() }),
    'Admin can update approved idea'
  );

  // Admin can delete an idea
  await expectOk(
    (async () => {
      const d = doc(db, 'ideas', myIdeaId);
      const { deleteDoc } = await import('firebase/firestore');
      return deleteDoc(d);
    })(),
    'Admin can delete idea'
  );

  console.log('\n🎉 Rule tests finished.');
}

run().catch((e) => {
  console.error('Rule tests crashed:', e);
  process.exit(1);
});