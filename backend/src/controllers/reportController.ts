import { Request, Response } from "express";
import { ReportService } from "../services/reportService";

export class ReportController {
  static async create(req: Request, res: Response) {
    try {
      const authUser = (req as any).user;
      console.log("[backend] create report request", {
        body: req.body,
        user: authUser,
      });

      const report = await ReportService.createReport({
        ...req.body,
        petugasId: req.body?.petugasId || authUser?.id || "unknown",
      });
      console.log("[backend] create report success", { reportId: (report as any)?.id, status: (report as any)?.status });

      return res.status(201).json({
        message: "Laporan berhasil disimpan",
        report,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Gagal menyimpan laporan" });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const authUser = (req as any).user;
      console.log("[backend] list reports request", { user: authUser });
      const reports = await ReportService.getReports(authUser?.role === "admin" ? undefined : authUser?.id);
      const categories = await ReportService.getCategories();
      console.log("[backend] list reports success", { count: reports?.length, categories: categories?.length });

      return res.json({ reports, categories });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Gagal mengambil laporan" });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const reportId = Array.isArray(id) ? id[0] : id;
      const nextStatus = typeof status === "string" ? status : "submitted";
      console.log("[backend] update status request", { reportId, nextStatus, user: (req as any).user });

      if (!reportId || !nextStatus) {
        console.log("[backend] update status invalid payload", { reportId, nextStatus });
        return res.status(400).json({ message: "ID laporan dan status wajib diisi" });
      }

      const report = await ReportService.updateReportStatus(reportId, nextStatus);
      console.log("[backend] update status success", { reportId, nextStatus, updatedReport: report });

      return res.json({ message: "Status laporan berhasil diperbarui", report });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Gagal memperbarui status laporan" });
    }
  }
}
