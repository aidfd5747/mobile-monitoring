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