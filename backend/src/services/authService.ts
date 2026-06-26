import bcrypt from "bcryptjs";
import { firestore } from "../config/firebase";
import { User } from "../types/user";

export class AuthService {
  static async createUser(payload: { nama: string; username: string; password: string; role: "admin" | "worker" }) {
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