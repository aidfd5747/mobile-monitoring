// authService.ts
// Layanan user untuk operasi CRUD user dan autentikasi.
import bcrypt from "bcryptjs";
import { firestore } from "../config/firebase";
import { User } from "../types/user";

export class AuthService {
  // Buat akun user baru dengan password hashed.
  static async createUser(payload: { nama: string; username: string; password: string; role: "admin" | "worker" | "petugas" }) {
    const normalizedUsername = payload.username.trim().toLowerCase();
    const existingUser = await this.findUserByUsername(normalizedUsername);

    if (existingUser) {
      throw new Error("Username sudah digunakan");
    }

    const hashedPassword = await bcrypt.hash(payload.password, 10);

    const docRef = await firestore.collection("users").add({
      nama: payload.nama,
      username: normalizedUsername,
      normalizedUsername,
      password: hashedPassword,
      role: payload.role,
      createdAt: new Date(),
    });

    const snapshot = await docRef.get();

    return {
      id: docRef.id,
      ...snapshot.data(),
    } as User;
  }

  // Ambil semua user dari koleksi users.
  static async listUsers() {
    const snapshot = await firestore.collection("users").get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as User),
    }));
  }

  // Cari user berdasarkan ID dokumen Firestore.
  static async findUserById(id: string) {
    const doc = await firestore.collection("users").doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...(doc.data() as User),
    } as User;
  }

  // Hapus user berdasarkan ID.
  static async deleteUser(id: string) {
    const docRef = firestore.collection("users").doc(id);
    await docRef.delete();
  }

  // Simpan token push perangkat untuk user tertentu.
  static async savePushToken(payload: { userId: string; role?: string; expoPushToken: string }) {
    // Prefer unique expoPushToken: if token exists, update its owner (userId/role).
    const tokenSnapshot = await firestore.collection("pushTokens")
      .where("expoPushToken", "==", payload.expoPushToken)
      .limit(1)
      .get();

    if (!tokenSnapshot.empty) {
      const doc = tokenSnapshot.docs[0];
      const data = doc.data() as FirestorePushToken;

      const needsUpdate = data.userId !== payload.userId || data.role !== payload.role;
      if (needsUpdate) {
        await firestore.collection("pushTokens").doc(doc.id).update({
          userId: payload.userId,
          role: payload.role,
          updatedAt: new Date().toISOString(),
        });
      }

      const updatedSnapshot = await firestore.collection("pushTokens").doc(doc.id).get();
      const saved = { id: doc.id, ...updatedSnapshot.data() } as FirestorePushToken & { id: string };
      console.log("[backend] push token upserted", saved);
      return saved;
    }

    const docRef = await firestore.collection("pushTokens").add({
      userId: payload.userId,
      role: payload.role,
      expoPushToken: payload.expoPushToken,
      createdAt: new Date().toISOString(),
    });

    const snapshot = await docRef.get();
    const saved = {
      id: docRef.id,
      ...snapshot.data(),
    } as FirestorePushToken & { id: string };
    console.log("[backend] push token saved", saved);
    return saved;
  }

  // Perbarui username atau password user.
  static async updateUser(id: string, payload: { username?: string; password?: string }) {
    const updatePayload: Record<string, any> = {};

    if (payload.username) {
      const normalizedUsername = payload.username.trim().toLowerCase();
      const existingUser = await this.findUserByUsername(normalizedUsername);

      if (existingUser && existingUser.id !== id) {
        throw new Error("Username sudah digunakan");
      }

      updatePayload.username = normalizedUsername;
      updatePayload.normalizedUsername = normalizedUsername;
    }

    if (payload.password) {
      updatePayload.password = await bcrypt.hash(payload.password, 10);
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new Error("Tidak ada data yang diperbarui");
    }

    const docRef = firestore.collection("users").doc(id);
    await docRef.update(updatePayload);

    const snapshot = await docRef.get();
    return {
      id: snapshot.id,
      ...(snapshot.data() as User),
    } as User;
  }

  // Cari user berdasarkan username ter-normalisasi.
  static async findUserByUsername(
    username: string
  ) {
    const normalizedUsername = username.trim().toLowerCase();

    const snapshot =
      await firestore
        .collection("users")
        .where(
          "normalizedUsername",
          "==",
          normalizedUsername
        )
        .limit(1)
        .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as User;
    }

    const fallbackSnapshot = await firestore.collection("users").get();
    const matchingDoc = fallbackSnapshot.docs.find((doc) => {
      const data = doc.data() as Partial<User> & { username?: string; normalizedUsername?: string };
      const storedUsername = data.username?.toLowerCase();
      const storedNormalizedUsername = data.normalizedUsername?.toLowerCase();

      return storedUsername === normalizedUsername || storedNormalizedUsername === normalizedUsername;
    });

    if (!matchingDoc) {
      return null;
    }

    return {
      id: matchingDoc.id,
      ...matchingDoc.data(),
    } as User;
  }

  // Verifikasi password plain-text terhadap hash stored.
  static async verifyPassword(
    plainPassword: string,
    hashedPassword: string
  ) {
    return bcrypt.compare(
      plainPassword,
      hashedPassword
    );
  }
}