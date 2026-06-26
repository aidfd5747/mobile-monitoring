import { firestore } from "../config/firebase";
import { createClient } from "@supabase/supabase-js";

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

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

export class ReportService {
  static async createReport(payload: ReportPayload) {
    const { photoBase64, photoName, ...rest } = payload;
    let photoUrl = rest.photoUrl || "";
    console.log("[backend] report service create started", { petugasId: rest.petugasId, category: rest.categoryName, hasPhoto: Boolean(photoBase64) });

    if (photoBase64) {
      try {
        console.log("[backend] uploading photo", { photoName, size: photoBase64.length });
        const bucketName = process.env.SUPABASE_BUCKET || "reports";
        const fileName = photoName || `reports/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const buffer = Buffer.from(photoBase64, "base64");

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, buffer, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (!uploadError) {
          const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
          photoUrl = data.publicUrl;
          console.log("[backend] photo upload success", { fileName, photoUrl });
        } else {
          console.error("[backend] photo upload failed", uploadError);
        }
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
    console.log("[backend] report created in firestore", { reportId: docRef.id, status: rest.status || "submitted" });

    return {
      id: docRef.id,
      ...snapshot.data(),
    };
  }

  static async getReports(userId?: string) {
    let query = firestore.collection("reports");

    if (userId) {
      query = query.where("petugasId", "==", userId) as typeof query;
    }

    const snapshot = await query.get();
    console.log("[backend] fetched reports from firestore", { count: snapshot.size, userId });

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

  static async updateReportStatus(id: string, status: string) {
    console.log("[backend] updating report status", { reportId: id, status });
    const docRef = firestore.collection("reports").doc(id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      throw new Error("Report not found");
    }

    await docRef.update({
      status,
      updatedAt: new Date().toISOString(),
    });

    const updatedSnapshot = await docRef.get();

    return {
      id: docRef.id,
      ...updatedSnapshot.data(),
    };
  }
}
