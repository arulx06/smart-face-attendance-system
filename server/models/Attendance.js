import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
    {
    studentId: {
      type: String,
      required: true, 
      index: true 
    },
    timestamp: {
      type: Date, 
      default: Date.now, 
      index: true 
    },
    source: { 
      type: String, 
      default: 'camera' 
    }, 
    },
    { versionKey: false }
);

const Attendance = mongoose.model("Attendance",AttendanceSchema);
export default Attendance;