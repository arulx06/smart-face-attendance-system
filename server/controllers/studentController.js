// server/controllers/studentController.js
import Student from "../models/Student.js";

export const registerStudent = async (req, res) => {
  try {
    const { studentId, name, email, department, year } = req.body;

    const existing = await Student.findOne({ studentId });
    if (existing) {
    return res.status(400).json({ success: false, message: "Student ID already exists" });
    }

    if (!studentId || !name) {
      return res.status(400).json({ success: false, message: "studentId and name are required" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "At least one image is required" });
    }

    // only first image path is stored in DB
    const firstImage = req.files[0];
    const cleanName = name.trim().split(" ")[0].toLowerCase().replace(/[^a-z0-9]/gi, "");
    const imageUrl = `/Images/${studentId}_${cleanName}/${firstImage.filename}`;

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
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
