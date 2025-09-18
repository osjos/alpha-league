// web/src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "alpha-league-4370d.firebaseapp.com",
  projectId: "alpha-league-4370d",
  storageBucket: "alpha-league-4370d.firebasestorage.app",
  messagingSenderId: "109862722648",
  appId: "1:109862722648:web:a2a9559efe7df1d99fbe2d",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Optional: Emulator wiring (we'll turn this on later if you want).
 * Replit previews don't run on localhost, so this won't auto-trigger.
 * When we want emulators, we'll explicitly call these in a small toggle.
 */
// if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
//   connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
//   connectFirestoreEmulator(db, "127.0.0.1", 8080);
// }