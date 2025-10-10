// frontend/src/pages/AttendanceLog.jsx
import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import AttendanceTable from "../components/AttendanceTable"; // adjust path if needed
import Modal from "../components/Modal"; // adjust path if needed
import RegisterStudentForm from "../components/RegisterStudentForm";

export default function AttendanceLog() {
  const [logs, setLogs] = useState([]);
  const [students, setStudents] = useState([]);
  const [view, setView] = useState("attendance"); // 'attendance' | 'students' | 'register'
  const [selectedStudent, setSelectedStudent] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login"; // or your login route
  };

  // Fetch attendance + socket (attendance view)
  useEffect(() => {
    if (view !== "attendance") return;
    const token = localStorage.getItem("token");
    fetch("http://localhost:5000/api/attendance?limit=100", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setLogs(data.data);
      })
      .catch(console.error);

    const socket = io("http://localhost:5000");
    socket.on("connect", () => console.log("Socket connected"));
    socket.on("new_attendance", (entry) =>
      setLogs((prev) => [entry, ...prev].slice(0, 1000))
    );
    return () => socket.disconnect();
  }, [view]);

  // Fetch students list
  useEffect(() => {
    if (view !== "students") return;
    const token = localStorage.getItem("token");
    fetch("http://localhost:5000/api/students", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setStudents(data.data);
      })
      .catch(console.error);
  }, [view]);

  const handleStudentClick = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setSelectedStudent(data.data);
      } else {
        setSelectedStudent(data);
      }
    } catch (err) {
      console.error("Error fetching student:", err);
    }
  };

  const handleDeleteStudent = async (studentId) => {
  if (!window.confirm("Are you sure you want to delete this student and all their attendance logs?")) return;

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`http://localhost:5000/api/students/${studentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (data.success) {
      // Update frontend immediately
      setStudents((prev) => prev.filter((s) => s.studentId !== studentId));
      setLogs((prev) => prev.filter((log) => log.studentId !== studentId));
      alert("Student and attendance deleted successfully.");
    } else {
      alert("Error: " + data.message);
    }
  } catch (err) {
    console.error(err);
    alert("Failed to delete student.");
  }
};


  const closeModal = () => setSelectedStudent(null);

  return (
    <div style={{ padding: 20 }}>
      {/* Logout Button */}
      <div
        style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}
      >
        <button
          onClick={handleLogout}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "#ef4444",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(239,68,68,0.08)",
          }}
        >
          Logout
        </button>
      </div>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        {/* Toggle Buttons */}
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setView("attendance")}
            style={{
              marginRight: 8,
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: view === "attendance" ? "#0ea5e9" : "#e6eef6",
              color: view === "attendance" ? "#fff" : "#0369a1",
              fontWeight: 600,
            }}
          >
            Attendance Log
          </button>
          <button
            onClick={() => setView("students")}
            style={{
              marginRight: 8,
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: view === "students" ? "#0ea5e9" : "#e6eef6",
              color: view === "students" ? "#fff" : "#0369a1",
              fontWeight: 600,
            }}
          >
            Student List
          </button>
          <button
            onClick={() => setView("register")}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: view === "register" ? "#0ea5e9" : "#e6eef6",
              color: view === "register" ? "#fff" : "#0369a1",
              fontWeight: 600,
            }}
          >
            Register Student
          </button>
        </div>
        <h1 style={{ fontSize: 28, margin: 30, color: "#0f172a" }}>
          {view === "attendance"
            ? "Attendance Log"
            : view === "students"
            ? "Student List"
            : view === "register"
            ? "Register Student"
            : ""}
        </h1>
      </div>

      {/* Content Views */}
      {view === "attendance" && <AttendanceTable logs={logs} />}

      {view === "register" && (
        <div style={{ maxWidth: 650, margin: "0 auto" }}>
          <RegisterStudentForm
            inputStyle={{
              width: "100%",
              padding: "12px 14px",
              marginBottom: "14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "16px",
            }}
            placeholders={{
              studentId: "Enter student ID (e.g., 12345)",
              name: "Enter student name (e.g., Praveen S)",
              email: "Enter email (e.g., praveen.s@example.com)",
              department: "Enter department (e.g., CSE)",
              year: "Enter year (e.g., 2nd Year)",
              image: "Upload student image (JPG/JPEG)",
            }}
          />
        </div>
      )}

      {view === "students" && (
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
                  <th style={{ padding: "14px 12px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>ID</th>
                  <th style={{ padding: "14px 12px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>Name</th>
                  <th style={{ padding: "14px 12px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>Details</th>
                </tr>
              </thead>
              <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: "18px", textAlign: "center", color: "#6b7280" }}>
                    No students found. Check API or DB.
                  </td>
                </tr>
              ) : (
                students.map((s, i) => (
                  <tr key={s.studentId} style={{ background: i % 2 === 0 ? "#fff" : "#f8feff" }}>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(0,0,0,0.04)", fontWeight: 600 }}>{s.studentId}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>{s.name}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                      <button
                        onClick={() => handleStudentClick(s.studentId)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          background: "#0ea5e9",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 600,
                          marginRight: 6
                        }}
                      >
                        Info
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(s.studentId)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          background: "#ef4444",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 600
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal using Portal */}
      {selectedStudent && (
        <Modal onClose={closeModal}>
          {/* header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
              {selectedStudent.name} ({selectedStudent.studentId})
            </div>
            <button
              onClick={closeModal}
              aria-label="Close"
              style={{
                fontSize: 20,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#6b7280",
              }}
            >
              ✕
            </button>
          </div>

          {/* image */}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <img
              src={
                selectedStudent.imageUrl
                  ? `http://localhost:5000${selectedStudent.imageUrl}`
                  : ""
              }
              alt={selectedStudent.name}
              style={{
                width: "100%",
                maxWidth: 520,
                height: "auto",
                maxHeight: "50vh",
                objectFit: "contain",
                borderRadius: 8,
                boxShadow: "0 8px 30px rgba(2,6,23,0.12)",
              }}
            />
          </div>

          {/* details */}
          <div style={{ color: "#374151", lineHeight: 1.6 }}>
            <div>
              <strong>Email:</strong> {selectedStudent.email || "—"}
            </div>
            <div>
              <strong>Department:</strong> {selectedStudent.department || "—"}
            </div>
            <div>
              <strong>Year:</strong> {selectedStudent.year || "—"}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
