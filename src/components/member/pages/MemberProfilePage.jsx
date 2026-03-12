import React, { useEffect, useMemo, useState } from "react";
import "./MemberProfilePage.css";
import { memberGetLatestMetric, memberGetMetrics } from "../../../services/memberMetricService";
import BMICard from "./BMICard";
import BMIProgressChart from "./BMIProgressChart";

/**
 * TODO: map API thật:
 * - GET /api/me (hoặc /api/member/profile)
 * - PATCH /api/me
 * - PATCH /api/me/password
 *
 * Hiện tại: fallback đọc localStorage user (để bạn không bị vỡ flow).
 */

const safeParse = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const initFormFromUser = (u) => ({
  username: u?.username || "",
  email: u?.email || "",
  phone: u?.phone || "",
  address: u?.address || "",
  sex: u?.sex || "male",
  status: u?.status || "active",
  emailVerified: !!u?.emailVerified,
  lastLogin: u?.lastLogin || null,
  avatar: u?.avatar || "",
});

export default function MemberProfilePage() {
  const [tab, setTab] = useState("profile"); // profile | password | bmi
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [metrics, setMetrics] = useState([]);
  const [latestMetric, setLatestMetric] = useState(null);

  // password
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);

  const role = localStorage.getItem("role") || "member";

  const loadMetrics = async () => {
    try {
      const [rows, latest] = await Promise.all([
        memberGetMetrics(),
        memberGetLatestMetric(),
      ]);
      setMetrics(Array.isArray(rows) ? rows : []);
      setLatestMetric(latest || null);
    } catch (e) {
      console.error("loadMetrics error:", e);
      setMetrics([]);
      setLatestMetric(null);
    }
  };

  useEffect(() => {
    const raw = localStorage.getItem("user");
    const u = safeParse(raw);
    const normalized = u?.user ? u.user : u;

    setUser(normalized || null);
    setForm(initFormFromUser(normalized || {}));
  }, []);

  useEffect(() => {
    loadMetrics();
  }, []);

  const displayName = useMemo(() => form?.username || "Member", [form]);

  const initials = useMemo(() => {
    const t = String(displayName || "").trim();
    if (!t) return "M";
    return t.slice(0, 1).toUpperCase();
  }, [displayName]);

  const handlePickAvatar = async (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setForm((p) => ({ ...p, avatar: url, _avatarFile: file }));
  };

  const handleSaveProfile = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const raw = localStorage.getItem("user");
      const u = safeParse(raw);

      if (u?.user) {
        localStorage.setItem(
          "user",
          JSON.stringify({ ...u, user: { ...u.user, ...form } })
        );
        setUser({ ...u.user, ...form });
      } else {
        localStorage.setItem("user", JSON.stringify({ ...u, ...form }));
        setUser({ ...u, ...form });
      }

      setEditing(false);
      alert("✅ Đã cập nhật thông tin (demo). Khi có API, thay đoạn localStorage bằng call API.");
    } catch (e) {
      alert("❌ Không lưu được. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pw.current || !pw.next || !pw.confirm) {
      alert("Vui lòng nhập đủ thông tin.");
      return;
    }
    if (pw.next.length < 6) {
      alert("Mật khẩu mới tối thiểu 6 ký tự.");
      return;
    }
    if (pw.next !== pw.confirm) {
      alert("Mật khẩu xác nhận không khớp.");
      return;
    }

    setPwSaving(true);
    try {
      setPw({ current: "", next: "", confirm: "" });
      alert("✅ Đổi mật khẩu thành công (demo). Khi có API, map endpoint thật.");
    } catch (e) {
      alert("❌ Đổi mật khẩu thất bại.");
    } finally {
      setPwSaving(false);
    }
  };

  if (!user || !form) {
    return <div className="mprof-empty">Không có dữ liệu người dùng</div>;
  }

  return (
    <div className="mprof-page">
      <div className="mprof-hero">
        <div className="mprof-avatarWrap">
          {form.avatar ? (
            <img className="mprof-avatarImg" src={form.avatar} alt="avatar" />
          ) : (
            <div className="mprof-avatarFallback">{initials}</div>
          )}
        </div>

        <div className="mprof-heroInfo">
          <div className="mprof-nameRow">
            <div className="mprof-name">{displayName}</div>
            <span className={`mprof-role ${role}`}>{String(role).toUpperCase()}</span>
          </div>

          <div className="mprof-meta">
            <span>✉️ {form.email || "—"}</span>
            <span>📞 {form.phone || "—"}</span>
          </div>

          <div className="mprof-badges">
            <span className={`mprof-badge ${form.status}`}>
              {String(form.status).toUpperCase()}
            </span>
            <span className={`mprof-badge ${form.emailVerified ? "ok" : "warn"}`}>
              {form.emailVerified ? "EMAIL VERIFIED" : "EMAIL NOT VERIFIED"}
            </span>
          </div>
        </div>

        <div className="mprof-heroActions">
          <button
            className="mprof-btn ghost"
            onClick={() => {
              setEditing((v) => !v);
              setTab("profile");
            }}
          >
            ✏️ {editing ? "Huỷ chỉnh sửa" : "Chỉnh sửa"}
          </button>

          <button className="mprof-btn primary" onClick={() => setTab("password")}>
            🔒 Đổi mật khẩu
          </button>
        </div>
      </div>

      <div className="mprof-tabs">
        <button
          className={`mprof-tab ${tab === "profile" ? "active" : ""}`}
          onClick={() => setTab("profile")}
        >
          Thông tin cá nhân
        </button>

        <button
          className={`mprof-tab ${tab === "password" ? "active" : ""}`}
          onClick={() => setTab("password")}
        >
          Đổi mật khẩu
        </button>

        <button
          className={`mprof-tab ${tab === "bmi" ? "active" : ""}`}
          onClick={() => setTab("bmi")}
        >
          BMI & tiến trình
        </button>
      </div>

      {tab === "profile" && (
        <div className="mprof-grid">
          <div className="mprof-card">
            <div className="mprof-cardHead">
              <h3>Thông tin cơ bản</h3>
              <span className="mprof-muted">
                Bạn có thể cập nhật các thông tin cá nhân.
              </span>
            </div>

            <div className="mprof-form">
              <Field
                label="Username"
                value={form.username}
                readOnly={!editing}
                onChange={(v) => setForm((p) => ({ ...p, username: v }))}
              />

              <Field
                label="Email"
                value={form.email}
                readOnly={!editing}
                onChange={(v) => setForm((p) => ({ ...p, email: v }))}
              />

              <div className="mprof-row2">
                <Field
                  label="Số điện thoại"
                  value={form.phone}
                  readOnly={!editing}
                  onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
                />

                <Select
                  label="Giới tính"
                  value={form.sex}
                  disabled={!editing}
                  onChange={(v) => setForm((p) => ({ ...p, sex: v }))}
                  options={[
                    { value: "male", label: "Nam" },
                    { value: "female", label: "Nữ" },
                    { value: "other", label: "Khác" },
                  ]}
                />
              </div>

              <Textarea
                label="Địa chỉ"
                value={form.address}
                readOnly={!editing}
                onChange={(v) => setForm((p) => ({ ...p, address: v }))}
              />

              <div className="mprof-avatarBlock">
                <div className="mprof-avatarSmall">
                  {form.avatar ? (
                    <img src={form.avatar} alt="avatar" />
                  ) : (
                    <div className="mprof-avatarSmallFallback">{initials}</div>
                  )}
                </div>

                <div className="mprof-avatarPick">
                  <div className="mprof-label">Avatar</div>
                  <div className="mprof-muted">PNG/JPG/GIF • tối đa 10MB</div>

                  <label className={`mprof-upload ${editing ? "" : "disabled"}`}>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={!editing}
                      onChange={(e) => handlePickAvatar(e.target.files?.[0])}
                    />
                    Chọn ảnh
                  </label>
                </div>
              </div>

              <div className="mprof-saveRow">
                <button
                  className="mprof-btn ghost"
                  disabled={!editing || saving}
                  onClick={() => setEditing(false)}
                >
                  Huỷ
                </button>

                <button
                  className="mprof-btn primary"
                  disabled={!editing || saving}
                  onClick={handleSaveProfile}
                >
                  {saving ? "Đang lưu..." : "Cập nhật thông tin"}
                </button>
              </div>
            </div>
          </div>

          <div className="mprof-card">
            <div className="mprof-cardHead">
              <h3>Trạng thái tài khoản</h3>
              <span className="mprof-muted">Thông tin hệ thống.</span>
            </div>

            <div className="mprof-infoList">
              <Info label="Role" value={String(role).toUpperCase()} />
              <Info label="Status" value={String(form.status).toUpperCase()} />
              <Info label="Email verified" value={form.emailVerified ? "YES" : "NO"} />
              <Info
                label="Last login"
                value={form.lastLogin ? new Date(form.lastLogin).toLocaleString("vi-VN") : "—"}
              />
            </div>

            <div className="mprof-note">
              * Phần trạng thái tài khoản thường do hệ thống quản lý.
            </div>
          </div>
        </div>
      )}

      {tab === "password" && (
        <div className="mprof-grid one">
          <div className="mprof-card">
            <div className="mprof-cardHead">
              <h3>Đổi mật khẩu</h3>
              <span className="mprof-muted">
                Hãy dùng mật khẩu mạnh và không trùng mật khẩu cũ.
              </span>
            </div>

            <div className="mprof-form">
              <Password
                label="Mật khẩu hiện tại"
                value={pw.current}
                onChange={(v) => setPw((p) => ({ ...p, current: v }))}
              />
              <Password
                label="Mật khẩu mới"
                value={pw.next}
                onChange={(v) => setPw((p) => ({ ...p, next: v }))}
              />
              <Password
                label="Xác nhận mật khẩu mới"
                value={pw.confirm}
                onChange={(v) => setPw((p) => ({ ...p, confirm: v }))}
              />

              <div className="mprof-saveRow">
                <button
                  className="mprof-btn ghost"
                  onClick={() => setTab("profile")}
                  disabled={pwSaving}
                >
                  ← Quay lại
                </button>

                <button
                  className="mprof-btn primary"
                  onClick={handleChangePassword}
                  disabled={pwSaving}
                >
                  {pwSaving ? "Đang đổi..." : "Đổi mật khẩu"}
                </button>
              </div>

              <div className="mprof-note">
                * Khi bạn nối API backend, chỗ này sẽ gọi endpoint đổi mật khẩu thật.
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "bmi" && (
        <div className="mprof-grid one">
          <BMICard
            latestMetric={latestMetric}
            metrics={metrics}
            onCreated={loadMetrics}
          />
          <BMIProgressChart data={metrics} />
        </div>
      )}
    </div>
  );
}

/* ===== small ui ===== */
function Field({ label, value, readOnly, onChange }) {
  return (
    <div className="mprof-field">
      <div className="mprof-label">{label}</div>
      <input
        className="mprof-input"
        value={value || ""}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Textarea({ label, value, readOnly, onChange }) {
  return (
    <div className="mprof-field">
      <div className="mprof-label">{label}</div>
      <textarea
        className="mprof-textarea"
        value={value || ""}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
      />
    </div>
  );
}

function Select({ label, value, disabled, onChange, options }) {
  return (
    <div className="mprof-field">
      <div className="mprof-label">{label}</div>
      <select
        className="mprof-input"
        value={value || "male"}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Password({ label, value, onChange }) {
  return (
    <div className="mprof-field">
      <div className="mprof-label">{label}</div>
      <input
        className="mprof-input"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        type="password"
        autoComplete="new-password"
      />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="mprof-infoRow">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}