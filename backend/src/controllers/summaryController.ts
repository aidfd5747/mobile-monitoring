import { Request, Response } from "express";
import { ReportService } from "../services/reportService";

export class SummaryController {
  static async getSummary(req: Request, res: Response) {
    try {
      const reports = await ReportService.getReports();

      const submittedReports = reports.filter((report) => report.status === "submitted");
      const summary = {
        totalReports: reports.length,
        submitted: submittedReports.length,
        completed: reports.filter((report) => report.status === "completed").length,
        recentReports: submittedReports,
      };

      return res.json({ summary });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Gagal mengambil ringkasan dashboard" });
    }
  }
}
