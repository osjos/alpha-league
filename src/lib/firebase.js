import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// ── 1) Paste YOUR real web config here (same as before) ──
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "alpha-league-4370d.firebaseapp.com",
  projectId: "alpha-league-4370d",
  storageBucket: "alpha-league-4370d.firebasestorage.app",
  messagingSenderId: "109862722648",
  appId: "1:109862722648:web:a2a9559efe7df1d99fbe2d",
};

// ── 2) Toggle based on Vite env ──
// In Replit "Secrets", set VITE_USE_EMULATORS=true to use local emulators
const USE_EMULATORS =
  (import.meta?.env?.VITE_USE_EMULATORS || "").toString().toLowerCase() === "true";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to emulators when toggle is on
if (USE_EMULATORS) {
  // Replit runs everything in one container, so 127.0.0.1 works
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

// Optional: expose flag for UI (e.g., show "Emulator mode" badge)
export const isEmulator = USE_EMULATORS;