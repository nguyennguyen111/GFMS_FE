import React from "react";
import "./RolesSection.css";

const roles = [
  {
    title: "Admin (HQ)",
    desc: "Tạo & quản lý chi nhánh, cấp tài khoản Owner/Staff, thiết lập gói tập chuẩn, giám sát vận hành toàn hệ thống.",
    tags: ["Multi-gym", "Phân quyền", "Báo cáo tổng"],
  },
  {
    title: "Owner (Chi nhánh)",
    desc: "Quản lý gói tập theo chi nhánh, lịch/slot, danh sách hội viên, doanh thu và hiệu suất vận hành của gym mình.",
    tags: ["Gói tập", "Slot", "Doanh thu"],
  },
  {
    title: "Member (Hội viên)",
    desc: "Đăng ký gói tập, xem quyền lợi, đặt lịch/slot (nếu có), theo dõi lịch sử và trạng thái gói.",
    tags: ["Đăng ký", "Lịch sử", "Trạng thái"],
  },
];

const RolesSection = () => {
  return (
    <section className="roles" id="roles">
      <div className="section-header">
        <span className="stroke-text">Vai trò</span>
        <span>trong hệ thống</span>
      </div>

      <div className="roles-grid">
        {roles.map((r) => (
          <div className="role-card" key={r.title}>
            <div className="role-title">{r.title}</div>
            <div className="role-desc">{r.desc}</div>
            <div className="role-tags">
              {r.tags.map((t) => (
                <span className="tag" key={t}>{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RolesSection;
