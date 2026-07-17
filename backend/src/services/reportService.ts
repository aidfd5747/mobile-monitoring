// reportService.ts
// Layanan untuk operasi laporan: upload foto, simpan ke Firestore,
// ambil laporan, kategori, hapus, dan ubah status.
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

interface FirestoreNotification {
  id: string;
  recipientId?: string;
  recipientRole?: string;
  message: string;
  reportId?: string;
  createdAt?: string;
}

interface FirestorePushToken {
  id: string;
  userId?: string;
  role?: string;
  expoPushToken?: string;
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
  process.env.SUPABASE_URL || process.env.supabase_url || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key || process.env.SUPABASE_ANON_KEY || process.env.supabase_anon_key || ""
);

export class ReportService {
  static async sendExpoPushNotifications(tokens: string[], title: string, body: string) {
    if (!tokens.length) {
      console.log("[backend] sendExpoPushNotifications called with no tokens");
      return;
    }

    console.log("[backend] sendExpoPushNotifications tokens", tokens.length, tokens);
    const chunks: Array<Array<Record<string, any>>> = [];
    for (let i = 0; i < tokens.length; i += 100) {
      chunks.push(
        tokens.slice(i, i + 100).map((token) => ({
          to: token,
          sound: "default",
          title,
          body,
          priority: "high",
          channelId: "default",
          data: {
            type: "report-update",
          },
        }))
      );
    }

    try {
      for (const chunk of chunks) {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(chunk),
        });

        const result = await response.json();
        console.log("[backend] expo push response", result);

        if (!response.ok) {
          console.error("[backend] expo push returned error status", response.status, result);
        }

        if (result?.errors) {
          console.error("[backend] expo push errors", result.errors);
        }
      }
    } catch (error) {
      console.error("[backend] expo push failed", error);
    }
  }

  static async getPushTokensByRole(role?: string) {
    const snapshot = await firestore.collection("pushTokens").get();

    const tokens = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as FirestorePushToken))
      .filter((item) => item.role === role)
      .map((item) => String(item.expoPushToken ?? ""))
      .filter(Boolean);

    // Deduplicate token values
    return Array.from(new Set(tokens));
  }

  static async getPushTokensByUserId(userId?: string) {
    if (!userId) {
      return [];
    }

    const snapshot = await firestore.collection("pushTokens")
      .where("userId", "==", userId)
      .get();

    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as FirestorePushToken))
      .map((item) => String(item.expoPushToken ?? ""))
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i);
  }

  // Buat laporan baru: unggah foto ke Supabase jika ada, lalu simpan ke Firestore.
  static async createReport(payload: ReportPayload) {
    const { photoBase64, photoName, photoUrl: unusedPhotoUrl, ...rest } = payload;
    let photoUrl = "";
    console.log("[backend] report service create started", { petugasId: rest.petugasId, category: rest.categoryName, hasPhoto: Boolean(photoBase64) });

    if (photoBase64) {
      // Upload foto base64 ke Supabase Storage.
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

      if (uploadError) {
        console.error("[backend] photo upload failed", uploadError);
        throw new Error("Gagal mengunggah foto laporan");
      }

      const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      if (!data?.publicUrl) {
        console.error("[backend] failed to get public url for uploaded photo", { fileName, data });
        throw new Error("Gagal mendapatkan URL foto laporan");
      }

      photoUrl = data.publicUrl;
      console.log("[backend] photo upload success", { fileName, photoUrl });
    }

    // Simpan dokumen laporan di Firestore.
    const docRef = await firestore.collection("reports").add({
      ...rest,
      ...(photoUrl ? { photoUrl } : {}),
      createdAt: new Date().toISOString(),
      status: rest.status || "submitted",
    });

    const snapshot = await docRef.get();
    console.log("[backend] report created in firestore", { reportId: docRef.id, status: rest.status || "submitted" });

    await this.createNotification({
      recipientRole: "admin",
      message: `${rest.petugasName || "Petugas"} membuat laporan baru`,
      reportId: docRef.id,
      type: "report_created",
    });

    const adminPushTokens = await this.getPushTokensByRole("admin");
    console.log("[backend] admin push tokens", adminPushTokens.length, adminPushTokens);
    await this.sendExpoPushNotifications(
      adminPushTokens,
      "Laporan baru",
      `${rest.petugasName || "Petugas"} membuat laporan baru`
    );

    return {
      id: docRef.id,
      ...snapshot.data(),
    };
  }

  // Ambil laporan, optional hanya untuk petugas tertentu.
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

  // Ambil daftar kategori dari Firestore.
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

  // Simpan notifikasi baru ke Firestore.
  static async createNotification(payload: {
    recipientId?: string;
    recipientRole?: string;
    message: string;
    reportId?: string;
    type?: string;
  }) {
    const docRef = await firestore.collection("notifications").add({
      ...payload,
      createdAt: new Date().toISOString(),
    });

    const snapshot = await docRef.get();
    return {
      id: docRef.id,
      ...snapshot.data(),
    } as FirestoreNotification;
  }

  // Ambil notifikasi pengguna berdasarkan role atau ID petugas.
  static async getNotifications(user?: { id?: string; role?: string }) {
    const snapshot = await firestore.collection("notifications").get();

    const notifications = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as FirestoreNotification))
      .sort((a, b) => {
        const dateA = a.createdAt ? String(a.createdAt) : "";
        const dateB = b.createdAt ? String(b.createdAt) : "";
        return dateB.localeCompare(dateA);
      });

    if (!user) {
      return notifications;
    }

    return notifications.filter((item) => {
      if (user.role === "admin") {
        return item.recipientRole === "admin";
      }

      return item.recipientId === user.id || item.recipientRole === user.role;
    });
  }

  // Hapus laporan berdasarkan ID.
  static async deleteReport(id: string) {
    console.log("[backend] deleting report", { reportId: id });
    const docRef = firestore.collection("reports").doc(id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      throw new Error("Report not found");
    }

    await docRef.delete();

    return {
      id: docRef.id,
      deleted: true,
    };
  }

  // Perbarui status laporan di Firestore.
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
    const updatedData = updatedSnapshot.data();

    await this.createNotification({
      recipientId: updatedData?.petugasId,
      recipientRole: "worker",
      message: `Status laporan Anda telah diperbarui menjadi ${status}`,
      reportId: id,
      type: "report_status_updated",
    });

    const workerPushTokens = await this.getPushTokensByUserId(updatedData?.petugasId);
    await this.sendExpoPushNotifications(
      workerPushTokens,
      "Status laporan diperbarui",
      `Status laporan Anda telah diperbarui menjadi ${status}`
    );

    return {
      id: docRef.id,
      ...updatedData,
    };
  }
}
