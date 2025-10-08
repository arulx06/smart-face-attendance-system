import React, { useState, useRef } from "react";

export default function RegisterStudentForm() {
  const [form, setForm] = useState({
    studentId: "",
    name: "",
    email: "",
    department: "",
    year: "",
  });
  const [images, setImages] = useState([]);
  const [preview, setPreview] = useState([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // =================== Form Handlers ===================
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    setPreview(files.map((f) => URL.createObjectURL(f)));
  };

  // =================== Camera Control API Calls ===================
  const stopRecognitionCamera = async () => {
    try {
      await fetch("http://localhost:5000/api/camera/stop", { method: "POST" });
      console.log("Recognition camera stopped");
    } catch (err) {
      console.error("Failed to stop recognition camera:", err);
    }
  };

  const startRecognitionCamera = async () => {
    try {
      await fetch("http://localhost:5000/api/camera/start", { method: "POST" });
      console.log("Recognition camera started");
    } catch (err) {
      console.error("Failed to start recognition camera:", err);
    }
  };

  // =================== Camera Operations ===================
  const openCamera = async () => {
    // Step 1: Stop recognition camera before opening local camera
    await stopRecognitionCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setCameraOpen(true);
      console.log("Registration camera opened");
    } catch (err) {
      alert("Camera access denied or unavailable.");
      console.error(err);
      await startRecognitionCamera(); // Try restarting recognition if failed
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        const file = new File([blob], `capture_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setImages((prev) => [...prev, file]);
        setPreview((prev) => [...prev, URL.createObjectURL(file)]);
      },
      "image/jpeg",
      0.95
    );
  };

  const closeCamera = async () => {
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    setCameraOpen(false);
    await startRecognitionCamera(); // Restart recognition after closing registration camera
  };

  // =================== Submit Form ===================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (images.length === 0) {
      alert("Please upload or capture at least one image.");
      return;
    }

    const token = localStorage.getItem("token");
    const data = new FormData();
    Object.entries(form).forEach(([key, val]) => data.append(key, val));
    images.forEach((img) => data.append("images", img));

    try {
      const res = await fetch("http://localhost:5000/api/register/register", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });
      const result = await res.json();

      if (result.success) {
        alert("✅ Student registered successfully!");
        setForm({
          studentId: "",
          name: "",
          email: "",
          department: "",
          year: "",
        });
        setImages([]);
        setPreview([]);
        await startRecognitionCamera(); // Restart recognition camera after successful registration
      } else {
        alert("❌ Error: " + result.message);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to register student.");
      await startRecognitionCamera();
    }
  };

  // =================== UI ===================
  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 450,
        margin: "40px auto",
        padding: "28px 36px",
        borderRadius: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input
          type="text"
          name="studentId"
          placeholder="Student ID (e.g. 143)"
          value={form.studentId}
          onChange={handleChange}
          required
          style={inputStyle}
        />
        <input
          type="text"
          name="name"
          placeholder="Full Name (e.g. Praveen S)"
          value={form.name}
          onChange={handleChange}
          required
          style={inputStyle}
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          style={inputStyle}
        />
        <input
          type="text"
          name="department"
          placeholder="Department"
          value={form.department}
          onChange={handleChange}
          style={inputStyle}
        />
        <input
          type="text"
          name="year"
          placeholder="Year"
          value={form.year}
          onChange={handleChange}
          style={inputStyle}
        />

        <div>
          <label
            style={{ display: "block", marginBottom: 6, color: "#374151" }}
          >
            Upload / Capture Student Images (JPG only)
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              type="file"
              accept=".jpg,.jpeg"
              multiple
              onChange={handleFileChange}
              style={{ flex: 1, padding: "8px 10px", ...inputStyle }}
            />
            <button
              type="button"
              onClick={openCamera}
              style={{ ...submitStyle, background: "#22c55e", flexShrink: 0 }}
            >
              📷 Capture
            </button>
          </div>
        </div>
      </div>

      {cameraOpen && (
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <video
            ref={videoRef}
            autoPlay
            style={{
              width: "100%",
              borderRadius: 8,
              border: "1px solid #ccc",
              marginBottom: 10,
            }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
          <div
            style={{ display: "flex", justifyContent: "center", gap: 12 }}
          >
            <button
              type="button"
              onClick={capturePhoto}
              style={{ ...submitStyle, background: "#2563eb" }}
            >
              Capture Photo
            </button>
            <button
              type="button"
              onClick={closeCamera}
              style={{ ...submitStyle, background: "#ef4444" }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {preview.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 16,
            justifyContent: "center",
          }}
        >
          {preview.map((src, i) => (
            <img
              key={i}
              src={src}
              alt="preview"
              style={{
                width: 110,
                height: 110,
                objectFit: "cover",
                borderRadius: 8,
                border: "1px solid #ccc",
              }}
            />
          ))}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <button type="submit" style={submitStyle}>
          Register
        </button>
      </div>
    </form>
  );
}

// =================== Styles ===================
const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  outline: "none",
  fontSize: "15px",
  boxSizing: "border-box",
};

const submitStyle = {
  padding: "12px 28px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  background: "#0ea5e9",
  color: "#fff",
  fontWeight: 600,
  fontSize: "16px",
  transition: "background 0.2s",
};
