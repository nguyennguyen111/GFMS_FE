import React, { useEffect, useMemo, useState } from "react";
import "./UsersPage.css";
import { getUsers, createUser, updateUser, deleteUser, getGroups } from "../../../services/adminService";

const DEFAULT_LIMIT = 10;

function safeTrim(v) {
  return (v ?? "").toString().trim();
}

export default function UsersPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: DEFAULT_LIMIT, totalPages: 1, totalItems: 0 });

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // ✅ NEW: filter theo status
  const [statusFilter, setStatusFilter] = useState("active"); // active | inactive | all

  const [groups, setGroups] = useState([]);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // create | edit
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    phone: "",
    address: "",
    sex: "male",
    groupId: "",
    status: "active"
  });

  const canSubmit = useMemo(() => {
    if (!safeTrim(form.email) || !safeTrim(form.username)) return false;
    if (modalMode === "create" && !safeTrim(form.password)) return false;
    return true;
  }, [form, modalMode]);

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setForm({
      email: "",
      username: "",
      password: "",
      phone: "",
      address: "",
      sex: "male",
      groupId: groups?.[0]?.id ? String(groups[0].id) : "",
      status: "active"
    });
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setModalMode("edit");
    setEditingId(u.id);
    setForm({
      email: u.email || "",
      username: u.username || "",
      password: "",
      phone: u.phone || "",
      address: u.address || "",
      sex: u.sex || "male",
      groupId: u.groupId != null ? String(u.groupId) : "",
      status: u.status || "active"
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setErr("");
  };

  const fetchGroups = async () => {
    try {
      const res = await getGroups();
      setGroups(res?.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async ({ page, limit, searchText, sb, so, st }) => {
    setLoading(true);
    setErr("");
    try {
      const res = await getUsers({
        page,
        limit,
        search: searchText,
        sortBy: sb,
        sortOrder: so,
        status: st
      });
      const payload = res?.data || {};
      setUsers(payload.data || []);
      setMeta(payload.meta || { page: 1, limit, totalPages: 1, totalItems: 0 });
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Fetch users failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // debounce search + sort + status
  useEffect(() => {
    const t = setTimeout(() => {
      fetchUsers({
        page: 1,
        limit: meta.limit,
        searchText: search,
        sb: sortBy,
        so: sortOrder,
        st: statusFilter
      });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sortBy, sortOrder, statusFilter]);

  // first load
  useEffect(() => {
    fetchUsers({ page: 1, limit: DEFAULT_LIMIT, searchText: "", sb: sortBy, so: sortOrder, st: statusFilter });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSort = (field) => {
    if (sortBy !== field) {
      setSortBy(field);
      setSortOrder("asc");
      return;
    }
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setErr("");

    try {
      const payload = {
        email: safeTrim(form.email),
        username: safeTrim(form.username),
        phone: safeTrim(form.phone),
        address: safeTrim(form.address),
        sex: form.sex,
        status: form.status,
        groupId: form.groupId ? Number(form.groupId) : null
      };

      if (modalMode === "create") {
        payload.password = form.password;
        await createUser(payload);
      } else {
        if (safeTrim(form.password)) payload.password = form.password;
        await updateUser(editingId, payload);
      }

      closeModal();
      await fetchUsers({
        page: meta.page,
        limit: meta.limit,
        searchText: search,
        sb: sortBy,
        so: sortOrder,
        st: statusFilter
      });
    } catch (e2) {
      setErr(e2?.response?.data?.error || e2.message || "Submit failed");
    } finally {
      setLoading(false);
    }
  };

  // ✅ SOFT DELETE UI: "Vô hiệu hoá"
  const onDelete = async (u) => {
    const ok = window.confirm(`Vô hiệu hoá user "${u.username}" (${u.email})?\nUser sẽ không thể đăng nhập, nhưng dữ liệu & lịch sử vẫn được giữ.`);
    if (!ok) return;

    setLoading(true);
    setErr("");
    try {
      await deleteUser(u.id); // BE sẽ set status=inactive
      const nextPage = meta.page > 1 && users.length === 1 ? meta.page - 1 : meta.page;
      await fetchUsers({
        page: nextPage,
        limit: meta.limit,
        searchText: search,
        sb: sortBy,
        so: sortOrder,
        st: statusFilter
      });
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Disable failed");
    } finally {
      setLoading(false);
    }
  };

  const gotoPage = (p) => {
    if (p < 1 || p > meta.totalPages) return;
    fetchUsers({ page: p, limit: meta.limit, searchText: search, sb: sortBy, so: sortOrder, st: statusFilter });
  };

  const headerSortIcon = (field) => {
    if (sortBy !== field) return "↕";
    return sortOrder === "asc" ? "↑" : "↓";
  };

  return (
    <div className="up-wrap">
      <div className="up-head">
        <div>
          <h2 className="up-title">Quản lý người dùng</h2>
          <div className="up-sub">UC-USER-13..16 • Search • Sort • Pagination • CRUD</div>
        </div>

        <div className="up-actions">
          {/* ✅ NEW: status filter */}
          <div className="up-filter">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="suspended">suspended</option>
              <option value="all">all</option>
            </select>
          </div>

          <div className="up-search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo email / username / phone..."
            />
          </div>

          <button className="up-btn" onClick={openCreate}>+ Tạo user</button>
        </div>
      </div>

      {err ? <div className="up-alert">{err}</div> : null}

      <div className="up-card">
        <div className="up-tableWrap">
          <table className="up-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort("id")} className="is-sort">ID {headerSortIcon("id")}</th>
                <th onClick={() => toggleSort("email")} className="is-sort">Email {headerSortIcon("email")}</th>
                <th onClick={() => toggleSort("username")} className="is-sort">Username {headerSortIcon("username")}</th>
                <th>Nhóm</th>
                <th onClick={() => toggleSort("phone")} className="is-sort">Phone {headerSortIcon("phone")}</th>
                <th onClick={() => toggleSort("status")} className="is-sort">Status {headerSortIcon("status")}</th>
                <th onClick={() => toggleSort("createdAt")} className="is-sort">Created {headerSortIcon("createdAt")}</th>
                <th className="col-actions">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="up-td-center">Đang tải...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={8} className="up-td-center">Không có dữ liệu</td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.email}</td>
                  <td>{u.username}</td>
                  <td>
                    <span className="up-badge">
                      {u.groupName || (u.groupId != null ? `Group#${u.groupId}` : "N/A")}
                    </span>
                  </td>
                  <td>{u.phone || "-"}</td>
                  <td><span className={`up-status is-${u.status}`}>{u.status}</span></td>
                  <td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}</td>
                  <td className="col-actions">
                    <button className="up-btn up-btn--ghost" onClick={() => openEdit(u)}>Sửa</button>
                    <button
                      className="up-btn up-btn--danger"
                      onClick={() => onDelete(u)}
                      disabled={u.status === "inactive"}
                      title={u.status === "inactive" ? "User đã inactive" : "Vô hiệu hoá user"}
                    >
                      {u.status === "inactive" ? "Đã vô hiệu" : "Vô hiệu hoá"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="up-footer">
          <div className="up-meta">
            Tổng: <b>{meta.totalItems}</b> • Trang <b>{meta.page}</b>/<b>{meta.totalPages}</b>
          </div>

          <div className="up-pagi">
            <button className="up-btn up-btn--ghost" onClick={() => gotoPage(meta.page - 1)} disabled={meta.page <= 1}>
              ← Trước
            </button>

            <div className="up-pages">
              {Array.from({ length: Math.min(7, meta.totalPages) }).map((_, i) => {
                const start = Math.max(1, meta.page - 3);
                const p = Math.min(meta.totalPages, start + i);
                return (
                  <button
                    key={p}
                    className={`up-page ${p === meta.page ? "is-active" : ""}`}
                    onClick={() => gotoPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button className="up-btn up-btn--ghost" onClick={() => gotoPage(meta.page + 1)} disabled={meta.page >= meta.totalPages}>
              Sau →
            </button>
          </div>
        </div>
      </div>

      {/* Modal giữ nguyên như bạn đang có */}
      {modalOpen ? (
        <div className="up-modalOverlay" onMouseDown={closeModal}>
          <div className="up-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="up-modal__head">
              <div className="up-modal__title">
                {modalMode === "create" ? "Tạo tài khoản người dùng" : "Cập nhật thông tin user"}
              </div>
              <button className="up-x" onClick={closeModal} aria-label="Close">✕</button>
            </div>

            <form className="up-form" onSubmit={onSubmit}>
              <div className="up-row">
                <label>Email *</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@domain.com"
                />
              </div>

              <div className="up-row">
                <label>Username *</label>
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="username"
                />
              </div>

              <div className="up-row">
                <label>Password {modalMode === "create" ? "*" : "(để trống nếu không đổi)"}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={modalMode === "create" ? "mật khẩu" : "••••••••"}
                />
              </div>

              <div className="up-grid2">
                <div className="up-row">
                  <label>Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="0xxxxxxxxx"
                  />
                </div>

                <div className="up-row">
                  <label>Sex</label>
                  <select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                    <option value="male">male</option>
                    <option value="female">female</option>
                    <option value="other">other</option>
                  </select>
                </div>
              </div>

              <div className="up-row">
                <label>Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Địa chỉ"
                />
              </div>

              <div className="up-grid2">
                <div className="up-row">
                  <label>Group</label>
                  <select
                    value={form.groupId}
                    onChange={(e) => setForm({ ...form, groupId: e.target.value })}
                  >
                    <option value="">-- Chọn nhóm --</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div className="up-row">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="suspended">suspended</option>
                  </select>
                </div>
              </div>

              {err ? <div className="up-alert">{err}</div> : null}

              <div className="up-form__actions">
                <button type="button" className="up-btn up-btn--ghost" onClick={closeModal}>Huỷ</button>
                <button type="submit" className="up-btn" disabled={!canSubmit || loading}>
                  {loading ? "Đang xử lý..." : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
