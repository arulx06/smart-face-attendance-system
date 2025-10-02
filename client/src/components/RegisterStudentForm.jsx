// frontend/src/components/RegisterStudentForm.jsx
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

  // append form fields
  Object.entries(form).forEach(([key, val]) => data.append(key, val));

  // append images
  images.forEach((img) => data.append("images", img));

  try {
    // NOTE: Correct backend route
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
    <form onSubmit={handleSubmit} style={{ maxWidth: 500, margin: "0 auto" }}>
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          name="studentId"
          placeholder="Student ID"
          value={form.studentId}
          onChange={handleChange}
          required
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
          required
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          name="department"
          placeholder="Department"
          value={form.department}
          onChange={handleChange}
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          name="year"
          placeholder="Year"
          value={form.year}
          onChange={handleChange}
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <input
          type="file"
          accept=".jpg,.jpeg"
          multiple
          onChange={handleFileChange}
          required
          style={inputStyle}
        />
      </div>

      {/* Preview images */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        {preview.map((src, i) => (
          <img key={i} src={src} alt="preview" style={{ width: 120, borderRadius: 8 }} />
        ))}
      </div>

      <button type="submit" style={submitStyle}>Register</button>
    </form>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc"
};

const submitStyle = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  background: "#0ea5e9",
  color: "#fff",
  fontWeight: 600
};
