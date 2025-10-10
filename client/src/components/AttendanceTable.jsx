// frontend/src/components/AttendanceTable.jsx
import React, { useState, useRef, useEffect } from "react";

export default function AttendanceTable({ logs }) {
  const [expandedStudent, setExpandedStudent] = useState(null);

  // Group logs by studentId
  const groupedLogs = logs.reduce((acc, log) => {
    if (!acc[log.studentId]) acc[log.studentId] = [];
    acc[log.studentId].push(new Date(log.timestamp));
    return acc;
  }, {});

  const toggleStudent = (studentId) => {
    setExpandedStudent(expandedStudent === studentId ? null : studentId);
  };

  const downloadCSV = (studentId) => {
    const studentLogs = groupedLogs[studentId] || [];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Date,Time", ...studentLogs.map(d => `${d.toLocaleDateString()},${d.toLocaleTimeString()}`)].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${studentId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (Object.keys(groupedLogs).length === 0) {
    return (
      <div style={{ textAlign: "center", color: "#6b7280", marginTop: 20 }}>
        No attendance logs yet
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginTop: 20 }}>
      {Object.keys(groupedLogs).map((studentId, i) => (
        <div key={studentId} style={{
          width: "90%",
          maxWidth: 900,
          borderRadius: 12,
          boxShadow: "0 8px 30px rgba(2,6,23,0.12)",
          border: "1px solid rgba(2,6,23,0.06)",
          background: "#fff",
          overflow: "hidden",
          transition: "all 0.3s ease"
        }}>
          {/* Header Block */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            cursor: "pointer",
            background: "#f0f9ff",
            fontWeight: 600,
            fontSize: 16
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={() => toggleStudent(studentId)}>
              <span style={{
                fontSize: 18,
                display: "inline-block",
                transition: "transform 0.3s",
                transform: expandedStudent === studentId ? "rotate(90deg)" : "rotate(0deg)"
              }}>
                ▶
              </span>
              <span>{studentId}</span>
            </div>
            <button
              onClick={() => downloadCSV(studentId)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                background: "#0ea5e9",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              Download CSV
            </button>
          </div>

          {/* Attendance Logs with smooth slide */}
          <div style={{
            maxHeight: expandedStudent === studentId ? "1000px" : "0",
            overflow: "hidden",
            transition: "max-height 0.35s ease"
          }}>
            {expandedStudent === studentId && (
              <div style={{ padding: "12px 16px", background: "#fff" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f0f9ff" }}>
                      <th style={{ padding: "6px", border: "1px solid #cbd5e1" }}>Date</th>
                      <th style={{ padding: "6px", border: "1px solid #cbd5e1" }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedLogs[studentId].map((d, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#f8feff" }}>
                        <td style={{ padding: "6px", border: "1px solid #cbd5e1" }}>{d.toLocaleDateString()}</td>
                        <td style={{ padding: "6px", border: "1px solid #cbd5e1" }}>{d.toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
