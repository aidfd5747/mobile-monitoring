import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { ServiceAccount } from "firebase-admin";
import path from "path";
import { existsSync } from "fs";

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
const fallbackServiceAccountPath = [
  serviceAccountPath,
  path.resolve(process.cwd(), "serviceAccountKey.json"),
  path.resolve(process.cwd(), "backend", "serviceAccountKey.json"),
  path.resolve(__dirname, "..", "..", "serviceAccountKey.json"),
].find((candidate) => candidate && existsSync(candidate));

if (!process.env.FIREBASE_CONFIG) {
  if (serviceAccountJson) {
    initializeApp({
      credential: cert(JSON.parse(serviceAccountJson) as ServiceAccount),
    });
  } else if (fallbackServiceAccountPath) {
    initializeApp({
      credential: cert(path.resolve(fallbackServiceAccountPath) as unknown as ServiceAccount),
    });
  } else {
    initializeApp({
      credential: applicationDefault(),
    });
  }
}

export const firestore = getFirestore();