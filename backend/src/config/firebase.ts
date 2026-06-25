import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import type { ServiceAccount } from "firebase-admin";
import path from "path";

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!process.env.FIREBASE_CONFIG) {
  if (serviceAccountJson) {
    initializeApp({
      credential: cert(JSON.parse(serviceAccountJson) as ServiceAccount),
    });
  } else if (serviceAccountPath) {
    initializeApp({
      credential: cert(path.resolve(serviceAccountPath) as unknown as ServiceAccount),
    });
  } else {
    initializeApp({
      credential: applicationDefault(),
    });
  }
}

export const firestore = getFirestore();
export const storage = getStorage();