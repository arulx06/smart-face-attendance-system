import Attendance from '../models/Attendance.js';

export const getLogs = async (req, res) => {
  try {
    const { 
      limit = 100, 
      page = 1, 
      studentId, 
      from, 
      to 
    } = req.query;

    const q = {};
    if (studentId) q.studentId = studentId;
    if (from || to) {
      q.timestamp = {};
      if (from) q.timestamp.$gte = new Date(from);
      if (to) q.timestamp.$lte = new Date(to);
    }

    const perPage = Math.min(1000, Number(limit));
    const docs = await Attendance.find(q)
      .sort({ timestamp: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean();

    const total = await Attendance.countDocuments(q);
    res.json(
      { 
        success: true, 
        data: docs, 
        meta: { 
          total, 
          page: Number(page), 
          limit: perPage 
        } 
      }
    );

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
