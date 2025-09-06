const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  source: { type: String, default: 'camera' }, // optional
}, { versionKey: false });

module.exports = mongoose.model('Attendance', AttendanceSchema);
