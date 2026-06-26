import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import testRoutes from "./routes/testRoutes";
import authRoutes from "./routes/authRoutes";
import reportRoutes from "./routes/reportRoutes";
import summaryRoutes from "./routes/summaryRoutes";

dotenv.config();

const app = express();

app.use(cors());
app.use("/test", testRoutes);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(
  "/api/auth",
  authRoutes
);
app.use(
  "/api/reports",
  reportRoutes
);
app.use(
  "/api/reports/summary",
  summaryRoutes
);

app.get('/', (_, res) => {
  res.json({
    message: 'API Monitoring Lapangan'
  });
});

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on ${PORT}`);
});