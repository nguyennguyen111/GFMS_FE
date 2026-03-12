import "./Services.css";

const services = [
  "Personal Training",
  "Yoga & Group X",
  "Thực phẩm sạch"
];

export default function Services() {
  return (
    <section className="services">
      <h2>DỊCH VỤ & TIỆN ÍCH</h2>
      <div className="services-row">
        {services.map((s,i)=>(
          <div key={i} className="service-card">{s}</div>
        ))}
      </div>
    </section>
  );
}
