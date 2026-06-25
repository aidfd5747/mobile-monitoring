import { firestore, storage } from "../config/firebase";

interface FirestoreReport {
  id: string;
  petugasId?: string;
  petugasName?: string;
  categoryId?: string;
  categoryName?: string;
  description?: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
  createdAt?: string;
}

export interface ReportPayload {
  petugasId: string;
  petugasName?: string;
  categoryId: string;
  categoryName?: string;
  description: string;
  photoUrl?: string;
  photoBase64?: string;
  photoName?: string;
  latitude: number;
  longitude: number;
  status?: string;
}

export class ReportService {
  static async createReport(payload: ReportPayload) {
    const { photoBase64, photoName, ...rest } = payload;
    let photoUrl = rest.photoUrl || "";

    if (photoBase64) {
      try {
        const bucket = storage.bucket(process.env.FIREBASE_STORAGE_BUCKET);
        const fileName = photoName || `reports/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const file = bucket.file(fileName);
        const buffer = Buffer.from(photoBase64, "base64");

        await file.save(buffer, {
          metadata: {
            contentType: "image/jpeg",
          },
        });

        await file.makePublic();
        photoUrl = file.publicUrl();
      } catch (error) {
        console.error("Photo upload failed", error);
      }
    }

    const docRef = await firestore.collection("reports").add({
      ...rest,
      photoUrl,
      createdAt: new Date().toISOString(),
      status: rest.status || "submitted",
    });

    const snapshot = await docRef.get();

    return {
      id: docRef.id,
      ...snapshot.data(),
    };
  }

  static async getReports() {
    const snapshot = await firestore.collection("reports").get();

    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as FirestoreReport))
      .sort((a, b) => {
        const dateA = a.createdAt ? String(a.createdAt) : "";
        const dateB = b.createdAt ? String(b.createdAt) : "";

        return dateB.localeCompare(dateA);
      });
  }

  static async getCategories() {
    const snapshot = await firestore.collection("categories").get();

    if (!snapshot.empty) {
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    }

    return [
      { id: "inspection", name: "Inspeksi Lapangan" },
      { id: "visit", name: "Kunjungan Petugas" },
      { id: "maintenance", name: "Pemeliharaan" },
    ];
  }
}
