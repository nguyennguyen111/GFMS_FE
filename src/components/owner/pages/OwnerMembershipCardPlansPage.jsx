import React, { useEffect, useMemo, useState } from "react";
import useSelectedGym from "../../../hooks/useSelectedGym";
import { getOwnerGymsListCached } from "../../../utils/ownerGymsListCache";
import { uploadGymImage } from "../../../services/uploadService";
import {
  ownerCreateMembershipCardPlan,
  ownerGetMembershipCardPlansByGym,
  ownerToggleMembershipCardPlan,
  ownerUpdateMembershipCardPlan,
} from "../../../services/ownerMembershipCardPlanService";
import "./OwnerMembershipCardPlansPage.css";

const emptyForm = { name: "", months: "1", price: "", imageUrl: "", description: "" };

export default function OwnerMembershipCardPlansPage() {
  const { selectedGymId, selectedGym, setSelectedGym } = useSelectedGym();
  const [items, setItems] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const filtered = useMemo(
    () =>
      items.filter((x) => {
        const q = String(search || "").trim().toLowerCase();
        const matchSearch =
          !q ||
          String(x.name || "").toLowerCase().includes(q) ||
          String(x.description || "").toLowerCase().includes(q);
        const matchStatus =
          statusFilter === "all" ||
          (statusFilter === "active" ? !!x.isActive : !x.isActive);
        return matchSearch && matchStatus;
      }),
    [items, search, statusFilter]
  );

  const loadData = async (gymId = selectedGymId) => {
    setLoading(true);
    setError("");
    try {
      const res = await ownerGetMembershipCardPlansByGym(gymId);
      setItems(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Không tải được danh sách thẻ thành viên.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedGymId);
  }, [selectedGymId]);

  useEffect(() => {
    let mounted = true;
    getOwnerGymsListCached()
      .then((list) => {
        if (!mounted) return;
        const nextGyms = Array.isArray(list) ? list : [];
        setGyms(nextGyms);
      })
      .catch(() => {
        if (mounted) setGyms([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleGymChange = (gymIdRaw) => {
    const gymId = Number(gymIdRaw || 0);
    if (!gymId) return;
    const gym = gyms.find((g) => Number(g.id) === gymId);
    if (!gym) return;
    setSelectedGym({
      id: Number(gym.id),
      name: gym.name,
      address: gym.address || "",
    });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditing(row);
    setForm({
      name: row.name || "",
      months: String(row.months || "1"),
      price: String(row.price || ""),
      imageUrl: row.imageUrl || "",
      description: row.description || "",
    });
    setModalOpen(true);
  };

  const onSubmit = async () => {
    if (!selectedGymId) {
      setError("Vui lòng chọn chi nhánh ở thanh điều hướng trước khi tạo thẻ.");
      return;
    }
    if (!form.name.trim()) {
      setError("Vui lòng nhập tên thẻ.");
      return;
    }
    const payload = {
      gymId: Number(selectedGymId),
      name: form.name.trim(),
      months: Number(form.months || 0),
      price: Number(form.price || 0),
      imageUrl: form.imageUrl || null,
      description: form.description?.trim() || null,
    };
    setSubmitting(true);
    setError("");
    try {
      let saved = null;
      if (editing?.id) {
        const res = await ownerUpdateMembershipCardPlan(editing.id, payload);
        saved = res?.data?.data || null;
        if (saved?.id) {
          setItems((prev) => prev.map((it) => (Number(it.id) === Number(saved.id) ? saved : it)));
        }
      } else {
        const res = await ownerCreateMembershipCardPlan(payload);
        saved = res?.data?.data || null;
        if (saved?.id) {
          setItems((prev) => [saved, ...prev]);
        }
      }
      resetForm();
      setModalOpen(false);
    } catch (e) {
      setError(e?.response?.data?.message || "Lưu thẻ thành viên thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const onUploadImage = async (file) => {
    if (!file) return;
    const validType = ["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type);
    if (!validType) {
      setError("Chỉ hỗ trợ ảnh JPG, PNG, WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh tối đa 5MB.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const result = await uploadGymImage(file);
      const url = result?.url || "";
      if (!url) throw new Error("Upload ảnh thất bại");
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Upload ảnh thất bại.");
    } finally {
      setUploading(false);
    }
  };

  const onToggle = async (row) => {
    setTogglingId(row.id);
    try {
      const res = await ownerToggleMembershipCardPlan(row.id);
      const updated = res?.data?.data || null;
      if (updated?.id) {
        setItems((prev) => prev.map((it) => (Number(it.id) === Number(updated.id) ? updated : it)));
      }
      setConfirmToggle(null);
    } catch (e) {
      setError(e?.response?.data?.message || "Không đổi được trạng thái.");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="omcp-page">
      <div className="omcp-head">
        <div>
          <h2 className="omcp-title">Quản lý thẻ thành viên</h2>
          <p>Tạo các loại thẻ 1/2/3 tháng để hội viên mua trong gym của bạn.</p>
        </div>
        <button className="omcp-btn" onClick={openCreateModal}>
          + Tạo thẻ
        </button>
      </div>

      <div className="omcp-branch-row">
        <label className="omcp-branch-label">Chi nhánh áp dụng</label>
        <select
          className="omcp-input omcp-branch-select"
          value={selectedGymId || ""}
          onChange={(e) => handleGymChange(e.target.value)}
        >
          <option value="">-- Chọn chi nhánh --</option>
          {gyms.map((gym) => (
            <option key={gym.id} value={gym.id}>
              {gym.name}
            </option>
          ))}
        </select>
        <span className="omcp-branch-current">
          {selectedGym?.name ? `Đang chọn: ${selectedGym.name}` : "Chưa chọn chi nhánh"}
        </span>
      </div>

      <div className="omcp-toolbar">
        <input
          className="omcp-input omcp-search"
          placeholder="Tìm theo tên thẻ hoặc mô tả..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="omcp-input omcp-statusFilter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang bán</option>
          <option value="inactive">Tạm ngưng</option>
        </select>
      </div>

      {error ? <div className="omcp-error">{error}</div> : null}

      <div className="omcp-tableWrap">
        <table className="omcp-table">
          <thead>
            <tr>
              <th>Tên thẻ</th>
              <th>Ảnh</th>
              <th>Thời hạn</th>
              <th>Giá</th>
              <th>Chi nhánh</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
        {loading ? (
          <tr><td colSpan={7} className="omcp-empty">Đang tải dữ liệu...</td></tr>
        ) : filtered.length === 0 ? (
          <tr><td colSpan={7} className="omcp-empty">Chưa có thẻ thành viên nào cho chi nhánh đang chọn.</td></tr>
        ) : (
          filtered.map((row) => (
            <tr key={row.id}>
              <td>
                <div className="omcp-name">{row.name}</div>
                {row.description ? <div className="omcp-desc">{row.description}</div> : null}
              </td>
              <td>
                {row.imageUrl ? (
                  <img className="omcp-thumb" src={row.imageUrl} alt={row.name} />
                ) : (
                  <div className="omcp-thumb omcp-thumb--empty">No image</div>
                )}
              </td>
              <td>{Number(row.months)} tháng</td>
              <td>{Number(row.price || 0).toLocaleString("vi-VN")}đ</td>
              <td>{row.Gym?.name || `Gym #${row.gymId}`}</td>
              <td>
                <span className={`omcp-status ${row.isActive ? "active" : "inactive"}`}>
                  {row.isActive ? "Đang bán" : "Tạm ngưng"}
                </span>
              </td>
              <td>
                <div className="omcp-item-actions">
                  <button className="omcp-btn ghost" onClick={() => openEditModal(row)}>
                    Sửa
                  </button>
                  <button
                    className="omcp-btn ghost"
                    onClick={() => setConfirmToggle(row)}
                    disabled={togglingId === row.id}
                  >
                    {row.isActive ? "Ngưng bán" : "Mở bán"}
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
          </tbody>
        </table>
      </div>

      {modalOpen ? (
        <div className="omcp-modalBackdrop" onClick={() => !submitting && setModalOpen(false)}>
          <div className="omcp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="omcp-modalHead">
              <h3>{editing ? "Cập nhật thẻ thành viên" : "Tạo thẻ thành viên"}</h3>
              <button
                className="omcp-btn ghost"
                onClick={() => !submitting && setModalOpen(false)}
                disabled={submitting}
              >
                Đóng
              </button>
            </div>
            <div className="omcp-modalGrid">
              <div className="omcp-field">
                <label>Tên thẻ</label>
                <input
                  className="omcp-input"
                  placeholder="VD: Thẻ Gym 1 tháng"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="omcp-field">
                <label>Thời hạn</label>
                <select
                  className="omcp-input"
                  value={form.months}
                  onChange={(e) => setForm((p) => ({ ...p, months: e.target.value }))}
                >
                  <option value="1">1 tháng</option>
                  <option value="2">2 tháng</option>
                  <option value="3">3 tháng</option>
                </select>
              </div>
              <div className="omcp-field">
                <label>Giá tiền</label>
                <input
                  className="omcp-input"
                  type="number"
                  placeholder="VD: 300000"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                />
              </div>
              <div className="omcp-field">
                <label>Mô tả</label>
                <input
                  className="omcp-input"
                  placeholder="Mô tả ngắn"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="omcp-field omcp-field--full">
                <label>Ảnh thẻ thành viên</label>
                <div className="omcp-uploadRow">
                  <label className="omcp-btn ghost">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onUploadImage(e.target.files?.[0])}
                      style={{ display: "none" }}
                      disabled={uploading || submitting}
                    />
                    {uploading ? "Đang upload..." : "Chọn ảnh"}
                  </label>
                  <input
                    className="omcp-input"
                    placeholder="Hoặc dán link ảnh"
                    value={form.imageUrl}
                    onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                  />
                </div>
                {form.imageUrl ? (
                  <img className="omcp-preview" src={form.imageUrl} alt="preview" />
                ) : null}
              </div>
            </div>
            <div className="omcp-modalActions">
              <button className="omcp-btn" onClick={onSubmit} disabled={submitting || uploading}>
                {submitting ? "Đang lưu..." : editing ? "Cập nhật thẻ" : "Tạo thẻ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmToggle ? (
        <div className="omcp-modalBackdrop" onClick={() => setConfirmToggle(null)}>
          <div className="omcp-modal omcp-confirmModal" onClick={(e) => e.stopPropagation()}>
            <div className="omcp-modalHead">
              <h3>Xác nhận thay đổi trạng thái</h3>
            </div>
            <p className="omcp-confirmText">
              Bạn có chắc muốn {confirmToggle.isActive ? "ngưng bán" : "mở bán"} thẻ{" "}
              <b>{confirmToggle.name}</b> không?
            </p>
            <div className="omcp-modalActions">
              <button className="omcp-btn ghost" onClick={() => setConfirmToggle(null)}>
                Hủy
              </button>
              <button className="omcp-btn" onClick={() => onToggle(confirmToggle)} disabled={togglingId === confirmToggle.id}>
                {togglingId === confirmToggle.id ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
