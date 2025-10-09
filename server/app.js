import express from "express"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"

import studentRoutes from "./routes/StudentRoutes.js"
import attendanceRoutes from "./routes/attendanceRoutes.js"
import authRoutes from "./routes/authRoutes.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import registerRoutes from "./routes/registerRoutes.js";
import cameraRoutes from "./routes/cameraRoutes.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files from the Images folder at root
app.use("/images", express.static(path.join(__dirname, "../Images")));

app.use('/api/attendance',authMiddleware, attendanceRoutes);
app.use('/api/students',authMiddleware,studentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/register", registerRoutes);
app.use("/api", cameraRoutes);
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes

export default app