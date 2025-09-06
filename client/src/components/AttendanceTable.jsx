// frontend/src/components/AttendanceTable.jsx
import React from "react";

export default function AttendanceTable({ logs }) {
  return (
    <table
      border="1"
      cellPadding="10"
      style={{ width: "100%", borderCollapse: "collapse" }}
    >
      <thead>
        <tr>
          <th>Student ID</th>
          <th>Timestamp</th>
        </tr>
      </thead>
      <tbody>
        {logs.length === 0 ? (
          <tr>
            <td colSpan="2" style={{ textAlign: "center" }}>
              No attendance logs yet
            </td>
          </tr>
        ) : (
          logs.map((log, index) => (
            <tr key={index}>
              <td>{log.studentId}</td>
              <td>{new Date(log.timestamp).toLocaleString()}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
