import React, { useState } from "react";

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
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

        <div>
          <label style={{ display: "block", marginBottom: 6, color: "#374151" }}>
            Upload Student Images (JPG only)
          </label>
          <input
            type="file"
            accept=".jpg,.jpeg"
            multiple
            onChange={handleFileChange}
            required
            style={{ ...inputStyle, padding: "8px 10px" }}
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
  boxSizing: "border-box", // ✅ crucial fix for right spacing
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
