import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (data.token) {
      localStorage.setItem("token", data.token); // ✅ save JWT
      navigate("/attendance"); // ✅ go to AttendanceLog
    } else {
      setError("Invalid credentials");
    }
  }

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      backgroundColor: "#e0f2fe"
    }}>
      <div style={{
        width: "90%",
        maxWidth: 400,
        padding: "32px",
        borderRadius: 12,
        background: "#fff",
        boxShadow: "0 8px 30px rgba(2,6,23,0.12)",
        border: "1px solid rgba(2,6,23,0.06)",
        textAlign: "center"
      }}>
        <h2 style={{
          fontSize: "24px",
          fontWeight: "bold",
          color: "#0ea5e9",
          marginBottom: "20px"
        }}>
          Login
        </h2>

        {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "14px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: "14px"
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "18px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: "14px"
            }}
          />
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: "#0ea5e9",
              color: "#fff",
              fontWeight: "bold",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: "15px"
            }}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
