import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import AttendanceTable from '../components/AttendanceTable';

export default function AttendanceLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // initial fetch
    fetch('http://localhost:5000/api/attendance?limit=100')
      .then(r => r.json())
      .then(data => { if (data.success) setLogs(data.data); })
      .catch(console.error);

    // realtime
    const socket = io('http://localhost:5000');
    socket.on('connect', () => console.log('Connected to socket.io'));
    socket.on('new_attendance', (entry) => {
      // prepend new entry (keep UI reactive)
      setLogs(prev => [entry, ...prev].slice(0, 1000)); // cap in-memory
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Attendance Log (Live)</h1>
      <AttendanceTable logs={logs} />
    </div>
  );
}
