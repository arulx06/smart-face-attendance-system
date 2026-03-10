import Attendance from '../models/Attendance.js';
import { Redis } from '@upstash/redis';

let io = null;

// initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

function init(_io) {
  io = _io;
}

async function handleRecognition(studentId) {
  try {
    if (!studentId || ['No Face', 'Unknown', 'Error'].includes(studentId)) return;

    // Use a key like `attendance:2025-09-07:student123`
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `attendance:${today}:${studentId}`;

    // Try to set the key only if it does not exist, expire in 24h
    const wasSet = await redis.set(key, "1", { nx: true, ex: 60 * 60 * 24 });

    if (!wasSet) {
      // Key already exists → student already logged today
      return;
    }

    // Save to MongoDB
    const doc = await Attendance.create({ studentId });

    // Notify clients
    if (io) {
      io.emit('new_attendance', { studentId: doc.studentId, timestamp: doc.timestamp });
    }

    console.log('Logged attendance:', doc.studentId, doc.timestamp.toISOString());
  } catch (err) {
    console.error('attendanceService error:', err);
  }
}

export default { init, handleRecognition };
