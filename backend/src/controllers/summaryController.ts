import { Request, Response } from "express";
import { ReportService } from "../services/reportService";

export class SummaryController {
  static async getSummary(req: Request, res: Response) {
    try {
      const reports = await ReportService.getReports();

      const summary = {
        totalReports: reports.length,
        submitted: reports.filter((report) => report.status === "submitted").length,
        completed: reports.filter((report) => report.status === "completed").length,
        recentReports: reports.slice(0, 5),
      };

      return res.json({ summary });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Gagal mengambil ringkasan dashboard" });
    }
  }
}
