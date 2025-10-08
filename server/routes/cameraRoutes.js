// server/routes/cameraRoutes.js
import express from "express";
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
  }
});

export default router;
