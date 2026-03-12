import "./Hero.css";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg" />
      <div className="hero-content">
        <h1>
          NÂNG TẦM <br />
          <span>TRẢI NGHIỆM GYM</span>
        </h1>
        <p>
          Hệ thống quản lý phòng tập cao cấp & mô hình nhượng quyền lợi nhuận 35%.
        </p>
        <div className="hero-actions">
          <button className="btn primary">TÌM PHÒNG TẬP</button>
          <button className="btn light">NHƯỢNG QUYỀN</button>
        </div>
      </div>
    </section>
  );
}
