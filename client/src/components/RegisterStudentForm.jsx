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
    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === "image/jpeg" || file.type === "image/jpg"
    );
    if (files.length === 0) return;
    setImages(files);
    setPreview(files.map((f) => URL.createObjectURL(f)));
  };

  // 🧹 Remove a selected image
  const handleRemoveImage = (index) => {
    const updatedImages = images.filter((_, i) => i !== index);
    const updatedPreview = preview.filter((_, i) => i !== index);
    setImages(updatedImages);
    setPreview(updatedPreview);

    // Also clear file input if all images are removed
    if (updatedImages.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (images.length === 0) {
      alert("Please upload at least one image.");
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
        alert("Student registered successfully!");
        setForm({ studentId: "", name: "", email: "", department: "", year: "" });
        setImages([]);
        setPreview([]);

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

      {/* 🖼️ Preview images with delete button */}
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
            <div key={i} style={{ position: "relative" }}>
              <img
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
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveImage(i);
                }}
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: 22,
                  height: 22,
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: "22px",
                }}
              >
                ×
              </button>
            </div>
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
