import { Router } from "express";
import { firestore } from "../config/firebase";

const router = Router();

router.get("/", async (_, res) => {
  try {
    const docRef = await firestore
      .collection("test")
      .add({
        message: "Firestore Connected",
        createdAt: new Date(),
      });

    res.json({
      success: true,
      id: docRef.id,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error,
    });
  }
});

export default router;