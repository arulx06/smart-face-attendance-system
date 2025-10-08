
import express from "express";
import { registerStudent } from "../controllers/studentController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Register new student (with up to 3 images)
router.post("/register", upload.array("images", 3), registerStudent);

export default router;