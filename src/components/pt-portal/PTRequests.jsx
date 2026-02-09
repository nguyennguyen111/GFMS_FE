import React, { useEffect, useMemo, useState } from "react";
import {
  createLeaveRequest,
  createShiftChangeRequest,
  createTransferBranchRequest,
  createOvertimeRequest,
  getMyRequests,
  cancelRequest,
} from "../../services/ptRequestService";

import "./PTRequests.css";

const REQUEST_TYPES = [
  { value: "LEAVE", label: "Leave" },
  { value: "SHIFT_CHANGE", label: "Shift Change" },
  { value: "TRANSFER_BRANCH", label: "Transfer Branch" },
  { value: "OVERTIME", label: "Overtime" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "pending" },
  { value: "APPROVED", label: "approved" },
  { value: "REJECTED", label: "rejected" },
  { value: "CANCELLED", label: "cancelled" },
];

const emptyForms = {
  LEAVE: { fromDate: "", toDate: "", reason: "" },
  SHIFT_CHANGE: { currentShiftId: "", targetShiftId: "", reason: "" },
  TRANSFER_BRANCH: { toBranchId: "", expectedDate: "", reason: "" },
  OVERTIME: { date: "", fromTime: "", toTime: "", reason: "" },
};

const normalizeListResponse = (data) => {
  if (Array.isArray(data)) return { items: data, pagination: null };
  if (data && Array.isArray(data.items)) return { items: data.items, pagination: data.pagination || null };
  return { items: [], pagination: null };
};

const statusClass = (status) => String(status || "").toLowerCase(); // pending/approved/rejected/cancelled
const prettyStatus = (s) => String(s || "-").toLowerCase();

const formatDateTime = (v) => {
  try {
    if (!v) return "-";
    return new Date(v).toLocaleString();
  } catch {
    return "-";
  }
};

