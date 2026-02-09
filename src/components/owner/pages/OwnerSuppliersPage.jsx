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
  const [showDetailModal, setShowDetailModal] = useState(false);

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
        <div>
          <h2>Nhà cung cấp</h2>
          <p>Quản lý danh sách nhà cung cấp thiết bị</p>
        </div>
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
                    onClick={() => {
                      fetchDetail(supplier.id);
                      setShowDetailModal(true);
                    }}
                    style={{ cursor: 'pointer' }}
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
            <div className="pagination">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="pagination-btn"
              >
                Trước
              </button>
              <span className="pagination-info">
                Trang {meta.page} / {meta.totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
                disabled={page === meta.totalPages}
                className="pagination-btn"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && detail && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Chi tiết nhà cung cấp</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Tên:</span>
                  <span className="detail-value">{detail.name}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Mã:</span>
                  <span className="detail-value">{detail.code || "—"}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{detail.email || "—"}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">SĐT:</span>
                  <span className="detail-value">{detail.phone || "—"}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Trạng thái:</span>
                  <span className="detail-value">
                    <span className={`osup-badge ${detail.isActive ? "active" : "inactive"}`}>
                      {detail.isActive ? "Hoạt động" : "Ngưng"}
                    </span>
                  </span>
                </div>

                {detail.address && (
                  <div className="detail-row detail-row--full">
                    <span className="detail-label">Địa chỉ:</span>
                    <span className="detail-value">{detail.address}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowDetailModal(false)} className="btn-cancel">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
