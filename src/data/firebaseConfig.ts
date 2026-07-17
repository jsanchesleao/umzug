import { initializeApp, type FirebaseOptions } from "firebase/app";

// Fill these in from the Firebase Console (Project settings → General → Your apps → Web app).
// This config is not a secret — access is gated by Firebase Auth + Firestore security rules,
// not by hiding these values — so it's safe to commit and bake into the client build.
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCDIbncuL1NAtZpIPbdL6gJExsp0WKTk_A",
  authDomain: "umzug-279fe.firebaseapp.com",
  projectId: "umzug-279fe",
  messagingSenderId: "374794290641",
  appId: "1:374794290641:web:dfb93cb00827aff0844cf0",
};

export const firebaseApp = initializeApp(firebaseConfig);
