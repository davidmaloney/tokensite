import React, { useRef } from "react";

export default function ImageUpload({ label, value, onChange, hint }) {
  const inputRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ file, preview: reader.result });
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label>
        {label} <span style={{ color: "#555" }}>(optional)</span>
      </label>
      {hint && <div style={{ fontSize: "11px", color: "#555", marginBottom: "8px" }}>{hint}</div>}
      <div
        onClick={() => inputRef.current.click()}
        style={{
          border: "2px dashed rgba(255,255,255,0.15)",
          borderRadius: "10px",
          padding: "20px",
          textAlign: "center",
          cursor: "pointer",
          background: "rgba(255,255,255,0.03)",
          transition: "border-color 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#9945FF")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")}
      >
        {value?.preview ? (
          <img
            src={value.preview}
            alt="preview"
            style={{
              maxHeight: "120px",
              maxWidth: "100%",
              borderRadius: "8px",
              objectFit: "contain",
            }}
          />
        ) : (
          <div style={{ color: "#555", fontSize: "14px" }}>
            Click to upload
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}
