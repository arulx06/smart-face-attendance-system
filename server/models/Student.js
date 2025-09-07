import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: String,
  imageUrl: String, // store image as URL or path
  department: String,
  year: String,
  otherDetails: Object,
}, { timestamps: true });

const Student = mongoose.model('Student',studentSchema);
export default Student;