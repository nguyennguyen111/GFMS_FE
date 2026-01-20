import React, { useEffect, useMemo, useState } from "react";
import "./ReportsPage.css";
import {
  admGetReportSummary,
  admGetReportRevenue,
  admGetReportInventory,
  admGetReportTrainerShare,
} from "../../../services/adminAdminCoreService";

const fmtMoney = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString("vi-VN");
};

const todayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const addDaysISO = (iso, diff) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + diff);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("summary"); // summary | revenue | inventory | trainerShare

  const [filters, setFilters] = useState(() => {
    const to = todayISO();
    const from = addDaysISO(to, -30);
    return { from, to, gymId: "" };
  });

  // data containers
  const [summary, setSummary] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [trainerShare, setTrainerShare] = useState(null);

  const params = useMemo(() => {
    const p = {
      from: filters.from || undefined,
      to: filters.to || undefined,
      gymId: filters.gymId ? String(filters.gymId).trim() : undefined,
    };
    // clean undefined
    Object.keys(p).forEach((k) => p[k] === undefined && delete p[k]);
    return p;
  }, [filters]);

  const fetchByTab = async (t = tab) => {
    setLoading(true);
    try {
      if (t === "summary") {
        const res = await admGetReportSummary(params);
        setSummary(res.data);
      }
      if (t === "revenue") {
        const res = await admGetReportRevenue(params);
        setRevenue(res.data);
      }
      if (t === "inventory") {
        const res = await admGetReportInventory(params);
        setInventory(res.data);
      }
      if (t === "trainerShare") {
        const res = await admGetReportTrainerShare(params);
        setTrainerShare(res.data);
      }
    } catch (e) {
      // lỗi thường gặp: 401/403/404/CORS/ECONNREFUSED
      const msg = e?.response?.data?.message || e.message;
      alert(`Reports error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // load initial
  useEffect(() => {
    fetchByTab("summary");
    // eslint-disable-next-line
  }, []);

  // when tab changes, load that tab (if not loaded)
  useEffect(() => {
    if (tab === "summary" && !summary) fetchByTab("summary");
    if (tab === "revenue" && !revenue) fetchByTab("revenue");
    if (tab === "inventory" && !inventory) fetchByTab("inventory");
    if (tab === "trainerShare" && !trainerShare) fetchByTab("trainerShare");
    // eslint-disable-next-line
  }, [tab]);

  const onApply = async () => {
    // reset data for active tab only (nhẹ)
    if (tab === "summary") setSummary(null);
    if (tab === "revenue") setRevenue(null);
    if (tab === "inventory") setInventory(null);
    if (tab === "trainerShare") setTrainerShare(null);
    await fetchByTab(tab);
  };

  return (
    <div className="rp-page">
      <div className="rp-head">
        <div>
          <div className="rp-title">Reports</div>
          <div className="rp-sub">
            Tổng quan / Doanh thu / Kho / Chia sẻ PT (module 6.2 – main flow)
          </div>
        </div>
        <div className="rp-badge">{loading ? "Đang tải..." : "Module 6.2"}</div>
      </div>

      <div className="rp-filters">
        <div className="rp-field">
          <label>From</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((s) => ({ ...s, from: e.target.value }))}
          />
        </div>

        <div className="rp-field">
          <label>To</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((s) => ({ ...s, to: e.target.value }))}
          />
        </div>

        <div className="rp-field">
          <label>GymId (optional)</label>
          <input
            value={filters.gymId}
            onChange={(e) => setFilters((s) => ({ ...s, gymId: e.target.value }))}
            placeholder="VD: 1"
          />
        </div>

        <button className="rp-btn rp-btn--primary" onClick={onApply}>
          Apply
        </button>
      </div>

      <div className="rp-tabs">
        <button
          className={`rp-tab ${tab === "summary" ? "is-active" : ""}`}
          onClick={() => setTab("summary")}
        >
          Summary
        </button>
        <button
          className={`rp-tab ${tab === "revenue" ? "is-active" : ""}`}
          onClick={() => setTab("revenue")}
        >
          Revenue
        </button>
        <button
          className={`rp-tab ${tab === "inventory" ? "is-active" : ""}`}
          onClick={() => setTab("inventory")}
        >
          Inventory
        </button>
        <button
          className={`rp-tab ${tab === "trainerShare" ? "is-active" : ""}`}
          onClick={() => setTab("trainerShare")}
        >
          Trainer Share
        </button>
      </div>

      {/* ===================== SUMMARY ===================== */}
      {tab === "summary" && (
        <div className="rp-card">
          <div className="rp-card__head">
            <div className="rp-card__title">Summary</div>
            <div className="rp-card__meta">
              {summary?.from ? (
                <>
                  Range: <b>{summary.from}</b> → <b>{summary.to}</b>
                </>
              ) : (
                "Chưa có dữ liệu"
              )}
            </div>
          </div>

          {!summary ? (
            <div className="rp-empty">Nhấn Apply để tải summary.</div>
          ) : (
            <div className="rp-cards">
              <div className="rp-kpi">
                <div className="rp-kpi__k">Revenue Sum</div>
                <div className="rp-kpi__v">{fmtMoney(summary?.cards?.revenueSum)}</div>
              </div>
              <div className="rp-kpi">
                <div className="rp-kpi__k">Bookings</div>
                <div className="rp-kpi__v">{summary?.cards?.bookingCount ?? 0}</div>
              </div>
              <div className="rp-kpi">
                <div className="rp-kpi__k">Maintenance Pending</div>
                <div className="rp-kpi__v">{summary?.cards?.maintenancePending ?? 0}</div>
              </div>
              <div className="rp-kpi">
                <div className="rp-kpi__k">Maintenance InProgress</div>
                <div className="rp-kpi__v">{summary?.cards?.maintenanceInProgress ?? 0}</div>
              </div>
              <div className="rp-kpi">
                <div className="rp-kpi__k">Franchise Pending</div>
                <div className="rp-kpi__v">{summary?.cards?.franchisePending ?? 0}</div>
              </div>
              <div className="rp-kpi">
                <div className="rp-kpi__k">Inbound Receipts</div>
                <div className="rp-kpi__v">{summary?.cards?.inboundReceiptCount ?? 0}</div>
              </div>
              <div className="rp-kpi">
                <div className="rp-kpi__k">PO Pending</div>
                <div className="rp-kpi__v">{summary?.cards?.poPendingCount ?? 0}</div>
              </div>
              <div className="rp-kpi">
                <div className="rp-kpi__k">TrainerShare Pending</div>
                <div className="rp-kpi__v">{summary?.cards?.trainerSharePendingCount ?? 0}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== REVENUE ===================== */}
      {tab === "revenue" && (
        <div className="rp-card">
          <div className="rp-card__head">
            <div className="rp-card__title">Revenue</div>
            <div className="rp-card__meta">
              Total: <b>{fmtMoney(revenue?.total)}</b>
            </div>
          </div>

          {!revenue ? (
            <div className="rp-empty">Nhấn Apply để tải revenue.</div>
          ) : (
            <>
              <div className="rp-split">
                <div className="rp-mini">
                  <div className="rp-mini__title">By Type</div>
                  <div className="rp-mini__list">
                    {Object.keys(revenue.byType || {}).length === 0 && (
                      <div className="rp-empty2">Không có dữ liệu</div>
                    )}
                    {Object.entries(revenue.byType || {}).map(([k, v]) => (
                      <div className="rp-mini__row" key={k}>
                        <div className="rp-mini__k">{k}</div>
                        <div className="rp-mini__v">{fmtMoney(v)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rp-table-card">
                  <div className="rp-mini__title">Transactions</div>
                  <div className="rp-table-wrap">
                    <table className="rp-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Amount</th>
                          <th>GymId</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(revenue.data || []).map((r) => (
                          <tr key={r.id}>
                            <td>#{r.id}</td>
                            <td>{r.transactionDate ? new Date(r.transactionDate).toLocaleString() : "-"}</td>
                            <td>{r.transactionType || "-"}</td>
                            <td>{fmtMoney(r.amount)}</td>
                            <td>{r.gymId ?? "-"}</td>
                          </tr>
                        ))}
                        {(revenue.data || []).length === 0 && (
                          <tr>
                            <td colSpan={5} className="rp-empty2">
                              Không có transaction trong khoảng thời gian này
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===================== INVENTORY ===================== */}
      {tab === "inventory" && (
        <div className="rp-card">
          <div className="rp-card__head">
            <div className="rp-card__title">Inventory</div>
            <div className="rp-card__meta">
              Snapshot:{" "}
              <b>
                Stock {inventory?.snapshot?.stockItems ?? 0} • Receipts{" "}
                {inventory?.snapshot?.inboundReceipts ?? 0} • PO{" "}
                {inventory?.snapshot?.purchaseOrders ?? 0}
              </b>
            </div>
          </div>

          {!inventory ? (
            <div className="rp-empty">Nhấn Apply để tải inventory report.</div>
          ) : (
            <>
              <div className="rp-cards">
                <div className="rp-kpi">
                  <div className="rp-kpi__k">Inbound Value</div>
                  <div className="rp-kpi__v">{fmtMoney(inventory?.snapshot?.inboundValue)}</div>
                </div>
                <div className="rp-kpi">
                  <div className="rp-kpi__k">PO Total</div>
                  <div className="rp-kpi__v">{fmtMoney(inventory?.snapshot?.poTotal)}</div>
                </div>
              </div>

              <div className="rp-split">
                <div className="rp-table-card">
                  <div className="rp-mini__title">Equipment Stocks</div>
                  <div className="rp-table-wrap">
                    <table className="rp-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>EquipmentId</th>
                          <th>GymId</th>
                          <th>Quantity</th>
                          <th>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(inventory.stocks || []).map((s) => (
                          <tr key={s.id}>
                            <td>#{s.id}</td>
                            <td>{s.equipmentId ?? "-"}</td>
                            <td>{s.gymId ?? "-"}</td>
                            <td>{s.quantity ?? s.availableQuantity ?? "-"}</td>
                            <td>{s.updatedAt ? new Date(s.updatedAt).toLocaleString() : "-"}</td>
                          </tr>
                        ))}
                        {(inventory.stocks || []).length === 0 && (
                          <tr>
                            <td colSpan={5} className="rp-empty2">Không có stock</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rp-table-card">
                  <div className="rp-mini__title">Inventory Logs</div>
                  <div className="rp-table-wrap">
                    <table className="rp-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Type</th>
                          <th>EquipmentId</th>
                          <th>GymId</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(inventory.inventoryLogs || []).map((l) => (
                          <tr key={l.id}>
                            <td>#{l.id}</td>
                            <td>{l.type || l.action || "-"}</td>
                            <td>{l.equipmentId ?? "-"}</td>
                            <td>{l.gymId ?? "-"}</td>
                            <td>{l.createdAt ? new Date(l.createdAt).toLocaleString() : "-"}</td>
                          </tr>
                        ))}
                        {(inventory.inventoryLogs || []).length === 0 && (
                          <tr>
                            <td colSpan={5} className="rp-empty2">Không có log</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===================== TRAINER SHARE ===================== */}
      {tab === "trainerShare" && (
        <div className="rp-card">
          <div className="rp-card__head">
            <div className="rp-card__title">Trainer Share</div>
            <div className="rp-card__meta">
              Approved: <b>{trainerShare?.summary?.approved ?? 0}</b> • Pending:{" "}
              <b>{trainerShare?.summary?.pending ?? 0}</b>
            </div>
          </div>

          {!trainerShare ? (
            <div className="rp-empty">Nhấn Apply để tải trainer share report.</div>
          ) : (
            <>
              <div className="rp-cards">
                <div className="rp-kpi">
                  <div className="rp-kpi__k">Total</div>
                  <div className="rp-kpi__v">{trainerShare?.summary?.total ?? 0}</div>
                </div>
                <div className="rp-kpi">
                  <div className="rp-kpi__k">Avg Split (Approved)</div>
                  <div className="rp-kpi__v">
                    {Number(trainerShare?.summary?.avgCommissionSplitApproved ?? 0).toFixed(2)}
                  </div>
                </div>
                <div className="rp-kpi">
                  <div className="rp-kpi__k">Rejected</div>
                  <div className="rp-kpi__v">{trainerShare?.summary?.rejected ?? 0}</div>
                </div>
              </div>

              <div className="rp-table-card">
                <div className="rp-mini__title">Trainer Shares</div>
                <div className="rp-table-wrap">
                  <table className="rp-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Status</th>
                        <th>TrainerId</th>
                        <th>FromGym</th>
                        <th>ToGym</th>
                        <th>Split</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(trainerShare.data || []).map((r) => (
                        <tr key={r.id}>
                          <td>#{r.id}</td>
                          <td>{r.status}</td>
                          <td>{r.trainerId ?? "-"}</td>
                          <td>{r.fromGymId ?? "-"}</td>
                          <td>{r.toGymId ?? "-"}</td>
                          <td>{r.commissionSplit ?? "-"}</td>
                        </tr>
                      ))}
                      {(trainerShare.data || []).length === 0 && (
                        <tr>
                          <td colSpan={6} className="rp-empty2">Không có trainer share</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