export default function PTRequests() {
  const [activeType, setActiveType] = useState("LEAVE");
  const [forms, setForms] = useState(emptyForms);

  const [filters, setFilters] = useState({
    status: "",
    requestType: "",
  });

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const currentForm = useMemo(() => forms[activeType], [forms, activeType]);

  const updateForm = (field, value) => {
    setForms((prev) => ({
      ...prev,
      [activeType]: { ...prev[activeType], [field]: value },
    }));
  };

  const resetForm = () => {
    setForms((prev) => ({ ...prev, [activeType]: emptyForms[activeType] }));
  };

  const validate = () => {
    const f = currentForm;

    if (activeType === "LEAVE") {
      if (!f.fromDate || !f.toDate) return "Please select from/to date";
      if (f.fromDate > f.toDate) return "From date must be <= To date";
      return null;
    }

    if (activeType === "SHIFT_CHANGE") {
      if (!f.currentShiftId || !f.targetShiftId) return "Shift IDs are required";
      if (String(f.currentShiftId) === String(f.targetShiftId)) return "Current shift must be different";
      return null;
    }

    if (activeType === "TRANSFER_BRANCH") {
      if (!f.toBranchId) return "To branch ID is required";
      if (!f.expectedDate) return "Expected date is required";
      return null;
    }

    if (activeType === "OVERTIME") {
      if (!f.date) return "Date is required";
      if (!f.fromTime || !f.toTime) return "From/To time are required";
      if (f.fromTime >= f.toTime) return "From time must be < To time";
      return null;
    }

    return "Invalid request type";
  };

  const buildPayload = () => {
    const f = currentForm;

    if (activeType === "LEAVE") {
      return { reason: f.reason, data: { fromDate: f.fromDate, toDate: f.toDate } };
    }
    if (activeType === "SHIFT_CHANGE") {
      return {
        reason: f.reason,
        data: { currentShiftId: Number(f.currentShiftId), targetShiftId: Number(f.targetShiftId) },
      };
    }
    if (activeType === "TRANSFER_BRANCH") {
      return {
        reason: f.reason,
        data: { toBranchId: Number(f.toBranchId), expectedDate: f.expectedDate },
      };
    }
    return {
      reason: f.reason,
      data: { date: f.date, fromTime: f.fromTime, toTime: f.toTime },
    };
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await getMyRequests({
        status: filters.status || undefined,
        requestType: filters.requestType || undefined,
      });

      const normalized = normalizeListResponse(data);
      setRequests(normalized.items);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.requestType]);

  const handleSubmit = async () => {
    const errMsg = validate();
    if (errMsg) return alert(errMsg);

    try {
      const payload = buildPayload();

      if (activeType === "LEAVE") await createLeaveRequest(payload);
      if (activeType === "SHIFT_CHANGE") await createShiftChangeRequest(payload);
      if (activeType === "TRANSFER_BRANCH") await createTransferBranchRequest(payload);
      if (activeType === "OVERTIME") await createOvertimeRequest(payload);

      alert("Request created");
      resetForm();
      await fetchRequests();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Create request failed");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this request?")) return;
    try {
      await cancelRequest(id);
      await fetchRequests();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Cancel failed");
    }
  };

  return (
    <div className="ptr-wrap">
      <div className="ptr-toprow">
        <h2 className="ptr-title">Requests</h2>

        <div className="ptr-field ptr-filter">
          <label>Status</label>
          <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value || "ALL"} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* CREATE */}
      <div className="ptr-card" style={{ marginBottom: 14 }}>
        <p className="ptr-subtitle">Create Request</p>
        <div className="ptr-divider" />

        <div className="ptr-grid2" style={{ marginBottom: 10 }}>
          <div className="ptr-field">
            <label>Type</label>
            <select value={activeType} onChange={(e) => setActiveType(e.target.value)}>
              {REQUEST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="ptr-field">
            <label>Filter by Type</label>
            <select
              value={filters.requestType}
              onChange={(e) => setFilters((p) => ({ ...p, requestType: e.target.value }))}
            >
              <option value="">All</option>
              {REQUEST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="ptr-form">
          {activeType === "LEAVE" && (
            <div className="ptr-grid2">
              <div className="ptr-field">
                <label>From date</label>
                <input type="date" value={currentForm.fromDate} onChange={(e) => updateForm("fromDate", e.target.value)} />
              </div>

              <div className="ptr-field">
                <label>To date</label>
                <input type="date" value={currentForm.toDate} onChange={(e) => updateForm("toDate", e.target.value)} />
              </div>

              <div className="ptr-field" style={{ gridColumn: "1 / -1" }}>
                <label>Reason</label>
                <textarea value={currentForm.reason} onChange={(e) => updateForm("reason", e.target.value)} placeholder="Optional" />
              </div>
            </div>
          )}

          {activeType === "SHIFT_CHANGE" && (
            <div className="ptr-grid2">
              <div className="ptr-field">
                <label>Current shift ID</label>
                <input
                  type="number"
                  value={currentForm.currentShiftId}
                  onChange={(e) => updateForm("currentShiftId", e.target.value)}
                  placeholder="e.g. 12"
                />
              </div>

              <div className="ptr-field">
                <label>Target shift ID</label>
                <input
                  type="number"
                  value={currentForm.targetShiftId}
                  onChange={(e) => updateForm("targetShiftId", e.target.value)}
                  placeholder="e.g. 20"
                />
              </div>

              <div className="ptr-field" style={{ gridColumn: "1 / -1" }}>
                <label>Reason</label>
                <textarea value={currentForm.reason} onChange={(e) => updateForm("reason", e.target.value)} placeholder="Optional" />
              </div>
            </div>
          )}

           {activeType === "TRANSFER_BRANCH" && (
            <div className="ptr-grid2">
              <div className="ptr-field">
                <label>To branch ID</label>
                <input
                  type="number"
                  value={currentForm.toBranchId}
                  onChange={(e) => updateForm("toBranchId", e.target.value)}
                  placeholder="e.g. 3"
                />
              </div>

              <div className="ptr-field">
                <label>Expected date</label>
                <input type="date" value={currentForm.expectedDate} onChange={(e) => updateForm("expectedDate", e.target.value)} />
              </div>

              <div className="ptr-field" style={{ gridColumn: "1 / -1" }}>
                <label>Reason</label>
                <textarea value={currentForm.reason} onChange={(e) => updateForm("reason", e.target.value)} placeholder="Optional" />
              </div>
            </div>
          )} 

          {activeType === "OVERTIME" && (
            <div className="ptr-grid2">
              <div className="ptr-field">
                <label>Date</label>
                <input type="date" value={currentForm.date} onChange={(e) => updateForm("date", e.target.value)} />
              </div>

              <div className="ptr-field">
                <label>From time</label>
                <input type="time" value={currentForm.fromTime} onChange={(e) => updateForm("fromTime", e.target.value)} />
              </div>

              <div className="ptr-field">
                <label>To time</label>
                <input type="time" value={currentForm.toTime} onChange={(e) => updateForm("toTime", e.target.value)} />
              </div>

              <div className="ptr-field" style={{ gridColumn: "1 / -1" }}>
                <label>Reason</label>
                <textarea value={currentForm.reason} onChange={(e) => updateForm("reason", e.target.value)} placeholder="Optional" />
              </div>
            </div>
          )}

          <div className="ptr-actions">
            <button className="ptr-btn" onClick={resetForm} type="button">
              Reset
            </button>
            <button className="ptr-btn primary" onClick={handleSubmit} type="button">
              Submit
            </button>
          </div>
        </div>
      </div>

      {/* LIST */}
      <div className="ptr-card">
        <p className="ptr-subtitle">My Requests</p>
        <div className="ptr-divider" />

        <div className="ptr-tablewrap">
          <table className="ptr-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="ptr-empty">
                    Loading...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="ptr-empty">
                    No requests found
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id}>
                    <td>{REQUEST_TYPES.find((x) => x.value === r.requestType)?.label || r.requestType}</td>
                    <td>
                      <span className={`ptr-badge ${statusClass(r.status)}`}>{prettyStatus(r.status)}</span>
                    </td>
                    <td title={r.reason || ""}>{r.reason || "-"}</td>
                    <td>{formatDateTime(r.createdAt)}</td>
                    <td>
                      {r.status === "PENDING" ? (
                        <button className="ptr-btn" onClick={() => handleCancel(r.id)} type="button">
                          Cancel
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
