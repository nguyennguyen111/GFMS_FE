import React, { useEffect, useState } from "react";
import "./OwnerSuppliersPage.css";
import { ownerGetSuppliers } from "../../../services/ownerPurchaseService";

export default function OwnerSuppliersPage() {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [searchQ, setSearchQ] = useState("");
  const [detail, setDetail] = useState(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await ownerGetSuppliers({ page, limit: 10, q: searchQ });
      setSuppliers(res?.data?.data ?? []);
      setMeta(res?.data?.meta ?? { page, limit: 10, totalItems: 0, totalPages: 1 });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (supplierId) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    setDetail(supplier);
  };

  useEffect(() => {
    fetchSuppliers();
    // eslint-disable-next-line
  }, [page, searchQ]);

  return (
    <div className="osup-page">
      <div className="osup-head">
        <h2>Nhà cung cấp</h2>
        <p>Quản lý danh sách nhà cung cấp thiết bị</p>
      </div>

      <div className="osup-container">
        {/* List */}
        <div className="osup-list">
          <div className="osup-search">
            <input
              type="text"
              placeholder="Tìm nhà cung cấp..."
              value={searchQ}
              onChange={(e) => {
                setSearchQ(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {loading && <div className="osup-loading">Đang tải...</div>}
          
          <div className="osup-table-wrap">
            <table className="osup-table">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Mã</th>
                  <th>Email</th>
                  <th>SĐT</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    onClick={() => fetchDetail(supplier.id)}
                    className={detail?.id === supplier.id ? "active" : ""}
                  >
                    <td>{supplier.name}</td>
                    <td>{supplier.code || "-"}</td>
                    <td>{supplier.email || "-"}</td>
                    <td>{supplier.phone || "-"}</td>
                    <td>
                      <span className={`osup-badge ${supplier.isActive ? "active" : "inactive"}`}>
                        {supplier.isActive ? "Hoạt động" : "Ngưng"}
                      </span>
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="osup-empty">
                      Không có nhà cung cấp
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="osup-pagination">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                ← Trước
              </button>
              <span>Trang {meta.page} / {meta.totalPages}</span>
              <button
                onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
                disabled={page === meta.totalPages}
              >
                Sau →
              </button>
            </div>
          )}
        </div>

        {/* Detail */}
        {detail && (
          <div className="osup-detail">
            <h3>Chi tiết nhà cung cấp</h3>
            <div className="osup-detail-field">
              <label>Tên</label>
              <div>{detail.name}</div>
            </div>
            <div className="osup-detail-field">
              <label>Mã</label>
              <div>{detail.code || "-"}</div>
            </div>
            <div className="osup-detail-field">
              <label>Email</label>
              <div>{detail.email || "-"}</div>
            </div>
            <div className="osup-detail-field">
              <label>SĐT</label>
              <div>{detail.phone || "-"}</div>
            </div>
            <div className="osup-detail-field">
              <label>Địa chỉ</label>
              <div>{detail.address || "-"}</div>
            </div>
            <div className="osup-detail-field">
              <label>Trạng thái</label>
              <div>
                <span className={`osup-badge ${detail.isActive ? "active" : "inactive"}`}>
                  {detail.isActive ? "Hoạt động" : "Ngưng"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
