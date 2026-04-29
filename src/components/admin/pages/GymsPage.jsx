import React, { useEffect, useMemo, useState } from "react";
import "./UsersPage.css";
import "./GymsPage.css";
import {
  getGyms,
  getUsers,
  getGymDetail,
  createGym,
  updateGym,
  suspendGym,
  restoreGym,
  deleteGymApi,
  uploadGymImage
} from "../../../services/adminService";
import { showAppConfirm } from "../../../utils/appDialog";
import NiceModal from "../../common/NiceModal";

const DEFAULT_LIMIT = 10;
const DEFAULT_HOURS = {
  monFri: { open: "", close: "" },
  weekend: { open: "", close: "" }
};
const EMPTY_IMAGES = [];
const MAX_IMAGES = 10;
const HOURS_24 = Array.from({ length: 24 }).map((_, i) => String(i).padStart(2, "0"));
const MINUTES_60 = Array.from({ length: 12 }).map((_, i) => String(i * 5).padStart(2, "0")); // step 5

function safeTrim(v) {
  return (v ?? "").toString().trim();
}

const normalize = (v) => safeTrim(v).toLowerCase();

const GYM_STATUS_VI = {
  active: "Hoạt động",
  suspended: "Tạm ngưng",
  deleted: "Đã xoá",
};

function parseOperatingHours(value) {
  if (!value) return { ...DEFAULT_HOURS };
  if (typeof value === "object") {
    return {
      monFri: { open: value.monFri?.open || "", close: value.monFri?.close || "" },
      weekend: { open: value.weekend?.open || "", close: value.weekend?.close || "" }
    };
  }
  try {
    const parsed = JSON.parse(value);
    return {
      monFri: { open: parsed.monFri?.open || "", close: parsed.monFri?.close || "" },
      weekend: { open: parsed.weekend?.open || "", close: parsed.weekend?.close || "" }
    };
  } catch (e) {
    return { ...DEFAULT_HOURS };
  }
}

function splitTime(val) {
  if (!val) return { h: "", m: "" };
  const [h, m] = val.split(":");
  return { h: h ?? "", m: m ?? "" };
}

function mergeTime(h, m) {
  if (!h && !m) return "";
  const hh = h?.toString().padStart(2, "0");
  const mm = m?.toString().padStart(2, "0");
  return `${hh}:${mm || "00"}`;
}

