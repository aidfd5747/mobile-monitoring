import bcrypt from "bcryptjs";

import { firestore }
  from "../config/firebase";

async function createAdmin() {
  const hashedPassword =
    await bcrypt.hash(
      "admin123",
      10
    );

  await firestore
    .collection("users")
    .add({
      nama: "Administrator",

      username: "admin",

      password:
        hashedPassword,

      role: "admin",

      createdAt:
        new Date(),
    });

  console.log(
    "Admin berhasil dibuat"
  );

  process.exit();
}

createAdmin();