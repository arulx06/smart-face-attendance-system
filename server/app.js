const express = require('express');
const cors = require('cors');
const attendanceRoutes = require('./routes/attendanceRoutes');

const app = express();
app.use(express.json());
app.use(cors());

app.use('/api/attendance', attendanceRoutes);

module.exports = app;
