// scripts/smoke.js
const { admin, db, auth } = require('../firebaseAdmin');

(async () => {
  // Firestore write
  const ref = db.collection('healthchecks').doc('cli');
  await ref.set({
    ok: true,
    when: admin.firestore.FieldValue.serverTimestamp(),
    env: 'replit',
  });
  console.log('✅ Firestore write OK');

  // Auth API check (lists up to 1 user; works even if 0 users exist)
  const listed = await auth.listUsers(1);
  console.log(`✅ Auth listUsers OK (count in first page: ${listed.users.length})`);

  process.exit(0);
})().catch((err) => {
  console.error('❌ Smoke test failed:', err);
  process.exit(1);
});