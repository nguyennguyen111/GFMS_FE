import React, { useEffect, useMemo, useState } from "react";
import "./PTPortalPages.css";
import {
  createPTPackage,
  getMyPTPackages,
  togglePTPackage,
  updatePTPackage,
} from "../../services/ptPackageService";

const emptyForm = {
  name: "",
  description: "",
  type: "ONE_ON_ONE",
  price: "",
  sessions: "",
  durationDays: "",
};

const formatMoney = (n) => {
  if (n === null || n === undefined || n === "") return "-";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString("vi-VN");
};

const Badge = ({ active }) => {
  return (
    <span className={`ptp-badge ${active ? "ptp-badge--on" : "ptp-badge--off"}`}>
      {active ? "ACTIVE" : "INACTIVE"}
    </span>
  );
};

const Toast = ({ type = "info", text, onClose }) => {
  if (!text) return null;
  return (
    <div className={`ptp-toast ptp-toast--${type}`}>
      <div>{text}</div>
      <button className="ptp-toast__close" onClick={onClose}>
        ✕
      </button>
    </div>
  );
};

const PTPackages = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  // modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // package object hoặc null
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // UX extras
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL | ACTIVE | INACTIVE
  const [toast, setToast] = useState({ type: "info", text: "" });

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast({ type: "info", text: "" }), 2500);
  };

  const fetchData = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await getMyPTPackages();
      setItems(res?.data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const viewItems = useMemo(() => {
    let data = [...items];

    if (filter !== "ALL") {
      const wantActive = filter === "ACTIVE";
      data = data.filter((x) => Boolean(x.isActive) === wantActive);
    }

    if (q.trim()) {
      const s = q.trim().toLowerCase();
      data = data.filter((x) => (x.name || "").toLowerCase().includes(s));
    }

    return data;
  }, [items, q, filter]);

  const canSubmit = useMemo(() => {
    if (!form.name.trim()) return false;
    if (form.price === "" || Number.isNaN(Number(form.price))) return false;
    if (form.sessions !== "" && form.sessions !== null) {
      if (Number.isNaN(Number(form.sessions))) return false;
      if (Number(form.sessions) <= 0) return false;
    }
    if (form.durationDays !== "" && form.durationDays !== null) {
      if (Number.isNaN(Number(form.durationDays))) return false;
      if (Number(form.durationDays) <= 0) return false;
    }
    return true;
  }, [form]);

  const onChange = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (pkg) => {
    setEditing(pkg);
    setForm({
      name: pkg.name || "",
      description: pkg.description || "",
      type: pkg.type || "ONE_ON_ONE",
      price: pkg.price ?? "",
      sessions: pkg.sessions ?? "",
      durationDays: pkg.durationDays ?? "",
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const submit = async () => {
    setErr("");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        type: form.type || "ONE_ON_ONE",
        price: Number(form.price),
        sessions: form.sessions === "" ? null : Number(form.sessions),
        durationDays: form.durationDays === "" ? null : Number(form.durationDays),
      };

      if (editing) {
        await updatePTPackage(editing.id, payload);
        showToast("success", "Đã cập nhật package");
      } else {
        // create cần thêm vài field default cho khớp BE bạn đang set
        await createPTPackage({
          ...payload,
          gymId: null,
          status: "ACTIVE",
          isActive: true,
          validityType: "months",
          maxSessionsPerWeek: null,
        });
        showToast("success", "Đã tạo package");
      }

      closeModal();
      await fetchData();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Submit failed");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (pkg) => {
    setErr("");
    const next = !pkg.isActive;
    const ok = window.confirm(
      next
        ? `Bật package "${pkg.name}" để hiển thị/bán?`
        : `Tắt package "${pkg.name}" để ẩn/ngưng bán?`
    );
    if (!ok) return;

    try {
      await togglePTPackage(pkg.id);
      showToast("success", next ? "Đã bật package" : "Đã tắt package");
      await fetchData();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Toggle failed");
    }
  };

  return (
    <div className="ptp-wrap" style={{ placeItems: "start center" }}>
      <Toast
        type={toast.type}
        text={toast.text}
        onClose={() => setToast({ type: "info", text: "" })}
      />

      <div className="ptp-card" style={{ width: "min(1020px, 95vw)" }}>
        <div className="ptp-header">
          <div>
            <h2 style={{ margin: 0 }}>Packages</h2>
            <p style={{ marginTop: 6, opacity: 0.9 }}>
              Tạo và quản lý gói dịch vụ PT (PT Package).
            </p>
          </div>

          <button className="ptp-btn ptp-btn--primary" onClick={openCreate}>
            + Create package
          </button>
        </div>

        {err ? <div className="ptp-alert">{err}</div> : null}

        {/* Toolbar */}
        <div className="ptp-toolbar">
          <input
            className="ptp-input"
            placeholder="Search theo tên package..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            className="ptp-input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ maxWidth: 220 }}
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active only</option>
            <option value="INACTIVE">Inactive only</option>
          </select>

          <button className="ptp-btn" onClick={fetchData}>
            Refresh
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ padding: 12 }}>Loading...</div>
        ) : viewItems.length === 0 ? (
          <div className="ptp-empty">
            <div className="ptp-empty__title">Chưa có package</div>
            <div className="ptp-empty__desc">
              Hãy tạo package đầu tiên để bắt đầu bán dịch vụ PT.
            </div>
            <button className="ptp-btn ptp-btn--primary" onClick={openCreate}>
              + Create package
            </button>
          </div>
        ) : (
          <div className="ptp-table-wrap">
            <table className="ptp-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Sessions</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {viewItems.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{x.name}</div>
                      {x.description ? (
                        <div style={{ opacity: 0.8, fontSize: 12, marginTop: 4 }}>
                          {x.description}
                        </div>
                      ) : null}
                    </td>
                    <td>{x.type}</td>
                    <td>{formatMoney(x.price)}</td>
                    <td>{x.sessions ?? "-"}</td>
                    <td>{x.durationDays ?? "-"}</td>
                    <td>
                      <Badge active={Boolean(x.isActive)} />
                    </td>
                    <td>
                      <div className="ptp-actions">
                        <button className="ptp-btn" onClick={() => openEdit(x)}>
                          Edit
                        </button>
                        <button
                          className={`ptp-btn ${x.isActive ? "ptp-btn--danger" : "ptp-btn--primary"}`}
                          onClick={() => toggle(x)}
                        >
                          {x.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {open ? (
        <div className="ptp-modal__overlay" onMouseDown={closeModal}>
          <div className="ptp-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ptp-modal__header">
              <h3 style={{ margin: 0 }}>
                {editing ? "Edit package" : "Create package"}
              </h3>
              <button className="ptp-btn" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="ptp-modal__body">
              <div className="ptp-grid">
                <div>
                  <div className="ptp-label">Name *</div>
                  <input
                    className="ptp-input"
                    value={form.name}
                    onChange={onChange("name")}
                    placeholder="Ví dụ: Gói 10 buổi tăng cơ"
                  />
                </div>

                <div>
                  <div className="ptp-label">Type</div>
                  <select className="ptp-input" value={form.type} onChange={onChange("type")}>
                    <option value="ONE_ON_ONE">ONE_ON_ONE</option>
                    <option value="GROUP">GROUP</option>
                    <option value="ONLINE">ONLINE</option>
                  </select>
                </div>

                <div>
                  <div className="ptp-label">Price *</div>
                  <input
                    className="ptp-input"
                    value={form.price}
                    onChange={onChange("price")}
                    placeholder="Ví dụ: 1500000"
                  />
                </div>

                <div>
                  <div className="ptp-label">Sessions (optional)</div>
                  <input
                    className="ptp-input"
                    value={form.sessions}
                    onChange={onChange("sessions")}
                    placeholder="Ví dụ: 10"
                  />
                </div>

                <div>
                  <div className="ptp-label">Duration Days (optional)</div>
                  <input
                    className="ptp-input"
                    value={form.durationDays}
                    onChange={onChange("durationDays")}
                    placeholder="Ví dụ: 30"
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="ptp-label">Description</div>
                  <textarea
                    className="ptp-input"
                    style={{ height: 90 }}
                    value={form.description}
                    onChange={onChange("description")}
                    placeholder="Mô tả ngắn gọn nội dung gói..."
                  />
                </div>
              </div>

              {err ? <div className="ptp-alert" style={{ marginTop: 12 }}>{err}</div> : null}
            </div>

            <div className="ptp-modal__footer">
              <button className="ptp-btn" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="ptp-btn ptp-btn--primary"
                disabled={!canSubmit || saving}
                onClick={submit}
              >
                {saving ? "Saving..." : editing ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PTPackages;
