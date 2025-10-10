import React, { useState, useRef } from "react";

export default function RegisterStudentForm() {
  const [form, setForm] = useState({
    studentId: "",
    name: "",
    email: "",
    department: "",
    year: ""
  });
  const [images, setImages] = useState([]);
  const [preview, setPreview] = useState([]);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    setPreview(files.map((f) => URL.createObjectURL(f)));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type === "image/jpeg" || file.type === "image/jpg"
    );
    if (files.length === 0) return;
    setImages(files);
    setPreview(files.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (images.length === 0) {
      alert("Please upload at least one image.");
      return;
    }

    const token = localStorage.getItem("token");
    const data = new FormData();

    // Append form fields
    Object.entries(form).forEach(([key, val]) => data.append(key, val));

    // Append images
    images.forEach((img) => data.append("images", img));

    try {
      const res = await fetch("http://localhost:5000/api/register/register", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: data
      });

      const result = await res.json();

      if (result.success) {
        alert("Student registered successfully!");
        setForm({ studentId: "", name: "", email: "", department: "", year: "" });
        setImages([]);
        setPreview([]);

        // Clear file input manually
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        alert("Error: " + result.message);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to register student.");
    }
  };

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
      {/* Input Fields */}
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
          placeholder="Email (e.g. cb.en.u4cce23035@cb.students.amrita.edu)"
          value={form.email}
          onChange={handleChange}
          style={inputStyle}
        />
        <input
          type="text"
          name="department"
          placeholder="Department (e.g. CCE)"
          value={form.department}
          onChange={handleChange}
          style={inputStyle}
        />
        <input
          type="text"
          name="year"
          placeholder="Year (e.g. 2nd Year)"
          value={form.year}
          onChange={handleChange}
          style={inputStyle}
        />

        {/* Drag & Drop Upload */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
          style={{
            border: isDragging ? "2px dashed #0ea5e9" : "2px dashed #ccc",
            borderRadius: 8,
            padding: "20px",
            textAlign: "center",
            cursor: "pointer",
            background: isDragging ? "#f0f9ff" : "#fafafa",
            transition: "border 0.2s, background 0.2s",
          }}
        >
          <p style={{ margin: 0, color: "#374151" }}>
            Drag & drop images here or click to upload (JPG only)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg"
            multiple
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>
      </div>

      {/* Preview images */}
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

      {/* Centered button */}
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <button type="submit" style={submitStyle}>
          Register
        </button>
      </div>
    </form>
  );
}

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
