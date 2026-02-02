import React, { useEffect, useState } from "react";
import "./AuditLogsPage.css";
import { admGetAuditLogs } from "../../../services/adminAdminCoreService";

export default function AuditLogsPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ q: "", action: "", tableName: "", from: "", to: "" });

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await admGetAuditLogs(filters);
      const data = res?.data?.data ?? res?.data ?? [];
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="al-page">
      <div className="al-head">
        <div>
          <div className="al-title">Audit Logs</div>
          <div className="al-sub">Theo dõi mọi thao tác Admin thay đổi nghiệp vụ (module 6.1)</div>
        </div>
        <div className="al-badge">{loading ? "Đang tải..." : `Logs: ${rows.length}`}</div>
      </div>

      <div className="al-filters">
        <div className="al-field al-field--grow">
          <label>q</label>
          <input value={filters.q} onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))} placeholder="tìm theo recordId / userId / keyword..." />
        </div>
        <div className="al-field">
          <label>action</label>
          <input value={filters.action} onChange={(e) => setFilters((s) => ({ ...s, action: e.target.value }))} placeholder="VD: MAINTENANCE_COMPLETED" />
        </div>
        <div className="al-field">
          <label>table</label>
          <input value={filters.tableName} onChange={(e) => setFilters((s) => ({ ...s, tableName: e.target.value }))} placeholder="maintenance / policy..." />
        </div>
        <div className="al-field">
          <label>from</label>
          <input type="date" value={filters.from} onChange={(e) => setFilters((s) => ({ ...s, from: e.target.value }))} />
        </div>
        <div className="al-field">
          <label>to</label>
          <input type="date" value={filters.to} onChange={(e) => setFilters((s) => ({ ...s, to: e.target.value }))} />
        </div>
        <button className="al-btn al-btn--primary" onClick={fetchList} disabled={loading}>Lọc</button>
      </div>

      <div className="al-card">
        <div className="al-table-wrap">
          <table className="al-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>createdAt</th>
                <th>userId</th>
                <th>action</th>
                <th>table</th>
                <th>recordId</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</td>
                  <td>{r.userId ?? r.user?.id ?? "-"}</td>
                  <td className="al-strong">{r.action || "-"}</td>
                  <td>{r.tableName || "-"}</td>
                  <td>{r.recordId ?? "-"}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="al-empty">Không có log</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
