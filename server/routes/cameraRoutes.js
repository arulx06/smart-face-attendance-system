// server/routes/cameraRoutes.js
import express from "express";
<<<<<<< Updated upstream
import fs from "fs";

const router = express.Router();

router.post("/camera/stop", (req, res) => {
  try {
    fs.writeFileSync("./camera_status.txt", "STOPPED");
    res.json({ success: true, message: "Camera stopped." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to stop camera." });
  }
});

router.post("/camera/start", (req, res) => {
  try {
    fs.writeFileSync("./camera_status.txt", "RUNNING");
    res.json({ success: true, message: "Camera started." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to start camera." });
=======
import { pauseRecognition, resumeRecognition } from "../grpc/grpcClient.js";

const router = express.Router();

router.post("/camera/stop", async (req, res) => {
  try {
    await pauseRecognition();
    return res.json({ success: true, message: "Camera (recognition) stopped." });
  } catch (err) {
    console.error("Failed to stop recognition:", err);
    return res.status(500).json({ success: false, message: "Failed to stop camera." });
  }
});

router.post("/camera/start", async (req, res) => {
  try {
    await resumeRecognition();
    return res.json({ success: true, message: "Camera (recognition) started." });
  } catch (err) {
    console.error("Failed to start recognition:", err);
    return res.status(500).json({ success: false, message: "Failed to start camera." });
>>>>>>> Stashed changes
  }
});

export default router;
