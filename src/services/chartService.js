// src/services/chartService.js

export const makeLineChartData = ({
  labels = [],
  label = "Doanh thu",
  data = [],
} = {}) => {
  return {
    labels,
    datasets: [
      {
        label,
        data,
        tension: 0.35,
        fill: true,
        // KHÔNG set màu cứng cũng được, nhưng mình để tạm cho đẹp theo theme
        borderColor: "rgba(244,137,21,0.95)",
        backgroundColor: "rgba(244,137,21,0.12)",
        pointRadius: 3,
        pointHoverRadius: 4,
      },
    ],
  };
};

export const makeLineOptions = (title = "") => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      title: title ? { display: true, text: title } : { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        ticks: { color: "rgba(255,255,255,0.7)" },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
      y: {
        ticks: { color: "rgba(255,255,255,0.7)" },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
    },
  };
};
