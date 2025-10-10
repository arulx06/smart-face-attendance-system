// Simple Portal Modal component
import React, { useEffect } from "react";
import ReactDOM from "react-dom";

function Modal({ children, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    // Prevent background scroll while modal open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const modalContent = (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        padding: 20
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 96%)",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 18px 50px rgba(2,6,23,0.2)",
          padding: 18,
          border: "1px solid rgba(2,6,23,0.06)"
        }}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

export default Modal;