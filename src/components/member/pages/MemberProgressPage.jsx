import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  Activity,
  TrendingUp,
  Calendar,
  Timer,
  Zap,
} from 'lucide-react';
import '../member-pages.css';
import './MemberProgressPage.css';
import { memberGetMetrics, memberGetLatestMetric } from '../../../services/memberMetricService';
import { memberGetMyBookings } from '../../../services/memberBookingService';
import { memberGetMyPackages } from '../../../services/memberPackageService';
import BMICard from './BMICard';

const fmtDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('vi-VN');
};

const fmtDateShort = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
};

const toDateKey = (value) => String(value || '').slice(0, 10);
const packId = (x) => Number(x?.id || x?.activationId || x?.packageActivationId || 0);

const getBmiStatus = (bmi) => {
  if (!bmi || bmi <= 0) return 'CHƯA CÓ DỮ LIỆU';
  if (bmi < 18.5) return 'THIẾU CÂN';
  if (bmi < 25) return 'BÌNH THƯỜNG';
  if (bmi < 30) return 'THỪA CÂN';
  return 'BÉO PHÌ';
};

const getBmiProgressOffset = (bmi) => {
  const safeBmi = Math.max(0, Math.min(Number(bmi || 0), 40));
  const percent = safeBmi / 40;
  const circumference = 2 * Math.PI * 45;
  return circumference * (1 - percent);
};

const getTrendData = (metrics) => {
  const rows = [...(Array.isArray(metrics) ? metrics : [])]
    .sort(
      (a, b) =>
        new Date(a.recordedAt || a.createdAt || 0) -
        new Date(b.recordedAt || b.createdAt || 0)
    )
    .slice(-6);

  const bmiValues = rows.map((item) => Number(item?.bmi || item?.BMI || 0)).filter((x) => x > 0);
  const maxBmi = bmiValues.length ? Math.max(...bmiValues) : 1;

  return rows.map((item, index) => {
    const bmi = Number(item?.bmi || item?.BMI || 0);
    const recordedAt = item?.recordedAt || item?.createdAt;
    const isLatest = index === rows.length - 1;

    return {
      id: item?.id || index,
      bmi,
      heightPercent: `${Math.max(18, (bmi / maxBmi) * 100)}%`,
      recordedAt,
      label: isLatest ? 'NAY' : fmtDateShort(recordedAt),
      fullDate: fmtDate(recordedAt),
      weightKg: Number(item?.weightKg || item?.weight || 0),
      heightCm: Number(item?.heightCm || item?.height || 0),
      note: item?.note || '',
      status: getBmiStatus(bmi),
      isLatest,
    };
  });
};

const calculateTotalWorkoutHours = (bookingItems) => {
  const completedItems = bookingItems.filter((x) =>
    ['completed', 'attended'].includes(String(x.status || '').toLowerCase())
  );

  const totalMinutes = completedItems.reduce((sum, item) => {
    const start = String(item?.startTime || '00:00:00').slice(0, 5);
    const end = String(item?.endTime || '00:00:00').slice(0, 5);

    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);

    if ([sh, sm, eh, em].some(Number.isNaN)) return sum;

    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    const diff = Math.max(0, endMinutes - startMinutes);

    return sum + diff;
  }, 0);

  return (totalMinutes / 60).toFixed(1);
};

