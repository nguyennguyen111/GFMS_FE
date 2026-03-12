import "./Franchise.css";

export default function Franchise() {
  return (
    <section className="franchise" id="franchise">
      <div className="franchise-text">
        <h2>NHƯỢNG QUYỀN 2026</h2>
        <p>ROI lên đến 35% – Hỗ trợ vận hành trọn gói.</p>
      </div>
      <form className="franchise-form">
        <input placeholder="Họ và tên" />
        <input placeholder="Số điện thoại" />
        <button>GỬI YÊU CẦU</button>
      </form>
    </section>
  );
}
