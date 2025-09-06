const Attendance = require('../models/Attendance');

let io = null;
const DEDUP_WINDOW_MS = process.env.DEDUP_WINDOW_MS ? Number(process.env.DEDUP_WINDOW_MS) : 60_000;

function init(_io) {
  io = _io;
}

// Save to DB but avoid duplicate logs for same student within DEDUP_WINDOW_MS
async function handleRecognition(studentId) {
  try {
    if (!studentId || ['No Face','Unknown','Error'].includes(studentId)) return;

    const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS);

    // find recent record for same student
    const recent = await Attendance.findOne({ studentId, timestamp: { $gte: cutoff } }).sort({ timestamp: -1 });

    if (recent) {
      // duplicate (recent) - skip saving
      return;
    }

    const doc = await Attendance.create({ studentId });
    // emit to connected clients
    if (io) io.emit('new_attendance', { studentId: doc.studentId, timestamp: doc.timestamp });

    console.log('Logged attendance:', doc.studentId, doc.timestamp.toISOString());
  } catch (err) {
    console.error('attendanceService error:', err);
  }
}

module.exports = { init, handleRecognition };
