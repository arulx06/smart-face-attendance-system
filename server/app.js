import express from "express"
import cors from "cors"
import path from "path"

import studentRoutes from "./routes/StudentRoutes.js"
import attendanceRoutes from "./routes/attendanceRoutes.js"

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files from the Images folder at root
app.use('/images', express.static(path.join(process.cwd(), '../Images')));

app.use('/api/attendance', attendanceRoutes);
app.use('/api/students', studentRoutes);

export default app