function TimePickerRow({ value, onChange }) {
  const { h: openH, m: openM } = splitTime(value?.open);
  const { h: closeH, m: closeM } = splitTime(value?.close);

  const update = (type, h, m) => {
    const next = {
      ...value,
      [type]: mergeTime(h, m)
    };
    onChange(next);
  };

  return (
    <div className="gp-time">
      <div className="gp-time__col">
        <label>Mở cửa</label>
        <div className="gp-time__inputs">
          <select value={openH} onChange={(e) => update("open", e.target.value, openM)}>
            <option value="">--</option>
            {HOURS_24.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <span>:</span>
          <select value={openM} onChange={(e) => update("open", openH, e.target.value)}>
            <option value="">--</option>
            {MINUTES_60.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="gp-time__sep">đến</div>

      <div className="gp-time__col">
        <label>Đóng cửa</label>
        <div className="gp-time__inputs">
          <select value={closeH} onChange={(e) => update("close", e.target.value, closeM)}>
            <option value="">--</option>
            {HOURS_24.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <span>:</span>
          <select value={closeM} onChange={(e) => update("close", closeH, e.target.value)}>
            <option value="">--</option>
            {MINUTES_60.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

function parseImages(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export default function GymsPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [gyms, setGyms] = useState([]);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // active | suspended | all
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // screen: list | create | edit | detail
  const [screen, setScreen] = useState("list");
  const [modalMode, setModalMode] = useState("create"); // create | edit
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    description: "",
    status: "active",
    ownerId: "",
    operatingHours: { ...DEFAULT_HOURS },
    images: [...EMPTY_IMAGES]
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [owners, setOwners] = useState([]);

  const [detail, setDetail] = useState(null);
  const [detailErr, setDetailErr] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [noticeModal, setNoticeModal] = useState({ open: false, tone: "error", title: "", message: "" });

  const openNotice = (tone, title, message) => {
    setNoticeModal({
      open: true,
      tone: tone || "error",
      title: title || "Thông báo",
      message: message || "Đã xảy ra lỗi.",
    });
  };

  const canSubmit = useMemo(() => {
    return Boolean(
      safeTrim(form.name) &&
      safeTrim(form.address) &&
      safeTrim(form.phone) &&
      safeTrim(form.email)
    );
  }, [form]);

  const fetchGyms = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await getGyms();
      const payload = res?.data?.DT || res?.data?.data || [];
      setGyms(Array.isArray(payload) ? payload : []);
    } catch (e) {
      setErr(e?.response?.data?.EM || e?.message || "Không thể tải danh sách gym");
    } finally {
      setLoading(false);
    }
  };

  const fetchOwners = async () => {
    try {
      const res = await getUsers({ limit: 1000, status: "active" });
      const payload = res?.data?.DT || res?.data?.data || [];
      const ownerList = Array.isArray(payload) ? payload.filter((u) => u.groupName === "Gym Owners") : [];
      setOwners(ownerList);
    } catch (e) {
      console.error("Không tải được danh sách Owners", e);
    }
  };

  useEffect(() => {
    fetchGyms();
    fetchOwners();
  }, []);

  const openCreate = () => {
    setScreen("create");
    setModalMode("create");
    setEditingId(null);
    setForm({
      name: "",
      address: "",
      phone: "",
      email: "",
      description: "",
      status: "active",
      ownerId: "",
      operatingHours: { ...DEFAULT_HOURS },
      images: [...EMPTY_IMAGES]
    });
  };

  const openEdit = async (g) => {
    setScreen("edit");
    setModalMode("edit");
    setEditingId(g.id);
    setForm({
      name: g.name || "",
      address: g.address || "",
      phone: g.phone || "",
      email: g.email || "",
      description: g.description || "",
      status: g.status || "active",
      ownerId: g.ownerId != null ? String(g.ownerId) : "",
      operatingHours: parseOperatingHours(g.operatingHours),
      // danh sách ảnh lấy từ list (nếu có); sẽ bổ sung thêm bằng detail call
      images: parseImages(g.images)
    });
    // fetch chi tiết để đảm bảo có đủ danh sách ảnh (list có thể thiếu)
    try {
      const res = await getGymDetail(g.id);
      const payload = res?.data?.DT || res?.data?.data || null;
      if (payload) {
        const serverImages = parseImages(payload.images);
        setForm((prev) => {
          // giữ các ảnh user vừa chọn (base64) và merge thêm ảnh từ server (URL)
          const existing = Array.isArray(prev.images) ? prev.images : [];
          const merged = [...serverImages, ...existing.filter((img) => !serverImages.includes(img))];
          return {
            ...prev,
            images: merged
          };
        });
      }
    } catch (e) {
      console.error("Không load được images khi edit", e);
    }
  };

  const goList = () => {
    setScreen("list");
    setErr("");
    setDetail(null);
    setDetailErr("");
  };

  const handleSelectImages = async (files) => {
    if (!files || files.length === 0) return;
    if (form.images.length >= MAX_IMAGES) {
      setErr(`Tối đa ${MAX_IMAGES} ảnh`);
      return;
    }
    setUploadingImages(true);
    try {
      const remain = MAX_IMAGES - form.images.length;
      const slice = Array.from(files).slice(0, remain);
      const uploaded = await Promise.all(
        slice.map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          const res = await uploadGymImage(fd);
          return res?.data?.url;
        })
      );
      const unique = uploaded.filter((img) => img && !form.images.includes(img));
      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...unique]
      }));
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Upload ảnh thất bại");
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (idx) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setErr("");
    // validate giờ hoạt động
    const hasHours =
      form.operatingHours?.monFri?.open ||
      form.operatingHours?.monFri?.close ||
      form.operatingHours?.weekend?.open ||
      form.operatingHours?.weekend?.close;

    const invalidSlots = [];
    const validateRange = (label, open, close) => {
      if (open && close && open >= close) invalidSlots.push(label);
    };
    validateRange("Thứ 2 - Thứ 6", form.operatingHours?.monFri?.open, form.operatingHours?.monFri?.close);
    validateRange("Thứ 7 - CN", form.operatingHours?.weekend?.open, form.operatingHours?.weekend?.close);
    if (invalidSlots.length > 0) {
      setErr(`Giờ mở phải sớm hơn giờ đóng: ${invalidSlots.join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: safeTrim(form.name),
        address: safeTrim(form.address),
        phone: safeTrim(form.phone),
        email: safeTrim(form.email),
        description: safeTrim(form.description),
        status: form.status,
        ownerId: form.ownerId ? Number(form.ownerId) : null,
        operatingHours: hasHours ? form.operatingHours : null,
        images: form.images && form.images.length ? form.images : null
      };

      if (modalMode === "create") {
        await createGym(payload);
      } else {
        await updateGym(editingId, payload);
      }

      goList();
      await fetchGyms();
    } catch (e2) {
      setErr(e2?.response?.data?.EM || e2.message || "Lưu phòng gym thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (g) => {
    const confirmResult = await showAppConfirm({
      title: "Xác nhận tạm ngưng",
      message: `Tạm ngưng gym "${g.name}"?`,
      confirmText: "Xác nhận",
      cancelText: "Quay lại",
    });
    if (!confirmResult.confirmed) return;
    setLoading(true);
    setErr("");
    try {
      await suspendGym(g.id);
      await fetchGyms();
      openNotice("success", "Thành công", `Đã tạm ngưng gym "${g.name}".`);
    } catch (e) {
      openNotice("error", "Tạm ngưng thất bại", e?.response?.data?.EM || e?.message || "Tạm ngưng thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (g) => {
    const confirmResult = await showAppConfirm({
      title: "Xác nhận khôi phục",
      message: `Khôi phục gym "${g.name}"?`,
      confirmText: "Khôi phục",
      cancelText: "Quay lại",
    });
    if (!confirmResult.confirmed) return;
    setLoading(true);
    setErr("");
    try {
      await restoreGym(g.id);
      await fetchGyms();
      openNotice("success", "Thành công", `Đã khôi phục gym "${g.name}".`);
    } catch (e) {
      openNotice("error", "Khôi phục thất bại", e?.response?.data?.EM || e?.message || "Khôi phục thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGym = async (g) => {
    const confirmResult = await showAppConfirm({
      title: "Xác nhận xoá phòng gym",
      message: `Bạn có chắc chắn muốn xóa phòng gym "${g.name}" (ID: ${g.id})?`,
      description: "Thao tác này không thể hoàn tác.",
      confirmText: "Xóa",
      cancelText: "Quay lại",
      tone: "danger",
    });
    if (!confirmResult.confirmed) return;
    setLoading(true);
    setErr("");
    try {
      await deleteGymApi(g.id);
      goList();
      await fetchGyms();
      openNotice("success", "Xoá thành công", `Đã xoá phòng gym "${g.name}".`);
    } catch (e) {
      openNotice("error", "Xoá thất bại", e?.response?.data?.EM || e?.message || "Xoá phòng gym thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (g) => {
    setScreen("detail");
    setDetail(null);
    setDetailErr("");
    setDetailLoading(true);
    try {
      const res = await getGymDetail(g.id);
      const payload = res?.data?.DT || res?.data?.data || null;
      const normalized = payload
        ? {
            ...payload,
            operatingHours: (() => {
              if (!payload.operatingHours) return null;
              const parsed = parseOperatingHours(payload.operatingHours);
              const has =
                parsed.monFri.open || parsed.monFri.close || parsed.weekend.open || parsed.weekend.close;
              return has ? parsed : null;
            })(),
            images: parseImages(payload.images)
          }
        : null;
      setDetail(normalized);
    } catch (e) {
      setDetailErr(e?.response?.data?.EM || e.message || "Không lấy được chi tiết gym");
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleSort = (field) => {
    if (sortBy !== field) {
      setSortBy(field);
      setSortOrder("asc");
      return;
    }
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const headerSortIcon = (field) => {
    if (sortBy !== field) return "↕";
    return sortOrder === "asc" ? "↑" : "↓";
  };

  const filtered = useMemo(() => {
    let data = Array.isArray(gyms) ? gyms : [];
    if (statusFilter !== "all") {
      data = data.filter((g) => normalize(g.status) === normalize(statusFilter));
    }
    if (search) {
      const q = normalize(search);
      data = data.filter((g) =>
        [g.name, g.address, g.phone, g.email]
          .map(normalize)
          .some((v) => v.includes(q))
      );
    }
    return data;
  }, [gyms, search, statusFilter]);

  const sorted = useMemo(() => {
    const data = [...filtered];
    data.sort((a, b) => {
      const av = a?.[sortBy];
      const bv = b?.[sortBy];
      if (sortBy === "createdAt" || sortBy === "updatedAt") {
        const at = av ? new Date(av).getTime() : 0;
        const bt = bv ? new Date(bv).getTime() : 0;
        return sortOrder === "asc" ? at - bt : bt - at;
      }
      const sa = normalize(av);
      const sb = normalize(bv);
      if (sa < sb) return sortOrder === "asc" ? -1 : 1;
      if (sa > sb) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [filtered, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / DEFAULT_LIMIT));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * DEFAULT_LIMIT;
    return sorted.slice(start, start + DEFAULT_LIMIT);
  }, [sorted, page]);

  const gotoPage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  const showList = screen === "list";
  const showForm = screen === "create" || screen === "edit";
  const showDetail = screen === "detail";

  return (
    <div className="up-wrap">
      <div className="up-head">
        <div>
          <h2 className="up-title">Quản lý phòng gym</h2>
        </div>

        {showList ? (
          <div className="up-actions">
            <div className="up-filter">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Tất cả</option>
                <option value="active">Hoạt động</option>
                <option value="suspended">Tạm ngưng</option>
              </select>
            </div>

            <div className="up-search">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên / địa chỉ / email / SĐT..."
              />
            </div>

            <button className="up-btn" onClick={openCreate}>+ Tạo phòng gym</button>
          </div>
        ) : (
          <div className="up-actions">
            <button className="up-btn up-btn--ghost" onClick={goList}>← Quay lại danh sách</button>
            {showDetail && detail ? (
              <button className="up-btn" onClick={() => openEdit(detail)}>Sửa gym này</button>
            ) : null}
          </div>
        )}
      </div>

      {err && showList ? <div className="up-alert">{err}</div> : null}

      {showList && (
        <div className="up-card">
          <div className="up-tableWrap">
            <table className="up-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort("id")} className="is-sort">Mã {headerSortIcon("id")}</th>
                  <th onClick={() => toggleSort("name")} className="is-sort">Phòng gym {headerSortIcon("name")}</th>
                  <th>Chủ sở hữu</th>
                  <th onClick={() => toggleSort("status")} className="is-sort">Trạng thái {headerSortIcon("status")}</th>
                  <th onClick={() => toggleSort("createdAt")} className="is-sort">Ngày tạo {headerSortIcon("createdAt")}</th>
                  <th className="col-actions">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="up-td-center">Đang tải...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={6} className="up-td-center">Không có dữ liệu</td></tr>
                ) : paginated.map((g) => (
                  <tr key={g.id}>
                    <td>{g.id}</td>
                    <td>
                      <div className="gp-name">{g.name}</div>
                      <div className="gp-sub">{g.address || "-"}</div>
                    </td>
                    <td>
                      {g.owner?.username || g.FranchiseRequest?.contactPerson ? (
                        <div className="gp-owner">
                          <div className="gp-name">
                            {g.FranchiseRequest?.contactPerson || g.owner?.username || "-"}
                          </div>
                          <div className="gp-sub">
                            {g.FranchiseRequest?.contactEmail || g.FranchiseRequest?.contactPhone || g.owner?.email || g.owner?.phone || "-"}
                          </div>
                        </div>
                      ) : g.ownerId ? (
                        <div className="gp-sub">Chủ sở hữu #{g.ownerId}</div>
                      ) : (
                        <div className="gp-sub">-</div>
                      )}
                    </td>
                    <td>
                      <span className={`up-status is-${g.status}`}>{GYM_STATUS_VI[g.status] || g.status || "-"}</span>
                    </td>
                    <td>{g.createdAt ? new Date(g.createdAt).toLocaleString() : "-"}</td>
                    <td className="col-actions">
                      <button className="up-btn up-btn--ghost" onClick={() => handleViewDetail(g)}>Chi tiết</button>
                      <button className="up-btn up-btn--ghost" onClick={() => openEdit(g)}>Sửa</button>
                      {g.status === "suspended" ? (
                        <button className="up-btn" onClick={() => handleRestore(g)}>Khôi phục</button>
                      ) : (
                        <button className="up-btn up-btn--danger" onClick={() => handleSuspend(g)}>Tạm ngưng</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="up-footer">
            <div className="up-meta">
              Tổng: <b>{sorted.length}</b> • Trang <b>{page}</b>/<b>{totalPages}</b>
            </div>
            <div className="up-pagi">
              <button className="up-btn up-btn--ghost" onClick={() => gotoPage(page - 1)} disabled={page <= 1}>
                ← Trước
              </button>
              <div className="up-pages">
                {Array.from({ length: Math.min(7, totalPages) }).map((_, i) => {
                  const start = Math.max(1, page - 3);
                  const p = Math.min(totalPages, start + i);
                  return (
                    <button
                      key={p}
                      className={`up-page ${p === page ? "is-active" : ""}`}
                      onClick={() => gotoPage(p)}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <button className="up-btn up-btn--ghost" onClick={() => gotoPage(page + 1)} disabled={page >= totalPages}>
                Sau →
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="up-card">
          <div className="up-modal__head">
            <div className="up-modal__title">
              {modalMode === "create" ? "Tạo phòng gym" : "Cập nhật phòng gym"}
            </div>
          </div>
          <form className="up-form" onSubmit={handleSubmit}>
            <div className="up-row">
              <label>Tên gym *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Tên phòng gym"
              />
            </div>
            <div className="up-row">
              <label>Địa chỉ *</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Số, đường, quận..."
              />
            </div>
            <div className="up-grid2">
              <div className="up-row">
                <label>Số điện thoại *</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0xxxxxxxxx"
                />
              </div>
              <div className="up-row">
                <label>Email *</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@domain.com"
                />
              </div>
            </div>
            <div className="up-grid2">
              <div className="up-row">
                <label>Chủ sở hữu (tuỳ chọn)</label>
                <select
                  value={form.ownerId}
                  onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
                >
                  <option value="">-- Không chọn --</option>
                  {owners.map((o) => (
                    <option key={o.id} value={String(o.id)}>
                      {o.username} /({o.email || o.phone || "no email"})
                    </option>
                  ))}
                </select>
              </div>
              <div className="up-row">
                <label>Trạng thái</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Hoạt động</option>
                  <option value="suspended">Tạm ngưng</option>
                </select>
              </div>
            </div>
            <div className="up-row">
              <label>Giờ hoạt động</label>
              <div className="gp-hours is-card">
                <div className="gp-hours__row">
                  <div className="gp-hours__label">Thứ 2 - Thứ 6</div>
                  <TimePickerRow
                    value={form.operatingHours?.monFri || DEFAULT_HOURS.monFri}
                    onChange={(next) => setForm({
                      ...form,
                      operatingHours: {
                        ...(form.operatingHours || { ...DEFAULT_HOURS }),
                        monFri: next
                      }
                    })}
                  />
                </div>

                <div className="gp-hours__row">
                  <div className="gp-hours__label">Thứ 7 - CN</div>
                  <TimePickerRow
                    value={form.operatingHours?.weekend || DEFAULT_HOURS.weekend}
                    onChange={(next) => setForm({
                      ...form,
                      operatingHours: {
                        ...(form.operatingHours || { ...DEFAULT_HOURS }),
                        weekend: next
                      }
                    })}
                  />
                </div>
              </div>
            </div>
            <div className="up-row">
              <label>Hình ảnh (tối đa {MAX_IMAGES})</label>
              <div className="gp-upload is-card">
                <label className="gp-upload__drop">
                  <div className="gp-upload__icon">⬆</div>
                  <div className="gp-upload__text">
                    <b>Chọn hoặc kéo thả ảnh</b>
                    <span>Hỗ trợ JPG/PNG, tối đa {MAX_IMAGES} ảnh</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleSelectImages(e.target.files)}
                    disabled={uploadingImages || form.images.length >= MAX_IMAGES}
                  />
                </label>

                {uploadingImages ? <div className="gp-sub">Đang tải ảnh...</div> : null}

                {form.images?.length ? (
                  <div className="gp-upload__grid">
                    {form.images.map((img, idx) => (
                      <div className="gp-upload__item" key={idx}>
                        <div className="gp-upload__thumb" style={{ backgroundImage: `url(${img})` }} />
                        <div className="gp-upload__meta">
                          <span>Ảnh {idx + 1}</span>
                          <button type="button" className="up-btn up-btn--ghost" onClick={() => removeImage(idx)}>
                            Xoá
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="gp-sub">Chưa có ảnh nào</div>
                )}
              </div>
            </div>
            <div className="up-row">
              <label>Mô tả</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Giới thiệu ngắn về phòng gym"
              />
            </div>

            {err ? <div className="up-alert">{err}</div> : null}

            <div className="up-form__actions">
              <button type="button" className="up-btn up-btn--ghost" onClick={goList}>Huỷ</button>
              <button type="submit" className="up-btn" disabled={!canSubmit || loading}>
                {loading ? "Đang xử lý..." : "Lưu"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showDetail && (
        <div className="up-card gp-detail">
          <div className="up-modal__head">
            <div className="up-modal__title">Chi tiết phòng gym</div>
            <div className="up-actions">
              
              {detail ? (
                <>
                  
                  <button className="up-btn up-btn--danger" onClick={() => handleDeleteGym(detail)}>Xoá phòng gym</button>
                </>
              ) : null}
            </div>
          </div>
          <div className="gp-detail__body">
            {detailLoading ? (
              <div className="up-td-center">Đang tải chi tiết...</div>
            ) : detailErr ? (
              <div className="up-alert">{detailErr}</div>
            ) : detail ? (
              <>
                <div className="gp-detail__header">
                  <div>
                    <div className="gp-detail__name">{detail.name}</div>
                    <div className="gp-sub">{detail.address}</div>
                  </div>
                  <span className={`up-status is-${detail.status}`}>{detail.status}</span>
                </div>

                <div className="gp-grid">
                  <div className="gp-block">
                    <div className="gp-block__title">Liên hệ</div>
                    <div className="gp-sub">SĐT: {detail.phone || "-"}</div>
                    <div className="gp-sub">Email: {detail.email || "-"}</div>
                  </div>
                  <div className="gp-block">
                    <div className="gp-block__title">Chủ sở hữu</div>
                    {detail.owner || detail.FranchiseRequest ? (
                      <>
                        <div className="gp-name">
                          {detail.FranchiseRequest?.contactPerson || detail.owner?.username || "-"}
                        </div>
                        <div className="gp-sub">
                          {detail.FranchiseRequest?.contactEmail || detail.owner?.email || "-"}
                        </div>
                        <div className="gp-sub">
                          {detail.FranchiseRequest?.contactPhone || detail.owner?.phone || "-"}
                        </div>
                      </>
                    ) : (
                      <div className="gp-sub">N/A</div>
                    )}
                  </div>
                  <div className="gp-block">
                    <div className="gp-block__title">Mô tả</div>
                    <div className="gp-sub">{detail.description || "-"}</div>
                  </div>
                  <div className="gp-block">
                    <div className="gp-block__title">Giờ hoạt động</div>
                    {detail.operatingHours ? (
                      (() => {
                        const hours = detail.operatingHours;
                        const hasHours =
                          hours.monFri?.open || hours.monFri?.close || hours.weekend?.open || hours.weekend?.close;
                        if (!hasHours) return <div className="gp-sub">Chưa cấu hình</div>;
                        return (
                          <div className="gp-hours-view">
                            <div className="gp-sub">
                              Thứ 2 - Thứ 6: {hours.monFri?.open || "--:--"} - {hours.monFri?.close || "--:--"}
                            </div>
                            <div className="gp-sub">
                              Thứ 7 - CN: {hours.weekend?.open || "--:--"} - {hours.weekend?.close || "--:--"}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="gp-sub">Chưa cấu hình</div>
                    )}
                  </div>
                </div>

                <div className="gp-stat-grid">
                  {detail.statistics ? (
                    <>
                      <div className="gp-stat">
                        <div className="gp-stat__label">Hội viên</div>
                        <div className="gp-stat__val">{detail.statistics.totalMembers}</div>
                      </div>
                      <div className="gp-stat">
                        <div className="gp-stat__label">PT</div>
                        <div className="gp-stat__val">{detail.statistics.totalTrainers}</div>
                      </div>
                      <div className="gp-stat">
                        <div className="gp-stat__label">Gói</div>
                        <div className="gp-stat__val">{detail.statistics.totalPackages}</div>
                      </div>
                      <div className="gp-stat">
                        <div className="gp-stat__label">Thiết bị</div>
                        <div className="gp-stat__val">{detail.statistics.totalEquipment}</div>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="gp-block">
                  <div className="gp-block__title">Hình ảnh</div>
                  {Array.isArray(detail.images) && detail.images.length > 0 ? (
                    <div className="gp-imgGrid">
                      {detail.images.map((url, idx) => (
                        <a
                          key={idx}
                          className="gp-img gp-img--thumb"
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ backgroundImage: `url(${url})` }}
                          title={url}
                        >
                          <span className="gp-img__index">{idx + 1}</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="gp-sub">Chưa có hình ảnh</div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      <NiceModal
        open={Boolean(noticeModal.open)}
        onClose={() => setNoticeModal({ open: false, tone: "error", title: "", message: "" })}
        title={noticeModal.title || "Thông báo"}
        tone={noticeModal.tone || "error"}
        footer={
          <button
            type="button"
            className="nice-modal__btn nice-modal__btn--primary"
            onClick={() => setNoticeModal({ open: false, tone: "error", title: "", message: "" })}
          >
            Đã hiểu
          </button>
        }
      >
        <p>{noticeModal.message}</p>
      </NiceModal>
    </div>
  );
}

