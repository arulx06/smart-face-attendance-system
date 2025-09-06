import express from "express";
import { getLogs } from "../controllers/attendanceController.js"; 
const router = express.Router();

router.get("/", getLogs);

export default router;
