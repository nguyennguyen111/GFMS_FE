import React, { useMemo } from "react";
import "./OwnerOverviewPage.css";

function StatCard({ title, value, hint, icon }) {
  return (
    <div className="ov-card">
      <div className="ov-cardTop">
        <div className="ov-ico">{icon}</div>
        <div className="ov-title">{title}</div>
      </div>
      <div className="ov-value">{value}</div>
      <div className="ov-hint">{hint}</div>
    </div>
  );
}

function Panel({ title, right, children }) {
  return (
    <div className="ov-panel">
      <div className="ov-panelHead">
        <div className="ov-panelTitle">{title}</div>
        <div className="ov-panelRight">{right}</div>
      </div>
      <div className="ov-panelBody">{children}</div>
    </div>
  );
}

export default function OwnerOverviewPage() {
  // NOTE: hiện đang mock UI; khi nối API bạn map từ models:
  // transaction/commission/withdrawal, booking, member+packageActivation, equipmentstock+maintenance, review, notification
  const stats = useMemo(() => ([
    { title: "Doanh thu tháng", value: "₫ 128,500,000", hint: "transaction • tháng này", icon: "💳" },
    { title: "Hoa hồng", value: "₫ 12,340,000", hint: "commission • chờ đối soát", icon: "🧾" },
    { title: "Booking hôm nay", value: "18", hint: "booking • sắp diễn ra", icon: "🗓️" },
    { title: "Thiết bị cần bảo trì", value: "3", hint: "maintenance • 7 ngày tới", icon: "🛠️" },
  ]), []);

  const upcomingBookings = [
    { time: "09:00", member: "Nguyễn A", trainer: "PT Minh", gym: "GFMS Q7" },
    { time: "10:30", member: "Trần B", trainer: "PT Huy", gym: "GFMS Q7" },
    { time: "14:00", member: "Lê C", trainer: "PT An", gym: "GFMS Q2" },
  ];

  const expiringPackages = [
    { member: "Phạm D", packageName: "12 buổi PT", daysLeft: 3 },
    { member: "Võ E", packageName: "Gym tháng", daysLeft: 5 },
  ];

  const lowStock = [
    { item: "Dây kháng lực", qty: 4, min: 10 },
    { item: "Găng tay", qty: 6, min: 12 },
  ];

  return (
    <div className="ov-wrap">
      <div className="ov-gridStats">
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="ov-grid2">
        <Panel title="Booking sắp tới" right={<button className="ov-linkBtn">Xem tất cả</button>}>
          <div className="ov-list">
            {upcomingBookings.map((b, idx) => (
              <div className="ov-row" key={idx}>
                <div className="ov-badge">{b.time}</div>
                <div className="ov-rowMain">
                  <div className="ov-rowTitle">{b.member} • {b.trainer}</div>
                  <div className="ov-rowSub">{b.gym}</div>
                </div>
                <button className="ov-miniBtn">Chi tiết</button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Hội viên sắp hết hạn gói" right={<button className="ov-linkBtn">Nhắc gia hạn</button>}>
          <div className="ov-list">
            {expiringPackages.map((p, idx) => (
              <div className="ov-row" key={idx}>
                <div className="ov-badge warn">{p.daysLeft}d</div>
                <div className="ov-rowMain">
                  <div className="ov-rowTitle">{p.member}</div>
                  <div className="ov-rowSub">{p.packageName}</div>
                </div>
                <button className="ov-miniBtn">Nhắc</button>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="ov-grid2">
        <Panel title="Tồn kho thấp" right={<button className="ov-linkBtn">Tạo đơn mua</button>}>
          <div className="ov-list">
            {lowStock.map((x, idx) => (
              <div className="ov-row" key={idx}>
                <div className="ov-badge danger">{x.qty}/{x.min}</div>
                <div className="ov-rowMain">
                  <div className="ov-rowTitle">{x.item}</div>
                  <div className="ov-rowSub">equipmentstock / inventory</div>
                </div>
                <button className="ov-miniBtn">Đặt</button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Thông báo mới" right={<button className="ov-linkBtn">Mở Inbox</button>}>
          <div className="ov-empty">
            Chưa có dữ liệu thật. Khi nối API: notification + message + review sẽ hiện ở đây.
          </div>
        </Panel>
      </div>
    </div>
  );
}
