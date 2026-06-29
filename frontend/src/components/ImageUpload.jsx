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

  const handleRemove = (e) => {
    e.stopPropagation();
    // Clear the field. Passing null signals "no image" to the parent, which
    // sends an empty string on save so the backend removes it.
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
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
          position: "relative",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#9945FF")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")}
      >
        {value?.preview ? (
          <>
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
            <button
              type="button"
              onClick={handleRemove}
              aria-label={"Remove " + label}
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                border: "none",
                background: "rgba(0,0,0,0.65)",
                color: "#fff",
                fontSize: "15px",
                lineHeight: "1",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ×
            </button>
          </>
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
