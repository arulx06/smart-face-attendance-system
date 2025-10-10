// frontend/src/pages/AttendanceLog.jsx
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
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
        // fallback if backend just returns student object
        setSelectedStudent(data);
      }
    } catch (err) {
      console.error("Error fetching student:", err);
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
          {/* Slightly moved to right */}
          <button
            onClick={() => setView("register")}
            style={{
              marginLeft: 10,
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
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {students.length > 0 ? (
            students.map((s) => (
              <button
                key={s.studentId}
                onClick={() => handleStudentClick(s.studentId)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "#0369a1",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 6px 18px rgba(3,105,161,0.12)",
                }}
              >
                {s.studentId}
              </button>
            ))
          ) : (
            <p style={{ color: "#6b7280" }}>
              No students found. Check API or DB.
            </p>
          )}
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
