import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

// We expect these to be set via Replit Secrets.
// Only VITE_* keys are exposed to the client at build-time.
const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

function hasRequiredConfig() {
  return !!(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId)
}

let app = null
let auth = null

try {
  if (!hasRequiredConfig()) {
    console.warn(
      '[Firebase] Missing required config. Add VITE_FIREBASE_* secrets in Replit. ' +
      'Required: apiKey, authDomain, projectId, appId'
    )
  } else {
    app = getApps().length ? getApp() : initializeApp(cfg)
    auth = getAuth(app)
  }
} catch (err) {
  console.error('[Firebase] Initialization error:', err)
}

export { app, auth }