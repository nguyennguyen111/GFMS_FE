import React, { useMemo } from "react";

export default function MemberProfilePage() {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  return (
    <div className="op-wrap">
      <div className="op-head">
        <div>
          <h2 className="op-title">⚙️ Hồ sơ</h2>
          <div className="op-sub">Thông tin tài khoản và hội viên.</div>
        </div>
      </div>

      <div className="op-card padded">
        {!user ? (
          <div className="op-empty">Không có dữ liệu user trong localStorage.</div>
        ) : (
          <div className="op-grid">
            <div className="op-row">
              <label>Username</label>
              <input className="op-input" value={user.username || ""} readOnly />
            </div>
            <div className="op-row">
              <label>Email</label>
              <input className="op-input" value={user.email || ""} readOnly />
            </div>
            <div className="op-row">
              <label>Role</label>
              <input className="op-input" value={localStorage.getItem("role") || ""} readOnly />
            </div>
            <div className="op-row">
              <label>Ghi chú</label>
              <div className="op-sub">
                (MVP) Nếu bạn có API update profile, mình sẽ làm form chỉnh sửa + lưu.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
