import type { Bytes } from "../documents/types";

const IV_LENGTH = 12;
const SALT_LENGTH = 16;

export function bytesToBase64(bytes: Uint8Array): string {
  // Built in chunks — String.fromCharCode(...allBytes) overflows the
  // argument limit on multi-megabyte inputs.
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Bytes {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function generateSaltBase64(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(SALT_LENGTH)));
}

export async function deriveVaultKey(
  password: string,
  saltB64: string,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: base64ToBytes(saltB64), iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function generateDocKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function exportKeyBase64(key: CryptoKey): Promise<string> {
  return bytesToBase64(new Uint8Array(await crypto.subtle.exportKey("raw", key)));
}

export function importKeyBase64(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", base64ToBytes(b64), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

/** Encrypts with a fresh random 12-byte IV; output is IV || ciphertext+tag. */
export async function encryptBytes(key: CryptoKey, plain: Bytes): Promise<Bytes> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
  const out = new Uint8Array(iv.length + cipher.length);
  out.set(iv);
  out.set(cipher, iv.length);
  return out;
}

/** Throws OperationError when the key is wrong (GCM auth tag mismatch). */
export async function decryptBytes(key: CryptoKey, data: Bytes): Promise<Bytes> {
  const iv = data.subarray(0, IV_LENGTH);
  const cipher = data.subarray(IV_LENGTH);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher));
}

export function encryptJson(key: CryptoKey, value: unknown): Promise<Bytes> {
  return encryptBytes(key, new TextEncoder().encode(JSON.stringify(value)));
}

export async function decryptJson<T>(key: CryptoKey, data: Bytes): Promise<T> {
  return JSON.parse(new TextDecoder().decode(await decryptBytes(key, data))) as T;
}
