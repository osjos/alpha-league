// firebaseAdmin.js
const admin = require('firebase-admin');

const creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(creds),
    projectId: creds.project_id || process.env.FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };