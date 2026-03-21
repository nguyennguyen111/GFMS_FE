import React from "react";
import {
  CalendarCheck,
  Clock,
  Tag,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import "../member-pages.css";
import "./MemberNotificationsPage.css";

const notifications = [
  {
    id: 1,
    type: "event",
    title: "Xác nhận buổi tập PT",
    time: "2 phút trước",
    description:
      "Buổi tập cá nhân của bạn với Huấn luyện viên Minh đã được xác nhận vào lúc 18:00 ngày mai. Hãy chuẩn bị sẵn sàng!",
    unread: true,
    category: "Đặt lịch & Lịch hẹn",
  },
  {
    id: 2,
    type: "schedule",
    title: "Thay đổi lịch lớp Yoga",
    time: "3 giờ trước",
    description:
      "Lớp Yoga sáng Thứ Năm đã được dời sang 09:00 thay vì 08:30. Xin lỗi vì sự bất tiện này.",
    unread: false,
    category: "Đặt lịch & Lịch hẹn",
  },
  {
    id: 3,
    type: "promo",
    title: "Gia hạn thẻ thành viên - Ưu đãi 20%",
    time: "Hôm nay",
    description:
      "Thẻ thành viên Platinum của bạn sắp hết hạn. Gia hạn ngay hôm nay để nhận ưu đãi 20% cho gói 12 tháng tiếp theo.",
    unread: true,
    isPromo: true,
    category: "Ưu đãi & Khuyến mãi",
  },
  {
    id: 4,
    type: "security",
    title: "Đăng nhập mới phát hiện",
    time: "10 giờ trước",
    description:
      "Tài khoản của bạn vừa được đăng nhập từ một thiết bị mới tại TP. Hồ Chí Minh. Nếu không phải bạn, hãy đổi mật khẩu ngay.",
    unread: true,
    category: "Hệ thống & Bảo mật",
  },
  {
    id: 5,
    type: "update",
    title: "Cập nhật ứng dụng KINETIC v2.4",
    time: "Hôm qua",
    description:
      "Chúng tôi vừa cập nhật tính năng theo dõi chỉ số cơ thể mới. Hãy cập nhật ứng dụng để trải nghiệm ngay.",
    unread: false,
    category: "Hệ thống & Bảo mật",
  },
];

const iconMap = {
  event: CalendarCheck,
  schedule: Clock,
  promo: Tag,
  security: ShieldAlert,
  update: RefreshCw,
};

const categories = [
  "Đặt lịch & Lịch hẹn",
  "Ưu đãi & Khuyến mãi",
  "Hệ thống & Bảo mật",
];

export default function MemberNotificationsPage() {
  return (
    <div className="mh-wrap mn-page">
      <div className="mh-head mn-head">
        <div className="mn-head-left">
          <span className="mn-sub-label">Trung tâm điều khiển</span>
          <h2 className="mh-title mn-title">Thông báo</h2>
          <div className="mh-sub mn-desc">
            Nhận thông báo booking, thanh toán, ưu đãi và cập nhật hệ thống.
          </div>
        </div>

        <div className="mn-filter-tabs">
          <button type="button" className="mn-tab active">
            Tất cả
          </button>
          <button type="button" className="mn-tab">
            Chưa đọc (3)
          </button>
        </div>
      </div>

      <div className="mn-list-wrap">
        {categories.map((category) => {
          const items = notifications.filter((item) => item.category === category);

          return (
            <div key={category} className="mn-category-block">
              <div className="mn-category-header">
                <span className="mn-category-title">{category}</span>
                <div className="mn-category-line" />
              </div>

              <div className="mn-list">
                {items.map((item) => {
                  const Icon = iconMap[item.type] || RefreshCw;

                  return (
                    <div
                      key={item.id}
                      className={`mn-item ${item.unread ? "unread" : "read"} ${
                        item.isPromo ? "promo" : ""
                      }`}
                    >
                      {item.unread && <div className="mn-unread-dot" />}

                      <div className="mn-icon">
                        <Icon size={22} />
                      </div>

                      <div className="mn-content">
                        <div className="mn-content-head">
                          <h3 className="mn-item-title">{item.title}</h3>
                          <span className="mn-time">{item.time}</span>
                        </div>

                        <p className="mn-item-desc">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mn-footer-action">
        <button type="button" className="mn-mark-all-btn">
          Đánh dấu tất cả là đã đọc
        </button>
      </div>
    </div>
  );
}