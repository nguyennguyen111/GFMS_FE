import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, Clock3, Dumbbell, Package2, Target } from "lucide-react";
import "../member-pages.css";
import { memberGetMetrics, memberGetLatestMetric } from "../../../services/memberMetricService";
import { memberGetMyBookings } from "../../../services/memberBookingService";
import { memberGetMyPackages } from "../../../services/memberPackageService";
import BMICard from "./BMICard";
import BMIProgressChart from "./BMIProgressChart";

const fmtDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("vi-VN");
};

const toDateKey = (value) => String(value || "").slice(0, 10);
const packId = (x) => Number(x?.id || x?.activationId || x?.packageActivationId || 0);

export default function MemberProgressPage() {
  const [metrics, setMetrics] = useState([]);
  const [latestMetric, setLatestMetric] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [metricRows, latest, bookingRes, packageRes] = await Promise.all([
        memberGetMetrics(),
        memberGetLatestMetric(),
        memberGetMyBookings(),
        memberGetMyPackages(),
      ]);
      const nextMetrics = Array.isArray(metricRows) ? metricRows : [];
      const nextBookings = bookingRes?.data?.data || [];
      const nextPackages = packageRes?.data?.data || [];
      setMetrics(nextMetrics);
      setLatestMetric(latest || null);
      setBookings(nextBookings);
      setPackages(nextPackages);
      setSelectedPackageId((prev) => {
        if (prev && nextPackages.some((x) => packId(x) === Number(prev))) return prev;
        const firstActive = nextPackages.find((x) => String(x.status || "").toLowerCase() === "active") || nextPackages[0] || null;
        return firstActive ? packId(firstActive) : null;
      });
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Không tải được dữ liệu tiến độ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const selectedPackage = useMemo(() => {
    const found = packages.find((x) => packId(x) === Number(selectedPackageId));
    return found || null;
  }, [packages, selectedPackageId]);

  const packageBookings = useMemo(() => {
    const pid = Number(selectedPackage?.id || selectedPackage?.activationId || 0);
    if (!pid) return [];
    return bookings.filter((x) => Number(x.packageActivationId || x.activationId || x.PackageActivation?.id || 0) === pid);
  }, [bookings, selectedPackage]);

  const stats = useMemo(() => {
    const completed = packageBookings.filter((x) => ["completed", "attended"].includes(String(x.status || "").toLowerCase())).length;
    const upcoming = packageBookings.filter((x) => {
      const status = String(x.status || "").toLowerCase();
      return ["confirmed", "pending"].includes(status) && new Date(`${toDateKey(x.bookingDate)}T${String(x.startTime || "00:00:00").slice(0,8)}`) >= new Date();
    }).length;
    const bmi = Number(latestMetric?.bmi || latestMetric?.BMI || 0);
    const totalSessions = Number(selectedPackage?.totalSessions || 0);
    const sessionsRemaining = Number(selectedPackage?.sessionsRemaining ?? 0);
    const sessionsUsed = Number(selectedPackage?.sessionsUsed ?? Math.max(0, totalSessions - sessionsRemaining));
    return { completed, upcoming, bmi, totalSessions, sessionsRemaining, sessionsUsed };
  }, [packageBookings, latestMetric, selectedPackage]);

  const upcomingItems = useMemo(() => [...packageBookings]
    .filter((x) => ["confirmed", "pending"].includes(String(x.status || "").toLowerCase()))
    .sort((a, b) => new Date(`${toDateKey(a.bookingDate)}T${String(a.startTime || "").slice(0,8)}`) - new Date(`${toDateKey(b.bookingDate)}T${String(b.startTime || "").slice(0,8)}`))
    .slice(0, 5), [packageBookings]);

  const recentPackageBookings = useMemo(() => [...packageBookings]
    .sort((a, b) => new Date(`${toDateKey(b.bookingDate)}T${String(b.startTime || "").slice(0,8)}`) - new Date(`${toDateKey(a.bookingDate)}T${String(a.startTime || "").slice(0,8)}`))
    .slice(0, 6), [packageBookings]);

  const recentMetrics = useMemo(() => [...metrics].slice(0, 8), [metrics]);
  const progressPercent = useMemo(() => {
    if (!stats.totalSessions) return 0;
    return Math.max(0, Math.min(100, (stats.sessionsUsed / Math.max(1, stats.totalSessions)) * 100));
  }, [stats]);

  if (loading) return <div className="m-empty">Đang tải dữ liệu tiến độ...</div>;

  return (
    <div className="mprog-page">
      <div className="mh-head mprog-head">
        <div>
          <span className="mprog-kicker">Performance center</span>
          <h2 className="mh-title mprog-title">Tiến độ hội viên</h2>
          <div className="mh-sub">Gói tập được tách theo từng activation. BMI và chỉ số cơ thể là dữ liệu chung của hội viên.</div>
        </div>
      </div>

      {error ? <div className="m-error">{error}</div> : null}

      <section className="m-card padded" style={{ marginBottom: 20 }}>
        <div className="mprog-section-head"><Package2 size={18} /><h3>Chọn gói để xem tiến độ</h3></div>
        {!packages.length ? <div className="m-empty">Bạn chưa có gói tập nào.</div> : (
          <div className="mprog-package-tabs">
            {packages.map((pkg) => {
              const active = packId(pkg) === Number(selectedPackageId);
              return (
                <button
                  key={packId(pkg)}
                  type="button"
                  className={`mprog-package-tab ${active ? "active" : ""}`}
                  onClick={() => setSelectedPackageId(packId(pkg))}
                >
                  <strong>{pkg?.Package?.name || pkg?.packageName || `Gói #${packId(pkg)}`}</strong>
                  <span>{pkg?.Gym?.name || "GFMS"}</span>
                  <small>{String(pkg?.status || "unknown").toUpperCase()} • Còn {Number(pkg?.sessionsRemaining ?? 0)} buổi</small>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="mprog-stats">
        <div className="mprog-stat-card"><Dumbbell size={18} /><strong>{stats.completed}</strong><span>Buổi đã hoàn thành</span></div>
        <div className="mprog-stat-card"><CalendarDays size={18} /><strong>{stats.upcoming}</strong><span>Lịch sắp tới</span></div>
        <div className="mprog-stat-card"><Activity size={18} /><strong>{stats.bmi > 0 ? stats.bmi.toFixed(1) : "—"}</strong><span>BMI gần nhất</span></div>
        <div className="mprog-stat-card"><Package2 size={18} /><strong>{selectedPackage ? `${stats.sessionsRemaining}` : "0"}</strong><span>Buổi còn lại của gói đang chọn</span></div>
      </div>

      <div className="mprog-grid">
        <section className="m-card padded mprog-card-large">
          <div className="mprog-section-head"><Target size={18} /><h3>Trạng thái gói đang xem</h3></div>
          {selectedPackage ? (
            <>
              <div className="mprog-package-name">{selectedPackage.Package?.name || selectedPackage.packageName || "Gói hiện tại"}</div>
              <div className="mprog-package-sub">{selectedPackage.Gym?.name || "GFMS"} • Hết hạn {fmtDate(selectedPackage.expiryDate)}</div>
              <div className="mprog-progress-line"><div style={{ width: `${progressPercent}%` }} /></div>
              <div className="mprog-package-meta">
                <span>Đã dùng {stats.sessionsUsed} buổi</span>
                <span>Còn {stats.sessionsRemaining} / {stats.totalSessions} buổi</span>
              </div>
            </>
          ) : <div className="m-empty">Hãy chọn một gói để xem chi tiết tiến độ.</div>}
        </section>

        <section className="m-card padded">
          <div className="mprog-section-head"><Clock3 size={18} /><h3>Lịch tập sắp tới của gói này</h3></div>
          {!selectedPackage ? <div className="m-empty">Chưa chọn gói.</div> : !upcomingItems.length ? <div className="m-empty">Chưa có lịch sắp tới cho gói đang chọn.</div> : upcomingItems.map((item) => (
            <div key={item.id} className="mprog-list-item">
              <div>
                <strong>{item.Trainer?.User?.username || item.trainerName || "PT"}</strong>
                <p>{toDateKey(item.bookingDate)} • {String(item.startTime || "").slice(0,5)} - {String(item.endTime || "").slice(0,5)}</p>
              </div>
              <span className={`m-badge ${String(item.status).toLowerCase() === 'confirmed' ? 'is-on' : 'is-off'}`}>{item.status}</span>
            </div>
          ))}
        </section>

        <section className="m-card padded">
          <div className="mprog-section-head"><Dumbbell size={18} /><h3>Lịch sử buổi của gói này</h3></div>
          {!selectedPackage ? <div className="m-empty">Chưa chọn gói.</div> : !recentPackageBookings.length ? <div className="m-empty">Chưa có lịch sử buổi nào cho gói đang chọn.</div> : recentPackageBookings.map((item) => (
            <div key={item.id} className="mprog-list-item">
              <div>
                <strong>{item.Trainer?.User?.username || item.trainerName || "PT"}</strong>
                <p>{toDateKey(item.bookingDate)} • {String(item.startTime || "").slice(0,5)} - {String(item.endTime || "").slice(0,5)}</p>
              </div>
              <span>{String(item.status || "").toUpperCase()}</span>
            </div>
          ))}
        </section>

        <section className="m-card padded">
          <div className="mprog-section-head"><Activity size={18} /><h3>Bản ghi BMI gần đây</h3></div>
          {!recentMetrics.length ? <div className="m-empty">Chưa có dữ liệu BMI.</div> : recentMetrics.map((item) => (
            <div key={item.id} className="mprog-list-item">
              <div>
                <strong>BMI {Number(item.bmi || item.BMI || 0).toFixed(1)}</strong>
                <p>{Number(item.weightKg || item.weight || 0).toFixed(1)} kg • {Number(item.heightCm || item.height || 0)} cm</p>
              </div>
              <span>{fmtDate(item.recordedAt || item.createdAt)}</span>
            </div>
          ))}
        </section>
      </div>

      <div className="mprog-grid bmi-progress-grid">
        <section className="m-card padded">
          <div className="mprog-section-head"><Activity size={18} /><h3>Cập nhật BMI</h3></div>
          <BMICard latestMetric={latestMetric} metrics={recentMetrics} onCreated={loadAll} />
        </section>

        <section className="m-card padded">
          <div className="mprog-section-head"><Activity size={18} /><h3>Biểu đồ tiến độ BMI</h3></div>
          <BMIProgressChart data={recentMetrics} />
        </section>
      </div>
    </div>
  );
}
