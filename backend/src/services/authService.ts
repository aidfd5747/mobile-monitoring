import bcrypt from "bcryptjs";
import { firestore } from "../config/firebase";
import { User } from "../types/user";

export class AuthService {
  static async createUser(payload: { nama: string; username: string; password: string; role: "admin" | "worker" }) {
    const existingUser = await this.findUserByUsername(payload.username);

    if (existingUser) {
      throw new Error("Username sudah digunakan");
    }

    const hashedPassword = await bcrypt.hash(payload.password, 10);

    const docRef = await firestore.collection("users").add({
      nama: payload.nama,
      username: payload.username,
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
    const snapshot =
      await firestore
        .collection("users")
        .where(
          "username",
          "==",
          username
        )
        .limit(1)
        .get();

    if (snapshot.empty) {
      return null;
    }

    const doc =
      snapshot.docs[0];

    return {
      id: doc.id,
      ...doc.data(),
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