import "./Stats.css";

const stats = [
  { icon: "apartment", value: "50+", label: "Chi nhánh" },
  { icon: "fitness_center", value: "Premium", label: "Thiết bị" },
  { icon: "groups", value: "10K+", label: "Hội viên" },
  { icon: "monitoring", value: "35%", label: "Lợi nhuận" },
];

export default function Stats() {
  return (
    <section className="stats">
      {stats.map((s, i) => (
        <div key={i} className="stat">
          <span className="material-symbols-outlined">{s.icon}</span>
          <strong>{s.value}</strong>
          <span>{s.label}</span>
        </div>
      ))}
    </section>
  );
}
