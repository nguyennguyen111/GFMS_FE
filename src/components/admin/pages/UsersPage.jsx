import React, { useEffect, useMemo, useState } from "react";
import "./UsersPage.css";
import { getUsers, createUser, updateUser, deleteUser, getGroups } from "../../../services/adminService";

const DEFAULT_LIMIT = 10;

const USER_STATUS_VI = { active: "Hoạt động", inactive: "Ngưng", suspended: "Tạm khoá" };

function safeTrim(v) {
  return (v ?? "").toString().trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;
const PHONE_RE = /^[0-9]{10,11}$/;

/** Gộp nhóm trùng tên (và trùng id) phòng BE/DB lặp — tránh dropdown dài lặp lại */
function normalizeGroupOptions(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const byId = new Map();
  for (const g of list) {
    const id = Number(g.id);
    if (!Number.isFinite(id)) continue;
    if (!byId.has(id)) byId.set(id, g);
  }
  const byName = new Map();
  for (const g of byId.values()) {
    const key = safeTrim(g.name).toLowerCase() || `__id_${g.id}`;
    const prev = byName.get(key);
    if (!prev || Number(g.id) < Number(prev.id)) byName.set(key, g);
  }
  return Array.from(byName.values()).sort((a, b) => Number(a.id) - Number(b.id));
}

function validateCreateUserForm(form) {
  const email = safeTrim(form.email);
  const username = safeTrim(form.username);
  const password = String(form.password || "");
  const phone = safeTrim(form.phone);

  if (!email) return "Email là bắt buộc.\nĐịnh dạng: ten@gmail.com (có @ và tên miền).";
  if (!EMAIL_RE.test(email)) return "Email không đúng định dạng.\nVí dụ: user.name@gmail.com";
  if (!username) return "Tên đăng nhập là bắt buộc.\nQuy tắc: 3–32 ký tự, chỉ chữ (a-z), số và dấu _.";
  if (!USERNAME_RE.test(username)) {
    return "Tên đăng nhập không hợp lệ.\nCần 3–32 ký tự: a-z, A-Z, 0-9, _. Không khoảng trắng, không ký tự đặc biệt.";
  }
  if (!password) return "Mật khẩu là bắt buộc khi tạo mới.\nTối thiểu 6 ký tự.";
  if (password.length < 6) return "Mật khẩu quá ngắn.\nYêu cầu: tối thiểu 6 ký tự.";
  if (phone && !PHONE_RE.test(phone)) {
    return "Số điện thoại không hợp lệ.\nNếu nhập: chỉ 10–11 chữ số, không +, không khoảng trắng (vd: 0912345678).";
  }
  if (!form.groupId) return "Vui lòng chọn nhóm (Nhóm) cho tài khoản.";
  return null;
}

function validateEditUserForm(form) {
  const email = safeTrim(form.email);
  const username = safeTrim(form.username);
  const password = String(form.password || "");
  const phone = safeTrim(form.phone);

  if (!email) return "Email là bắt buộc.";
  if (!EMAIL_RE.test(email)) return "Email không đúng định dạng.\nVí dụ: user@gmail.com";
  if (!username) return "Tên đăng nhập là bắt buộc.";
  if (!USERNAME_RE.test(username)) {
    return "Tên đăng nhập không hợp lệ.\n3–32 ký tự: chữ/số/_";
  }
  if (password && password.length < 6) return "Mật khẩu mới quá ngắn (tối thiểu 6 ký tự), hoặc để trống nếu không đổi.";
  if (phone && !PHONE_RE.test(phone)) {
    return "Số điện thoại không hợp lệ.\n10–11 chữ số, không khoảng trắng.";
  }
  return null;
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
  const [statusFilter, setStatusFilter] = useState("all"); // active | inactive | suspended | all

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
    if (modalMode === "create" && (!safeTrim(form.password) || !safeTrim(form.groupId))) return false;
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
      setGroups(normalizeGroupOptions(res?.data?.data || []));
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
      setErr(e?.response?.data?.error || e.message || "Tải danh sách người dùng thất bại");
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

    const clientErr = modalMode === "create" ? validateCreateUserForm(form) : validateEditUserForm(form);
    if (clientErr) {
      setErr(clientErr);
      return;
    }

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
      const apiMsg =
        e2?.response?.data?.error ||
        e2?.response?.data?.message ||
        (Array.isArray(e2?.response?.data?.errors) && e2.response.data.errors.join("\n")) ||
        e2.message ||
        "Gửi dữ liệu thất bại";
      setErr(String(apiMsg));
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
      setErr(e?.response?.data?.error || e.message || "Vô hiệu hoá thất bại");
    } finally {
      setLoading(false);
    }
  };

  const gotoPage = (nextPage) => {
    const safePage = Math.max(1, Math.min(Number(meta.totalPages || 1), Number(nextPage || 1)));
    if (safePage === Number(meta.page || 1)) return;
    fetchUsers({ page: safePage, limit: meta.limit, searchText: search, sb: sortBy, so: sortOrder, st: statusFilter });
  };

  const visiblePages = useMemo(() => {
    const total = Math.max(1, Number(meta.totalPages || 1));
    const current = Math.max(1, Math.min(total, Number(meta.page || 1)));
    const maxButtons = 7;
    const start = Math.max(1, Math.min(current - Math.floor(maxButtons / 2), total - maxButtons + 1));
    const end = Math.min(total, start + maxButtons - 1);
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  }, [meta.page, meta.totalPages]);

  const headerSortIcon = (field) => {
    if (sortBy !== field) return "↕";
    return sortOrder === "asc" ? "↑" : "↓";
  };

  return (
    <div className="up-wrap">
      <div className="up-head">
        <div>
          <h2 className="up-title">Quản lý người dùng</h2>
          <div className="up-sub">Tìm kiếm • Sắp xếp • Phân trang • Thêm / sửa / vô hiệu</div>
        </div>

        <div className="up-actions">
          {/* ✅ NEW: status filter */}
          <div className="up-filter">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Ngưng hoạt động</option>
              <option value="suspended">Tạm khoá</option>
              <option value="all">Tất cả</option>
            </select>
          </div>

          <div className="up-search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo email / tên đăng nhập / SĐT..."
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
                <th onClick={() => toggleSort("username")} className="is-sort">Tên đăng nhập {headerSortIcon("username")}</th>
                <th>Nhóm</th>
                <th onClick={() => toggleSort("phone")} className="is-sort">Số điện thoại {headerSortIcon("phone")}</th>
                <th onClick={() => toggleSort("status")} className="is-sort">Trạng thái {headerSortIcon("status")}</th>
                <th onClick={() => toggleSort("createdAt")} className="is-sort">Ngày tạo {headerSortIcon("createdAt")}</th>
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
                  <td>
                    <span className={`up-status is-${u.status}`}>
                      {USER_STATUS_VI[u.status] || u.status}
                    </span>
                  </td>
                  <td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}</td>
                  <td className="col-actions">
                    <button className="up-btn up-btn--ghost" onClick={() => openEdit(u)}>Sửa</button>
                    <button
                      className="up-btn up-btn--danger"
                      onClick={() => onDelete(u)}
                      disabled={u.status === "inactive"}
                      title={u.status === "inactive" ? "Tài khoản đã ngưng hoạt động" : "Vô hiệu hoá tài khoản"}
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
              Tổng theo bộ lọc: <b>{meta.totalItems}</b> • Trang <b>{meta.page}</b>/<b>{meta.totalPages}</b>
            </div>

          <div className="up-pagi">
            <button className="up-btn up-btn--ghost" onClick={() => gotoPage(meta.page - 1)} disabled={meta.page <= 1}>
              ← Trước
            </button>

            <div className="up-pages">
              {visiblePages.map((p) => (
                <button
                  key={p}
                  className={`up-page ${p === meta.page ? "is-active" : ""}`}
                  onClick={() => gotoPage(p)}
                >
                  {p}
                </button>
              ))}
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
                {modalMode === "create" ? "Tạo tài khoản người dùng" : "Cập nhật thông tin người dùng"}
              </div>
              <button className="up-x" onClick={closeModal} aria-label="Đóng">✕</button>
            </div>

            <form className="up-form" onSubmit={onSubmit}>
              <div className="up-row">
                <label>Email *</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@domain.com"
                />
                <div className="up-hint">Định dạng hợp lệ: có @ và tên miền (vd: name@gmail.com).</div>
              </div>

              <div className="up-row">
                <label>Tên đăng nhập *</label>
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="tên đăng nhập"
                />
                <div className="up-hint">3–32 ký tự: chữ a-z, số và dấu _. Không dùng khoảng trắng.</div>
              </div>

              <div className="up-row">
                <label>Mật khẩu {modalMode === "create" ? "*" : "(để trống nếu không đổi)"}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={modalMode === "create" ? "mật khẩu" : "••••••••"}
                />
                {modalMode === "create" ? <div className="up-hint">Tối thiểu 6 ký tự.</div> : null}
              </div>

              <div className="up-grid2">
                <div className="up-row">
                  <label>Số điện thoại</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="0xxxxxxxxx"
                  />
                  <div className="up-hint">Tuỳ chọn. Nếu nhập: 10–11 số, không khoảng trắng.</div>
                </div>

                <div className="up-row">
                  <label>Giới tính</label>
                  <select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
              </div>

              <div className="up-row">
                <label>Địa chỉ</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Địa chỉ"
                />
              </div>

              <div className="up-grid2">
                <div className="up-row">
                  <label>Nhóm{modalMode === "create" ? " *" : ""}</label>
                  <select
                    value={form.groupId}
                    onChange={(e) => setForm({ ...form, groupId: e.target.value })}
                  >
                    <option value="">-- Chọn nhóm --</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <div className="up-hint">
                    Đây là <b>nhóm người dùng</b> (bảng Group), không phải danh sách từng quyền (GroupRole).
                    Nếu dropdown từng bị lặp Administrators/Gym Owners… nhiều lần, nguyên nhân là DB có nhiều dòng nhóm trùng tên;
                    API và giao diện đã gộp theo tên để chỉ hiện một dòng mỗi nhóm.
                  </div>
                </div>

                <div className="up-row">
                  <label>Trạng thái</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Ngưng</option>
                    <option value="suspended">Tạm khoá</option>
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
