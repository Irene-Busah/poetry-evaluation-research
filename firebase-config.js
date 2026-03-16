/**
 * firebase-config.js
 * ─────────────────────────────────────────────────────────────
 * STEP 1 OF SETUP — Replace EVERY value below with your own
 * Firebase project credentials.
 *
 * Where to find them:
 *   Firebase Console → Your Project → Project Settings (gear icon)
 *   → General tab → "Your apps" section → Config (radio button)
 *
 * Also set ADMIN_EMAIL to the Google account you will use to
 * sign in to the admin dashboard.
 * ─────────────────────────────────────────────────────────────
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDr4aZGNua4yiusFpkL4nGdcajFyhcPQn4",
  authDomain: "poetry-evaluation-study.firebaseapp.com",
  databaseURL: "https://poetry-evaluation-study-default-rtdb.firebaseio.com",
  projectId: "poetry-evaluation-study",
  storageBucket: "poetry-evaluation-study.firebasestorage.app",
  messagingSenderId: "546897093376",
  appId: "1:546897093376:web:21bbe9380f5131761bc9e5",
};

/**
 * The Google account email address that is allowed to access
 * the admin dashboard. Only this email can sign in.
 */
const ADMIN_EMAIL = "i.busah@alumni.alueducation.com";
