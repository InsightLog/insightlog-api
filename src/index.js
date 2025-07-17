import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger.js";
import { PrismaClient } from "@prisma/client";
import Router from "./routes/index.js";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*", 
    credentials: true, 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);
app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));

// ✅ DB Connection Test
(async () => {
  try {
    await prisma.$connect();
    console.log("✅ Connected to PostgreSQL via Prisma");
  } catch (err) {
    console.error("❌ Failed to connect to DB:", err);
    process.exit(1);
  }
})();

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ✅ Base Route
app.get("/", (req, res) => {
  res.send("InsightLog API is running ✅");
});

// ✅ Mount API Routes (placeholder)
app.use("/api", Router);

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
