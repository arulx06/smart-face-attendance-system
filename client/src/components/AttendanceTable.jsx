// frontend/src/components/AttendanceTable.jsx
import React from "react";

export default function AttendanceTable({ logs }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
      <div style={{
        width: "90%",
        maxWidth: 900,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 8px 30px rgba(2,6,23,0.12)",
        border: "1px solid rgba(2,6,23,0.06)",
        background: "#fff"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", fontSize: 15 }}>
          <thead style={{ backgroundColor: "#0ea5e9", color: "#fff" }}>
            <tr>
              <th style={{ padding: "14px 12px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>Student ID</th>
              <th style={{ padding: "14px 12px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="2" style={{ padding: "18px", textAlign: "center", color: "#6b7280" }}>
                  No attendance logs yet
                </td>
              </tr>
            ) : (
              logs.map((log, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8feff" }}>
                  <td style={{ padding: "12px", borderBottom: "1px solid rgba(0,0,0,0.04)", fontWeight: 600 }}>{log.studentId}</td>
                  <td style={{ padding: "12px", borderBottom: "1px solid rgba(0,0,0,0.04)", color: "#374151" }}>{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
