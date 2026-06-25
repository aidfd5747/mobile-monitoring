import bcrypt from "bcryptjs";
import { firestore } from "../config/firebase";
import { User } from "../types/user";

export class AuthService {
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