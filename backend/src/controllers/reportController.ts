import { Request, Response } from "express";
import { ReportService } from "../services/reportService";

export class ReportController {
  static async create(req: Request, res: Response) {
    try {
      const report = await ReportService.createReport(req.body);

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
      const reports = await ReportService.getReports();
      const categories = await ReportService.getCategories();

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

      if (!reportId || !nextStatus) {
        return res.status(400).json({ message: "ID laporan dan status wajib diisi" });
      }

      const report = await ReportService.updateReportStatus(reportId, nextStatus);

      return res.json({ message: "Status laporan berhasil diperbarui", report });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Gagal memperbarui status laporan" });
    }
  }
}
