import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  Filter,
  RefreshCw,
  Search,
  Ticket,
} from "lucide-react";
import { memberGetMyPackages } from "../../../services/memberPackageService";
import "./MemberMyPackagesPage.css";

const fmtMoney = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("vi-VN") + " ₫";
};

const fmtDate = (v) => {
  if (!v) return "—";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
};

const normalizeStatus = (x) => {
  const raw = String(x || "").toLowerCase();
  if (raw === "active") return "active";
  if (raw === "pending") return "pending";
  return "archived";
};

export default function MemberMyPackagesPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await memberGetMyPackages();
      setRows(res.data?.data || []);
    } catch (e) {
      setRows([]);
      setErr(e.response?.data?.message || "Không tải được danh sách gói.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);


  const mappedRows = useMemo(() => {
    return rows.map((x) => {
      const isPending = String(x.id).startsWith("pending-");
      const status = isPending ? "pending" : normalizeStatus(x.status);
      const sessionsRemaining = Number(x.sessionsRemaining ?? x.sessionsLeft ?? 0);
      const totalSessions = Number(x.totalSessions ?? x.Package?.sessions ?? 0);

      let progress = 0;
      if (totalSessions > 0 && !Number.isNaN(sessionsRemaining)) {
        progress = Math.max(
          0,
          Math.min(100, Math.round((sessionsRemaining / totalSessions) * 100))
        );
      }

      return {
        ...x,
        __status: status,
        __isPending: isPending,
        __sessionsRemaining: sessionsRemaining,
        __totalSessions: totalSessions,
        __progress: progress,
      };
    });
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    return mappedRows.filter((x) => {
      const packageName = String(x.Package?.name || "").toLowerCase();
      const gymName = String(x.Gym?.name || "").toLowerCase();
      const status = x.__status;

      const matchKeyword = !q || packageName.includes(q) || gymName.includes(q);
      const matchFilter = filter === "all" ? true : status === filter;

      return matchKeyword && matchFilter;
    });
  }, [mappedRows, keyword, filter]);

  const activeRows = useMemo(
    () => filteredRows.filter((x) => x.__status === "active" || x.__status === "pending"),
    [filteredRows]
  );

  const archiveRows = useMemo(
    () => filteredRows.filter((x) => x.__status === "archived"),
    [filteredRows]
  );

  const stats = useMemo(() => {
    const s = { total: rows.length, active: 0, expired: 0, pending: 0 };
    rows.forEach((x) => {
      const isPending = String(x.id).startsWith("pending-");
      if (isPending) s.pending++;
      else if (x.status === "active") s.active++;
      else s.expired++;
    });
    return s;
  }, [rows]);

  const renderCard = (x, compact = false) => {
    const status = x.__status;
    const isPending = x.__isPending;
    const sessionsRemaining = x.__sessionsRemaining;
    const totalSessions = x.__totalSessions;

    return (
      <div
        key={x.id}
        className={`mp3-card ${status} ${compact ? "is-compact" : ""}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) =>
          e.key === "Enter" && !isPending && navigate(`/member/my-packages/${x.id}`)
        }
        onClick={() => {
          if (isPending) return;
          navigate(`/member/my-packages/${x.id}`);
        }}
      >
        <div className="mp3-cardTop">
          <div>
            <div className="mp3-cardTag">
              {status === "active"
                ? "Subscription"
                : status === "pending"
                ? "Payment Pending"
                : "Package History"}
            </div>

            <div className="mp3-name">{x.Package?.name || "—"}</div>
            <div className="mp3-desc">{x.Gym?.name || "—"}</div>
          </div>

          <span className={`mp3-badge ${status}`}>
            {status === "active"
              ? "ACTIVE"
              : status === "pending"
              ? "PENDING"
              : "ARCHIVED"}
          </span>
        </div>

        <div className="mp3-creditRow">
          <span className="mp3-creditLabel">Session credit</span>
          <span className="mp3-creditValue">
            {sessionsRemaining}/{totalSessions || "—"}
          </span>
        </div>

        <div className="mp3-progress">
          <div
            className={`mp3-progressBar ${status}`}
            style={{ width: `${x.__progress}%` }}
          />
        </div>

        <div className="mp3-metaGrid">
          <div className="mp3-metaItem">
            <span className="mp3-metaIcon">
              <CalendarDays size={14} />
            </span>
            <div>
              <div className="mp3-metaLabel">Expiry date</div>
              <div className="mp3-metaValue">{fmtDate(x.expiryDate)}</div>
            </div>
          </div>

          <div className="mp3-metaItem">
            <span className="mp3-metaIcon">
              <CreditCard size={14} />
            </span>
            <div>
              <div className="mp3-metaLabel">Price</div>
              <div className="mp3-metaValue">{fmtMoney(x.Package?.price)}</div>
            </div>
          </div>
        </div>

        <div className="mp3-foot">
          {isPending ? (
            <div className="mp3-pendingNote">Đang chờ hoàn tất thanh toán</div>
          ) : (
            <button
              type="button"
              className="mp3-detailBtn"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/member/my-packages/${x.id}`);
              }}
            >
              <span>View details</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mp3-page">
      <div className="mp3-header">
        <div className="mp3-headerLeft">
          <div className="mp3-kicker">Membership assets</div>
          <h1 className="mp3-title">My Packages</h1>
        </div>

        <div className="mp3-headerRight">
          <div className="mp3-searchWrap">
            <Search size={15} />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Filter by package name..."
              className="mp3-search"
            />
          </div>

          <div className="mp3-filterWrap">
            <Filter size={14} />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="mp3-filter"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mp3-toolbar">
        <div className="mp3-stats">
          <span className="mp3-pill">Tổng: <b>{stats.total}</b></span>
          <span className="mp3-pill is-active">Active: <b>{stats.active}</b></span>
          <span className="mp3-pill is-pending">Pending: <b>{stats.pending}</b></span>
          <span className="mp3-pill">Khác: <b>{stats.expired}</b></span>
        </div>

        <div className="mp3-actions">
          <button className="mp3-btn ghost" onClick={load} disabled={loading}>
            <RefreshCw size={14} />
            <span>Tải lại</span>
          </button>

          <button className="mp3-btn primary" onClick={() => navigate("/marketplace/gyms")}>
            <span>Mua gói mới</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {err && <div className="mp3-alert">{err}</div>}

      {loading ? (
        <div className="mp3-empty">
          <div className="mp3-emptyTitle">Đang tải danh sách gói...</div>
        </div>
      ) : rows.length === 0 ? (
        <div className="mp3-empty">
          <div className="mp3-emptyIcon">
            <Ticket size={24} />
          </div>
          <div className="mp3-emptyTitle">Bạn chưa mua gói nào</div>
          <div className="mp3-emptySub">
            Hãy vào Marketplace để chọn gói tập phù hợp với mục tiêu của bạn.
          </div>
          <button className="mp3-btn primary" onClick={() => navigate("/marketplace/packages")}>
            Xem gói tập
          </button>
        </div>
      ) : (
        <>
          <section className="mp3-section">
            <div className="mp3-sectionHead">
              <div className="mp3-sectionTitleWrap">
                <h2 className="mp3-sectionTitle">Active Packages</h2>
                <div className="mp3-sectionLine" />
              </div>
              <div className="mp3-sectionCount">{activeRows.length} current</div>
            </div>

            {activeRows.length === 0 ? (
              <div className="mp3-empty small">Không có gói active/pending phù hợp với bộ lọc hiện tại.</div>
            ) : (
              <div className="mp3-grid">
                {activeRows.map((x) => renderCard(x))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}