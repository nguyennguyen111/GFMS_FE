import React, { useEffect, useState } from "react";
import "./MemberProfilePage.css";

export default function MemberProfilePage() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user"));
      setUser(u);
      setForm(u);
    } catch {
      setUser(null);
    }
  }, []);

  if (!user) {
    return <div className="profile-page">Không có dữ liệu người dùng</div>;
  }

  const role = localStorage.getItem("role") || "member";

  const handleSave = () => {
    localStorage.setItem("user", JSON.stringify(form));
    setUser(form);
    setEditing(false);
    alert("Đã lưu thông tin (MVP)");
  };

  const handleDelete = () => {
    if (!window.confirm("Bạn chắc chắn muốn xoá tài khoản?")) return;
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="profile-page">
      {/* ===== HEADER ===== */}
      <div className="profile-header">
        <div className="avatar">
          {user.username?.[0]?.toUpperCase()}
        </div>

        <div className="meta">
          <h2>{user.username}</h2>
          <span className="role">{role}</span>
        </div>

        <button
          className="btn ghost"
          onClick={() => setEditing(!editing)}
        >
          ✏️ {editing ? "Huỷ" : "Chỉnh sửa"}
        </button>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="profile-content">
        {/* LEFT */}
        <div className="card">
          <h4>Thông tin cá nhân</h4>

          <Field
            label="Username"
            value={form.username}
            editing={editing}
            onChange={v => setForm({ ...form, username: v })}
          />

          <Field
            label="Email"
            value={form.email}
            editing={editing}
            onChange={v => setForm({ ...form, email: v })}
          />

          <Field
            label="Số điện thoại"
            value={form.phone || ""}
            editing={editing}
            onChange={v => setForm({ ...form, phone: v })}
          />

          <Field
            label="Địa chỉ"
            value={form.address || ""}
            editing={editing}
            onChange={v => setForm({ ...form, address: v })}
          />

          {editing && (
            <button className="btn primary save" onClick={handleSave}>
              💾 Lưu thay đổi
            </button>
          )}
        </div>

        {/* RIGHT */}
        <div className="card subtle">
          <h4>Trạng thái tài khoản</h4>

          <Info label="Giới tính" value={form.sex || "male"} />
          <Info label="Trạng thái" value={form.status || "active"} />
          <Info
            label="Email verified"
            value={form.emailVerified ? "Yes" : "No"}
          />
          <Info
            label="Last login"
            value={
              form.lastLogin
                ? new Date(form.lastLogin).toLocaleString()
                : "—"
            }
          />

          <button className="btn danger delete" onClick={handleDelete}>
            🗑️ Xoá tài khoản
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== SUB COMPONENTS ===== */

function Field({ label, value, editing, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        value={value}
        readOnly={!editing}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="info">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
