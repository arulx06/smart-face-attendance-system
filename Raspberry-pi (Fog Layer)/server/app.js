import dotenv from "dotenv";
dotenv.config(); // ✅ MUST be before using process.env

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import studentRoutes from "./routes/StudentRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import registerRoutes from "./routes/registerRoutes.js";
import { authMiddleware } from "./middleware/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* =========================
   CORS CONFIG
========================= */

// example:
// FRONTEND_URL=https://frontend.sysflow.dpdns.org,http://localhost:5173
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",")
  : [];

console.log("✅ CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin(origin, callback) {
      // allow curl, server-to-server, grpc, etc.
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ Blocked CORS origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* =========================
   BODY PARSER
========================= */

app.use(express.json());

/* =========================
   STATIC FILES
========================= */

app.use("/images", express.static(path.join(__dirname, "../Images")));

/* =========================
   API ROUTES
========================= */

app.use("/api/auth", authRoutes);
app.use("/api/register", registerRoutes);
app.use("/api/attendance", authMiddleware, attendanceRoutes);
app.use("/api/students", authMiddleware, studentRoutes);

/* =========================
   EXPORT
========================= */

export default app;
