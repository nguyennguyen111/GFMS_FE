import React, { useEffect, useState } from "react";
import "./InventoryPage.css";
import axios from "../../../setup/axios";

import {
  getStocks,
  getEquipments,
} from "../../../services/equipmentSupplierInventoryService";


export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const API_HOST = String(axios?.defaults?.baseURL || process.env.REACT_APP_API_BASE || "http://localhost:8080").replace(/\/+$/, "");
  const absUrl = (u) => (u ? (u.startsWith("http") ? u : `${API_HOST}${u}`) : "");

  const fetchAll = async () => {
    setLoading(true);
    setErr("");
    try {
      const [stockRes, eqRes] = await Promise.all([
        getStocks({ q: search || undefined }),
        getEquipments({ page: 1, limit: 500, q: search || undefined, status: "all" }),
      ]);
      const data = stockRes?.data?.data ?? stockRes?.data ?? [];
      const rows = Array.isArray(data) ? data : data.items ?? [];
      const eqData = eqRes?.data?.data ?? eqRes?.data ?? [];
      const eqRows = Array.isArray(eqData) ? eqData : eqData.items ?? [];
      const equipmentById = new Map(eqRows.map((e) => [Number(e.id), e]));
      const grouped = Object.values(
        rows.reduce((acc, row) => {
          const equipmentId = Number(row.equipmentId || row.equipment?.id || 0);
          const key = equipmentId || `code:${row.equipmentCode || row.equipment?.code || row.id}`;
          if (!acc[key]) {
            acc[key] = {
              key,
              equipmentId,
              equipmentName: row.equipment?.name || row.equipmentName || "-",
              equipmentCode: row.equipment?.code || row.equipmentCode || "-",
              primaryImageUrl: null,
              description: "",
              equipmentStatus: "active",
              quantity: 0,
            };
          }
          acc[key].quantity += Number(row.quantity || 0);
          return acc;
        }, {})
      );
      const merged = grouped.map((row) => {
        const eq = equipmentById.get(Number(row.equipmentId));
        return {
          ...row,
          primaryImageUrl: eq?.primaryImageUrl || null,
          description: eq?.description || "",
          equipmentStatus: eq?.status || "active",
        };
      });
      setItems(merged);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Tải dữ liệu thất bại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="inv-page">
      <div className="inv-header">
        <h2>Kho thiết bị</h2>
      </div>

      <div className="inv-filters">
        <input
          className="input"
          placeholder="Tìm theo tên/mã thiết bị..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchAll()}
        />
        <button className="btn" onClick={fetchAll}>
          Tìm
        </button>
      </div>

      {err ? <div className="alert">{err}</div> : null}
      {loading ? <div className="muted">Đang tải...</div> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Ảnh</th>
              <th>Thiết bị</th>
              <th>Số lượng</th>
              <th>Mô tả</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td className="empty" colSpan={5}>Không có dữ liệu</td></tr>
            ) : (
              items.map((r) => (
                <tr key={r.key}>
                  <td>
                    {r.primaryImageUrl ? (
                      <img className="inv-thumb" src={absUrl(r.primaryImageUrl)} alt={r.equipmentName || "equipment"} />
                    ) : (
                      <div className="inv-thumb inv-thumb--placeholder">No image</div>
                    )}
                  </td>
                  <td>{r.equipmentName || "-"}</td>
                  <td>{r.quantity ?? 0}</td>
                  <td className="inv-desc">{r.description || "-"}</td>
                  <td>
                    <span className={`inv-badge ${String(r.equipmentStatus) === "active" ? "active" : "inactive"}`}>
                      {String(r.equipmentStatus) === "active" ? "Đang hoạt động" : "Ngừng sử dụng"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
