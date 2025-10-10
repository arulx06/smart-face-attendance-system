
import { exec } from "child_process";
import path from "path";
// server/controllers/studentController.js
import Student from "../models/Student.js";
import fs from "fs";


export const registerStudent = async (req, res) => {
  try {
    const { studentId, name, email, department, year } = req.body;

    if (!studentId || !name) {
      return res.status(400).json({ success: false, message: "studentId and name are required" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "At least one image is required" });
    }
    // Check if student with same ID already exists
    const existingStudent = await Student.findOne({ studentId });
    if (existingStudent) {
      // 🧹 Delete uploaded folder since student already exists
      const cleanName = name.trim().split(" ")[0].toLowerCase();
      const folderPath = path.join(path.resolve(".."), "Images", `${studentId}_${cleanName}`);
      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
      }

      return res.status(400).json({ success: false, message: "Student with this ID already exists" });
    }

    // only first image path is stored in DB
    const firstImage = req.files[0];
    const imageUrl = `/Images/${studentId}_${name.trim().split(" ")[0].toLowerCase()}/${firstImage.filename}`;

    const student = new Student({
      studentId,
      name,
      email,
      department,
      year,
      imageUrl
    });

    await student.save();

    // --- Run EncodeGenerator.py ---
    const pyScript = path.resolve("..", "EncodeGenerator.py");
    exec(`python "${pyScript}"`, (error, stdout, stderr) => {
      if (error) {
        console.error("Error updating encodings:", error);
      }
      if (stdout) console.log("EncodeGenerator output:", stdout);
      if (stderr) console.error("EncodeGenerator errors:", stderr);
    });

    return res.status(201).json({ success: true, data: student });
  } catch (err) {
    console.error("Error in registerStudent:", err);

    // 🧹 Cleanup in case of any other server error
    if (req.files && req.files.length > 0) {
      const cleanName = req.body.name?.trim().split(" ")[0].toLowerCase();
      const folderPath = path.join(path.resolve(".."), "Images", `${req.body.studentId}_${cleanName}`);
      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
      }
    }

    // Handle duplicate key error explicitly (in case mongoose throws it)
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "Student with this ID already exists" });
    }

    return res.status(500).json({ success: false, message: "Server error" });
  }
};
