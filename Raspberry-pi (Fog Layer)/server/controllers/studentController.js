import Student from "../models/Student.js";
import fs from "fs";
import path from "path";

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

    // create student in DB
    const student = new Student({
      studentId,
      name,
      email,
      department,
      year,
      imageUrl
    });

    await student.save();

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

// Delete student and their attendance
export const deleteStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Find student
    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Delete student folder in Images
    if (student.imageUrl) {
      const folderPath = path.join(path.resolve(".."), "Images", `${studentId}_${student.name.trim().split(" ")[0].toLowerCase()}`);

      console.log("Trying to delete folder:", folderPath);
      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
      }
    }
    

    // Delete student from DB
    await Student.deleteOne({ studentId });

    // Delete attendance logs from DB
    const Attendance = await import("../models/Attendance.js");
    await Attendance.default.deleteMany({ studentId });

    return res.status(200).json({ success: true, message: "Student and attendance deleted successfully" });
  } catch (err) {
    console.error("Error in deleteStudent:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


