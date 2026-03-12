// src/components/member/pages/BMIProgressChart.jsx
import React, { useMemo, useState } from "react";

const formatDate = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("vi-VN");
  } catch {
    return "";
  }
};

const bmiStatusVi = (bmi) => {
  if (bmi < 18.5) return "Thiếu cân";
  if (bmi < 25) return "Bình thường";
  if (bmi < 30) return "Thừa cân";
  return "Béo phì";
};

export default function BMIProgressChart({ data = [] }) {
  const [hovered, setHovered] = useState(null);

  const chart = useMemo(() => {
    if (!data.length) return null;

    const width = 900;
    const height = 320;
    const padLeft = 56;
    const padRight = 24;
    const padTop = 24;
    const padBottom = 46;

    const clean = data
      .map((item) => ({
        ...item,
        bmi: Number(item.bmi),
      }))
      .filter((x) => !Number.isNaN(x.bmi));

    const values = clean.map((x) => x.bmi);
    const minValue = Math.min(...values, 16);
    const maxValue = Math.max(...values, 32);

    const minY = Math.floor(minValue - 1);
    const maxY = Math.ceil(maxValue + 1);
    const rangeY = Math.max(maxY - minY, 1);

    const getX = (index) =>
      padLeft + (index * (width - padLeft - padRight)) / Math.max(clean.length - 1, 1);

    const getY = (value) =>
      padTop + ((maxY - value) * (height - padTop - padBottom)) / rangeY;

    const points = clean.map((item, index) => ({
      ...item,
      x: getX(index),
      y: getY(item.bmi),
      labelDate: formatDate(item.createdAt || item.date),
      status: bmiStatusVi(item.bmi),
    }));

    const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    const areaPath = `${path} L ${points[points.length - 1].x} ${height - padBottom} L ${points[0].x} ${height - padBottom} Z`;

    const yTicks = Array.from({ length: 6 }).map((_, i) => {
      const value = minY + (i * (maxY - minY)) / 5;
      return {
        value: Number(value.toFixed(1)),
        y: getY(value),
      };
    });

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      minY,
      maxY,
      getY,
      points,
      path,
      areaPath,
      yTicks,
    };
  }, [data]);

  if (!data.length || !chart) {
    return (
      <div className="mprof-card chart-card-modern">
        <div className="mprof-cardHead">
          <h3>Biểu đồ tiến trình</h3>
          <span className="mprof-muted">Chưa có dữ liệu để hiển thị.</span>
        </div>
      </div>
    );
  }

  const {
    width,
    height,
    padLeft,
    padRight,
    padTop,
    padBottom,
    getY,
    points,
    path,
    areaPath,
    yTicks,
  } = chart;

  const chartBottom = height - padBottom;
  const normalTop = getY(24.9);
  const normalBottom = getY(18.5);
  const underTop = getY(18.5);
  const overTop = getY(29.9);
  const overBottom = getY(25);
  const obeseBottom = getY(30);

  return (
    <div className="mprof-card chart-card-modern">
      <div className="mprof-cardHead">
        <div>
          <h3>Biểu đồ BMI theo thời gian</h3>
          <span className="mprof-muted">
            Di chuột vào từng điểm để xem chi tiết chỉ số, ngày cập nhật và ghi chú.
          </span>
        </div>
      </div>

      <div className="mprof-chartWrap modern-chart-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} className="mprof-chartSvg modern-chart-svg">
          <defs>
            <linearGradient id="bmiAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
            </linearGradient>

            <linearGradient id="bmiLineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>

            <filter id="softGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect
            x={padLeft}
            y={padTop}
            width={width - padLeft - padRight}
            height={chartBottom - padTop}
            rx="18"
            className="chart-bg"
          />

          <rect
            x={padLeft}
            y={underTop}
            width={width - padLeft - padRight}
            height={chartBottom - underTop}
            fill="rgba(245, 158, 11, 0.08)"
          />

          <rect
            x={padLeft}
            y={normalTop}
            width={width - padLeft - padRight}
            height={normalBottom - normalTop}
            fill="rgba(34, 197, 94, 0.10)"
          />

          <rect
            x={padLeft}
            y={overBottom}
            width={width - padLeft - padRight}
            height={overTop - overBottom}
            fill="rgba(251, 191, 36, 0.10)"
          />

          <rect
            x={padLeft}
            y={padTop}
            width={width - padLeft - padRight}
            height={obeseBottom - padTop}
            fill="rgba(239, 68, 68, 0.08)"
          />

          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={tick.y}
                y2={tick.y}
                className="chart-grid-line"
              />
              <text
                x={padLeft - 12}
                y={tick.y + 4}
                textAnchor="end"
                className="chart-axis-text"
              >
                {tick.value}
              </text>
            </g>
          ))}

          <line
            x1={padLeft}
            x2={width - padRight}
            y1={chartBottom}
            y2={chartBottom}
            className="chart-axis-line"
          />

          <path d={areaPath} fill="url(#bmiAreaGradient)" />
          <path d={path} fill="none" stroke="url(#bmiLineGradient)" strokeWidth="4" filter="url(#softGlow)" />

          {points.map((p, idx) => (
            <g
              key={idx}
              onMouseEnter={() => setHovered({ ...p, index: idx })}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              <circle cx={p.x} cy={p.y} r="7" className="chart-point-outer" />
              <circle cx={p.x} cy={p.y} r="4.5" className="chart-point-inner" />

              <text
                x={p.x}
                y={chartBottom + 22}
                textAnchor="middle"
                className="chart-date-text"
              >
                {p.labelDate}
              </text>
            </g>
          ))}

          {hovered && (
            <g className="chart-tooltip-group">
              <line
                x1={hovered.x}
                x2={hovered.x}
                y1={padTop}
                y2={chartBottom}
                className="chart-hover-line"
              />

              <g transform={`translate(${Math.min(hovered.x + 14, width - 220)}, ${Math.max(hovered.y - 95, 20)})`}>
                <rect width="190" height="88" rx="14" className="chart-tooltip-box" />
                <text x="14" y="22" className="chart-tooltip-title">
                  BMI: {hovered.bmi}
                </text>
                <text x="14" y="40" className="chart-tooltip-text">
                  Trạng thái: {hovered.status}
                </text>
                <text x="14" y="58" className="chart-tooltip-text">
                  Ngày: {hovered.labelDate || "—"}
                </text>
                <text x="14" y="76" className="chart-tooltip-text">
                  Ghi chú: {hovered.note || "Không có"}
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      <div className="chart-legend">
        <div className="chart-legendItem">
          <span className="legend-box under" />
          <span>Thiếu cân</span>
        </div>
        <div className="chart-legendItem">
          <span className="legend-box normal" />
          <span>Bình thường</span>
        </div>
        <div className="chart-legendItem">
          <span className="legend-box over" />
          <span>Thừa cân</span>
        </div>
        <div className="chart-legendItem">
          <span className="legend-box obese" />
          <span>Béo phì</span>
        </div>
      </div>
    </div>
  );
}