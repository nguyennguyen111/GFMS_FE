import React from "react";

export default function PlaceholderPage({ title }) {
  return (
    <div style={{
      borderRadius: 18,
      padding: 16,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.10)",
      boxShadow: "0 18px 60px rgba(0,0,0,0.30)"
    }}>
      <h2 style={{ marginTop: 0, marginBottom: 6 }}>{title}</h2>
      <p style={{ opacity: 0.78, marginBottom: 0 }}>
        Module này đang ở <b style={{ color: "#ffb000" }}>initData (Giai đoạn 1)</b>. Sau này code fullstack theo route/menu đã dựng sẵn.
      </p>
    </div>
  );
}
