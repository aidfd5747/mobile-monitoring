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
}
