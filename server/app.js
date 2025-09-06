import express from "express"
import cors from "cors"

import attendanceRoutes from "./routes/attendanceRoutes.js"

const app = express();
app.use(express.json());
app.use(cors());

app.use('/api/attendance', attendanceRoutes);

export default app
