import bcrypt from "bcryptjs";
import { firestore } from "../config/firebase";

async function seedAdmin() {
  const username = "admin";
  const password = "123456789";
  const nama = "Administrator";

  const existing = await firestore
    .collection("users")
    .where("username", "==", username)
    .limit(1)
    .get();

  if (!existing.empty) {
    console.log("Admin already exists");
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await firestore.collection("users").add({
    nama,
    username,
    password: hashedPassword,
    role: "admin",
    createdAt: new Date(),
  });

  console.log(`Admin seeded successfully with username: ${username}`);
  process.exit(0);
}

seedAdmin();
