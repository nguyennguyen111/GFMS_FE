import React from "react";
import "./WorkflowSection.css";

const steps = [
  { no: "01", title: "Thiết lập hệ thống", desc: "Admin tạo chi nhánh, cấu hình gói tập chuẩn, phân quyền Owner/Staff." },
  { no: "02", title: "Vận hành chi nhánh", desc: "Owner tạo gói theo gym, quản lý slot, theo dõi hội viên & doanh thu." },
  { no: "03", title: "Trải nghiệm hội viên", desc: "Member đăng ký gói, đặt lịch, theo dõi trạng thái và lịch sử." },
  { no: "04", title: "Báo cáo & đối soát", desc: "Tổng hợp doanh thu theo ngày/tháng/chi nhánh, xuất báo cáo vận hành." },
];

const WorkflowSection = () => {
  return (
    <section className="workflow" id="workflow">
      <div className="section-header">
        <span className="stroke-text">Quy trình</span>
        <span>nghiệp vụ</span>
      </div>

      <div className="workflow-grid">
        {steps.map((s) => (
          <div className="wf-card" key={s.no}>
            <div className="wf-no">{s.no}</div>
            <div className="wf-title">{s.title}</div>
            <div className="wf-desc">{s.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default WorkflowSection;
