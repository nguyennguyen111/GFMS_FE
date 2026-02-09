import React, { useEffect, useMemo, useState } from "react";
import "./PTShareRequests.css";
import { createPTShareRequest, getMyPTShareRequests } from "../../services/ptShareService";

const PTShareRequests = () => {
  const [form, setForm] = useState({
    fromGymId: "",
    toGymId: "",
    startDate: "",
    endDate: "",
    shareType: "TEMPORARY",
    commissionSplit: "",
    notes: "",
  });

  const [statusFilter, setStatusFilter] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMyPTShareRequests(statusFilter ? { status: statusFilter } : {});
      setRows(res?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [statusFilter]);

  const onChange = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    setApiError("");
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const parseIntSafe = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
    return n;
  };

  const parseFloatSafe = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return n;
  };

  const validate = () => {
    const e = {};

    const fromGymId = parseIntSafe(form.fromGymId);
    const toGymId = parseIntSafe(form.toGymId);

    if (fromGymId === null || fromGymId <= 0) e.fromGymId = "From Gym ID must be a positive integer.";
    if (toGymId === null || toGymId <= 0) e.toGymId = "To Gym ID must be a positive integer.";
    if (fromGymId !== null && toGymId !== null && fromGymId === toGymId) {
      e.toGymId = "To Gym must be different from From Gym.";
    }

    if (!form.startDate) e.startDate = "Start date is required.";
    if (!form.endDate) e.endDate = "End date is required.";

    if (form.startDate && form.endDate) {
      const s = new Date(form.startDate);
      const d = new Date(form.endDate);
      if (Number.isNaN(s.getTime())) e.startDate = "Invalid start date.";
      if (Number.isNaN(d.getTime())) e.endDate = "Invalid end date.";
      if (!e.startDate && !e.endDate && s > d) e.endDate = "End date must be on/after start date.";
    }

    const allowedTypes = new Set(["TEMPORARY", "PERMANENT"]);
    if (!form.shareType || !allowedTypes.has(String(form.shareType).toUpperCase())) {
      e.shareType = "Share type must be TEMPORARY or PERMANENT.";
    }

    if (form.commissionSplit !== "") {
      const cs = parseFloatSafe(form.commissionSplit);
      if (cs === null) e.commissionSplit = "Commission split must be a number.";
      else if (cs < 0 || cs > 1) e.commissionSplit = "Commission split must be between 0 and 1.";
    }

    if (form.notes && form.notes.length > 500) e.notes = "Notes cannot exceed 500 characters.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const canSubmit = useMemo(() => {
    return (
      String(form.fromGymId).trim() !== "" &&
      String(form.toGymId).trim() !== "" &&
      form.startDate &&
      form.endDate &&
      form.shareType &&
      !submitting
    );
  }, [form, submitting]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    if (!validate()) return;

    const payload = {
      fromGymId: Number(form.fromGymId),
      toGymId: Number(form.toGymId),
      startDate: form.startDate,
      endDate: form.endDate,
      shareType: String(form.shareType).toUpperCase(),
      notes: form.notes?.trim() ? form.notes.trim() : null,
    };

    if (form.commissionSplit !== "") payload.commissionSplit = Number(form.commissionSplit);

    setSubmitting(true);
    try {
      await createPTShareRequest(payload);

      setForm({
        fromGymId: "",
        toGymId: "",
        startDate: "",
        endDate: "",
        shareType: "TEMPORARY",
        commissionSplit: "",
        notes: "",
      });

      await load();
      alert("Created share request!");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Create share request failed";
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const statusClass = (s) => {
    const v = String(s || "").toLowerCase();
    if (v === "approved") return "approved";
    if (v === "rejected") return "rejected";
    return "pending";
  };

  return (
    <div className="ptr-wrap">
      <h2 className="ptr-title">Trainer Sharing</h2>

      <div className="ptr-card">
        <div className="ptr-toprow">
          <h3 className="ptr-subtitle">Create Share Request</h3>
        </div>

        <div className="ptr-divider" />

        {apiError ? (
          <div className="ptr-alert">
            <strong>Error:</strong> {apiError}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="ptr-form">
          <div className="ptr-grid2">
            <div className="ptr-field">
              <label>From Gym ID</label>
              <input value={form.fromGymId} onChange={onChange("fromGymId")} placeholder="e.g. 1" required />
              {errors.fromGymId ? <div className="ptr-err">{errors.fromGymId}</div> : null}
            </div>

            <div className="ptr-field">
              <label>To Gym ID</label>
              <input value={form.toGymId} onChange={onChange("toGymId")} placeholder="e.g. 3" required />
              {errors.toGymId ? <div className="ptr-err">{errors.toGymId}</div> : null}
            </div>

            <div className="ptr-field">
              <label>Start Date</label>
              <input type="date" value={form.startDate} onChange={onChange("startDate")} required />
              {errors.startDate ? <div className="ptr-err">{errors.startDate}</div> : null}
            </div>

            <div className="ptr-field">
              <label>End Date</label>
              <input type="date" value={form.endDate} onChange={onChange("endDate")} required />
              {errors.endDate ? <div className="ptr-err">{errors.endDate}</div> : null}
            </div>

            <div className="ptr-field">
              <label>Share Type</label>
              <select value={form.shareType} onChange={onChange("shareType")} required>
                <option value="TEMPORARY">TEMPORARY</option>
                <option value="PERMANENT">PERMANENT</option>
              </select>
              {errors.shareType ? <div className="ptr-err">{errors.shareType}</div> : null}
            </div>

            <div className="ptr-field">
              <label>Commission Split (optional)</label>
              <input value={form.commissionSplit} onChange={onChange("commissionSplit")} placeholder="e.g. 0.2" />
              {errors.commissionSplit ? <div className="ptr-err">{errors.commissionSplit}</div> : null}
            </div>
          </div>

          <div className="ptr-field">
            <label>Notes</label>
            <textarea value={form.notes} onChange={onChange("notes")} placeholder="Reason/notes..." />
            {errors.notes ? <div className="ptr-err">{errors.notes}</div> : null}
          </div>

          <div className="ptr-actions">
            <button className="ptr-btn primary" type="submit" disabled={!canSubmit}>
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>

      <div className="ptr-card" style={{ marginTop: 16 }}>
        <div className="ptr-toprow">
          <h3 className="ptr-subtitle">Share History</h3>

          <div className="ptr-field ptr-filter">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
          </div>
        </div>

        <div className="ptr-divider" />

        {loading ? (
          <div className="ptr-empty">Loading...</div>
        ) : (
          <div className="ptr-tablewrap">
            <table className="ptr-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>From Gym</th>
                  <th>To Gym</th>
                  <th>Period</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.fromGym?.name || r.fromGymId}</td>
                    <td>{r.toGym?.name || r.toGymId}</td>
                    <td>
                      {String(r.startDate).slice(0, 10)} → {String(r.endDate).slice(0, 10)}
                    </td>
                    <td>
                      <span className={`ptr-badge ${statusClass(r.status)}`}>
                        {String(r.status).toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: 16 }}>
                      <div className="ptr-empty" style={{ padding: 0 }}>No data</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PTShareRequests;
