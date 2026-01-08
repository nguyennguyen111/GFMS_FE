import React from "react";
import "./ModulesSection.css";

const modules = [
  { title: "Quản lý chi nhánh (Multi-gym)", desc: "Chuẩn hoá dữ liệu theo từng gym, vẫn tổng hợp được toàn hệ thống." },
  { title: "Gói tập & quyền lợi", desc: "Tạo gói, thời hạn, giá, quyền lợi; đồng bộ hiển thị cho hội viên." },
  { title: "Lịch / Slot", desc: "Thiết lập khung giờ, giới hạn số lượng, đảm bảo không overbooking." },
  { title: "Phân quyền & tài khoản", desc: "Role-based access: Admin/Owner/Member, mở rộng Staff nếu cần." },
  { title: "Báo cáo doanh thu", desc: "Lọc theo ngày/tháng/năm, theo chi nhánh, theo gói; hỗ trợ đối soát." },
  { title: "Nhật ký & kiểm soát", desc: "Audit log/track thao tác quan trọng, tăng tính minh bạch." },
];

const ModulesSection = () => {
  return (
    <section className="modules" id="modules">
      <div className="section-header">
        <span className="stroke-text">Phân hệ</span>
        <span>chính</span>
      </div>

      <div className="modules-grid">
        {modules.map((m) => (
          <div className="module-card" key={m.title}>
            <div className="module-title">{m.title}</div>
            <div className="module-desc">{m.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ModulesSection;