const calculateLastMonthDelta = (bookingItems) => {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const prevMonthDate = new Date(thisYear, thisMonth - 1, 1);
  const prevPrevMonthDate = new Date(thisYear, thisMonth - 2, 1);

  const getCountForMonth = (dateRef) => {
    const month = dateRef.getMonth();
    const year = dateRef.getFullYear();

    return bookingItems.filter((item) => {
      const status = String(item.status || '').toLowerCase();
      if (!['completed', 'attended'].includes(status)) return false;

      const d = new Date(item.bookingDate);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;
  };

  const prevMonthCount = getCountForMonth(prevMonthDate);
  const prevPrevMonthCount = getCountForMonth(prevPrevMonthDate);

  if (prevPrevMonthCount === 0) {
    if (prevMonthCount === 0) return '0% SO VỚI THÁNG TRƯỚC';
    return '+100% SO VỚI THÁNG TRƯỚC';
  }

  const diff = ((prevMonthCount - prevPrevMonthCount) / prevPrevMonthCount) * 100;
  const rounded = Math.round(diff);

  if (rounded > 0) return `+${rounded}% SO VỚI THÁNG TRƯỚC`;
  return `${rounded}% SO VỚI THÁNG TRƯỚC`;
};

const getFitnessScore = (stats, totalHours) => {
  const bmiScore = stats.bmi > 0
    ? stats.bmi >= 18.5 && stats.bmi < 25
      ? 300
      : 180
    : 0;

  const sessionScore = Math.min(stats.completed * 12, 400);
  const hourScore = Math.min(Math.round(Number(totalHours || 0) * 4), 200);

  return bmiScore + sessionScore + hourScore;
};

const getFitnessRank = (score) => {
  if (score >= 800) return 'ELITE';
  if (score >= 600) return 'ADVANCED';
  if (score >= 400) return 'GOOD';
  if (score >= 200) return 'BASIC';
  return 'STARTER';
};

const getSegmentCount = (score) => {
  if (score >= 800) return 5;
  if (score >= 600) return 4;
  if (score >= 400) return 3;
  if (score >= 200) return 2;
  if (score > 0) return 1;
  return 0;
};

const MemberProgressPage = () => {
  const [metrics, setMetrics] = useState([]);
  const [latestMetric, setLatestMetric] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredTrendId, setHoveredTrendId] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
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
        const firstActive =
          nextPackages.find((x) => String(x.status || '').toLowerCase() === 'active') ||
          nextPackages[0] ||
          null;
        return firstActive ? packId(firstActive) : null;
      });
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Không tải được dữ liệu tiến độ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const selectedPackage = useMemo(() => {
    const found = packages.find((x) => packId(x) === Number(selectedPackageId));
    return found || null;
  }, [packages, selectedPackageId]);

  const packageBookings = useMemo(() => {
    const pid = Number(selectedPackage?.id || selectedPackage?.activationId || 0);
    if (!pid) return [];
    return bookings.filter(
      (x) => Number(x.packageActivationId || x.activationId || x.PackageActivation?.id || 0) === pid
    );
  }, [bookings, selectedPackage]);

  const stats = useMemo(() => {
    const completed = packageBookings.filter((x) =>
      ['completed', 'attended'].includes(String(x.status || '').toLowerCase())
    ).length;

    const upcoming = packageBookings.filter((x) => {
      const status = String(x.status || '').toLowerCase();
      return (
        ['confirmed', 'pending'].includes(status) &&
        new Date(
          `${toDateKey(x.bookingDate)}T${String(x.startTime || '00:00:00').slice(0, 8)}`
        ) >= new Date()
      );
    }).length;

    const bmi = Number(latestMetric?.bmi || latestMetric?.BMI || 0);
    const totalSessions = Number(selectedPackage?.totalSessions || 0);
    const sessionsRemaining = Number(selectedPackage?.sessionsRemaining ?? 0);
    const sessionsUsed = Number(
      selectedPackage?.sessionsUsed ?? Math.max(0, totalSessions - sessionsRemaining)
    );

    return { completed, upcoming, bmi, totalSessions, sessionsRemaining, sessionsUsed };
  }, [packageBookings, latestMetric, selectedPackage]);

  const progressPercent = useMemo(() => {
    if (!stats.totalSessions) return 0;
    return Math.max(0, Math.min(100, (stats.sessionsUsed / Math.max(1, stats.totalSessions)) * 100));
  }, [stats]);

  const trendData = useMemo(() => getTrendData(metrics), [metrics]);

  const remainingToGoal = useMemo(() => {
    if (!latestMetric?.weightKg && !latestMetric?.weight) return '—';
    const currentWeight = Number(latestMetric?.weightKg || latestMetric?.weight || 0);
    const targetWeight = 22 * Math.pow(Number(latestMetric?.heightCm || latestMetric?.height || 0) / 100, 2);

    if (!currentWeight || !targetWeight) return '—';

    const diff = currentWeight - targetWeight;
    if (Math.abs(diff) < 0.1) return 'ĐÃ ĐẠT';
    return `${diff > 0 ? '-' : '+'}${Math.abs(diff).toFixed(1)} KG`;
  }, [latestMetric]);

  const projectedDays = useMemo(() => {
    if (!stats.sessionsRemaining) return 'HOÀN THÀNH';
    if (!stats.upcoming) return 'CHƯA CÓ LỊCH';
    return `${Math.ceil((stats.sessionsRemaining / Math.max(1, stats.upcoming)) * 7)} NGÀY`;
  }, [stats]);

  const totalWorkoutHours = useMemo(() => calculateTotalWorkoutHours(packageBookings), [packageBookings]);
  const workoutDelta = useMemo(() => calculateLastMonthDelta(packageBookings), [packageBookings]);
  const fitnessScore = useMemo(
    () => getFitnessScore(stats, totalWorkoutHours),
    [stats, totalWorkoutHours]
  );
  const fitnessRank = useMemo(() => getFitnessRank(fitnessScore), [fitnessScore]);
  const segmentCount = useMemo(() => getSegmentCount(fitnessScore), [fitnessScore]);
  const bmiStatus = useMemo(() => getBmiStatus(stats.bmi), [stats.bmi]);
  const gaugeOffset = useMemo(() => getBmiProgressOffset(stats.bmi), [stats.bmi]);
  const hoveredTrend = useMemo(
    () => trendData.find((item) => item.id === hoveredTrendId) || null,
    [trendData, hoveredTrendId]
  );

  if (loading) {
    return <div className="m-empty">Đang tải dữ liệu tiến độ...</div>;
  }

  return (
    <div className="member-dashboard-container">
      <main className="member-main-content">
        <header className="member-hero-header">
          <p className="member-hero-subtitle">THE PERFORMANCE TRACKER</p>
          <h1 className="member-hero-title">TIẾN ĐỘ & BMI</h1>
        </header>

        <div className="member-top-grid">
          <section className="member-card member-input-card member-equal-card">
            <div className="member-card-header">
              <Calculator size={16} className="member-accent-icon" />
              <span className="member-card-label">CẬP NHẬT CHỈ SỐ</span>
            </div>

            <div className="member-card-body">
              <BMICard latestMetric={latestMetric} metrics={metrics.slice(0, 8)} onCreated={loadAll} />
            </div>
          </section>

          <section className="member-card member-bmi-card member-equal-card">
            <div className="member-card-header">
              <Activity size={16} className="member-accent-icon" />
              <span className="member-card-label">CHỈ SỐ HIỆN TẠI</span>
            </div>

            <div className="member-card-body member-bmi-card-body">
              <div className="member-bmi-gauge-container">
                <div className="member-bmi-gauge">
                  <svg viewBox="0 0 100 100">
                    <circle className="gauge-bg" cx="50" cy="50" r="45" />
                    <circle
                      className="gauge-progress"
                      cx="50"
                      cy="50"
                      r="45"
                      style={{
                        strokeDasharray: 283,
                        strokeDashoffset: gaugeOffset,
                      }}
                    />
                  </svg>
                  <div className="member-bmi-value">
                    <span className="bmi-number">{stats.bmi > 0 ? stats.bmi.toFixed(1) : '—'}</span>
                    <span className="bmi-status">{bmiStatus}</span>
                  </div>
                </div>
              </div>

              <div className="member-bmi-scale">
                <div className={`scale-item ${stats.bmi > 0 && stats.bmi < 18.5 ? 'active' : ''}`}>
                  <span>&lt;18.5</span>
                  <div className="scale-bar"></div>
                </div>
                <div className={`scale-item ${stats.bmi >= 18.5 && stats.bmi < 25 ? 'active' : ''}`}>
                  <span>18.5 - 24.9</span>
                  <div className="scale-bar"></div>
                </div>
                <div className={`scale-item ${stats.bmi >= 25 && stats.bmi < 30 ? 'active' : ''}`}>
                  <span>25 - 29.9</span>
                  <div className="scale-bar"></div>
                </div>
                <div className={`scale-item ${stats.bmi >= 30 ? 'active' : ''}`}>
                  <span>30+</span>
                  <div className="scale-bar"></div>
                </div>
              </div>
            </div>
          </section>

          <section className="member-card member-trend-card member-equal-card">
            <div className="member-card-header">
              <TrendingUp size={16} className="member-accent-icon" />
              <span className="member-card-label">XU HƯỚNG BMI</span>
            </div>

            <div className="member-card-body member-trend-card-body">
              <div className="member-trend-chartWrap">
                <div className="member-trend-chart">
                  {!trendData.length ? (
                    <div className="member-empty-state member-empty-inline">Chưa có dữ liệu BMI.</div>
                  ) : (
                    trendData.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`chart-bar ${item.isLatest ? 'active' : ''} ${hoveredTrendId === item.id ? 'hovered' : ''}`}
                        style={{ height: item.heightPercent }}
                        onMouseEnter={() => setHoveredTrendId(item.id)}
                        onMouseLeave={() => setHoveredTrendId(null)}
                        onFocus={() => setHoveredTrendId(item.id)}
                        onBlur={() => setHoveredTrendId(null)}
                      >
                        <span className="chart-bar-date">{item.label}</span>
                      </button>
                    ))
                  )}
                </div>

                {hoveredTrend ? (
                  <div className="member-trend-tooltip">
                    <div className="member-trend-tooltip-head">
                      <strong>BMI {hoveredTrend.bmi.toFixed(1)}</strong>
                      <span>{hoveredTrend.status}</span>
                    </div>
                    <div className="member-trend-tooltip-row">
                      <span>Ngày ghi nhận</span>
                      <strong>{hoveredTrend.fullDate}</strong>
                    </div>
                    <div className="member-trend-tooltip-row">
                      <span>Chiều cao</span>
                      <strong>{hoveredTrend.heightCm || '—'} cm</strong>
                    </div>
                    <div className="member-trend-tooltip-row">
                      <span>Cân nặng</span>
                      <strong>{hoveredTrend.weightKg || '—'} kg</strong>
                    </div>
                    {hoveredTrend.note ? (
                      <div className="member-trend-tooltip-note">{hoveredTrend.note}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        <div className="member-bottom-grid"></div>
      </main>
    </div>
  );
};

export default MemberProgressPage;