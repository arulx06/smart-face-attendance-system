import express from "express"
import Student from "../models/Student.js";
import {deleteStudent } from "../controllers/studentController.js";
const router = express.Router();

// GET /api/students  -> return minimal info (studentId + name)
router.get('/', async (req, res) => {
  try {
    const students = await Student.find({}, 'studentId name imageUrl').sort({ studentId: 1 }).lean();
    res.json({ success: true, data: students });
  } catch (err) {
    console.error('GET /api/students error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/students/:id -> return full student document (by studentId)
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.id }).lean();
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (err) {
    console.error('GET /api/students/:id error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete student
router.delete("/:studentId", deleteStudent);

export default router;