import { FirebaseError } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import { firebaseApp } from "./firebaseConfig";
import type { ExportedBackup } from "./fullBackup";

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

function backupDocRef(uid: string) {
  return doc(db, "backups", uid);
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  return result.user;
}

export function signOutOfFirebase(): Promise<void> {
  return signOut(auth);
}

export function onFirebaseAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentFirebaseUser(): User | null {
  return auth.currentUser;
}

export async function uploadBackup(uid: string, backup: ExportedBackup): Promise<void> {
  await setDoc(backupDocRef(uid), backup);
}

export async function downloadBackup(uid: string): Promise<{ text: string; updatedAt: Date } | null> {
  const snapshot = await getDoc(backupDocRef(uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return { text: JSON.stringify(data), updatedAt: new Date(data.exportedAt as string) };
}

// Firestore documents are capped at 1 MiB; a write that goes over surfaces as a
// FirebaseError with code "invalid-argument". Used to trigger a smaller retry
// (e.g. dropping sketches) rather than just failing the backup outright.
export function isFirestoreSizeLimitError(error: unknown): boolean {
  return error instanceof FirebaseError && error.code === "invalid-argument";
}
