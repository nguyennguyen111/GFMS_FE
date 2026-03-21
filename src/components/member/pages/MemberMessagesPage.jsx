import React from "react";
import "./MemberMessagesPage.css";
import "../member-pages.css";

const conversations = [
  {
    id: 1,
    name: "MINH QUÂN (PT)",
    message: "Lịch tập ngày mai lúc 6:00 sáng vẫn như cũ nhé!",
    time: "VỪA XONG",
    active: true,
    online: true,
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC_Lic_w5DinhrDUcwowj7bKfSQYf8LQ5O2ui1jt9jGp71_syMpYv9AW1fwOEfTAqzbJFfuYhSg4MgIfnr6XSBgPnA30if48m-AHVzpiT5OYJ9-cIXDhCIcpK0bxlQdXc_zW1kD9ErgrUIJ11asfx85RroZSIFq2bA5D3XtnwX_xWAQHw0_LedcMiDvv0PoGq3yHGe6TqWBWHEj1pUpAPt09hZLSaT3Q4QxXU3JsYjAjBOh7aGUI-Ra-1kIxuXi3KDw6g8m9lcW7z4",
  },
  {
    id: 2,
    name: "TRUNG TÂM HỖ TRỢ",
    message: "Yêu cầu gia hạn thẻ của bạn đã được xử lý.",
    time: "10 PHÚT TRƯỚC",
    active: false,
    online: false,
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBVCUiv7_sd-lEIlWNNzmN47WgqE3xX_hxIucWHf058QHKodcqM_mvIbZoBz0JLTWxlW3oy3Z0Hb3OmrdZCJKYrqdYMbFGVCYl0BKxLd94jYVdYrSopm-5AJ6XmrRyq-u49vXprnoxKgPPzXGEdIoAoVoEZmt8xsR5zLJqVYBHgtX8jGC7D6CrJXIy_EtsFppC_KOt0NhYoHyDUKyF0Mx1zYpEanFX4CFQ8N4lX9C1MqcxOz1AGeJhI1ODU8xjnZRiHeh7mrhPk6o8",
  },
  {
    id: 3,
    name: "HUYỀN TRANG (NUTRITION)",
    message: "Gửi bạn thực đơn ăn kiêng cho tuần sau...",
    time: "2 GIỜ TRƯỚC",
    active: false,
    online: false,
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAuw06C490Ae9ZwcaMSE0VwmNIXfvrHRLfXsmBH6JFNC23wuqY4Mp1OsooGwH7AMfokdLSGopciLGTxQ1SZqYhbv2KlUnSGevS4MJTmc9XVIDXED7jBgyAU1k7yNVIG0CRLPv5JHJNyDZ1-MzycpRF1Ynchf6LKPN5Lf7jwp1tMrvHgEhU5tZ4eMQoP86LlceQSEmsDiHRhAJ3RWO_hkJZ6lA4WRpXvLFdFNR-MpT8_K1WBsd9nVy6v4mp6UPkIYC9LLYBIZg7IG98",
  },
  {
    id: 4,
    name: "CỘNG ĐỒNG KINETIC",
    message: "Sự kiện Heavy Lifters sẽ bắt đầu vào Chủ Nhật.",
    time: "4 GIỜ TRƯỚC",
    active: false,
    online: false,
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBwZGralxJYnvz4tMMiHR4iFDy1VkJFWH185s3ETvarFdG__-sztl2pT49ueW1SH4HBf0jOC2sZ-xvvIewrqkdgCYr8bT-9_jVews8H8SG0FX4-cce4NCqGFT8Zj0sTJUiQL-RSHPuCsXklaNBcwRxJSehDhQgT4y8lC3V-CO2ecz6jWfXD85Oa3Ynrs-yaCXeNxiFlN7sVZEfOktmYhBRZNexeecuOqYEUAO2tcSkIxpwS2u2FRW8krKcXvYP9WEPRP2vBcJqebyM",
  },
];

const messages = [
  {
    id: 1,
    text: "Chào bạn! Tôi đã nhận được chỉ số InBody mới nhất của bạn. Các chỉ số về cơ bắp đang tăng trưởng rất tốt.",
    time: "08:45 AM",
    sent: false,
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCic_U6N6rubH_lIm6Am5-Gf0TyCXcJI5bGIyyAubqmR6R1xDQljLF5zkBelYdUoKfVcUHwFkk1Dn5x3LRewMN_wsYhf8DS3Z3ar-JdFgf_ZfxMsy6qidmEO7hl0AII6A95Bgu7toTSZRukOGoy0s7izkjqb6hnh56MDuxSkzyqUI-e_lW5qCpbeuVwrrz9h6fEbi_u9vPmkjDqslOQrHjP6U3CabjeUPcQaZpEoecSZezEl7Dpl8Ibv6tM7v0C3qAwKxazvNTDLPY",
  },
  {
    id: 2,
    text: "Cảm ơn anh! Tôi thấy cơ bắp săn chắc hơn rõ rệt. Ngày mai chúng ta tập trung vào bài tập vai chứ?",
    time: "09:12 AM",
    sent: true,
  },
  {
    id: 3,
    text: "Đúng rồi, chúng ta sẽ tập trung vào vai và cơ lưng trên. Đây là giáo án chi tiết cho ngày mai, bạn xem qua trước nhé.",
    time: "09:15 AM",
    sent: false,
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAjItABikPWn0R0i-1crXNIKse8CouCrg2LdmCnNAdpfAkHUY91qjLT5toy4eFq6KEw3DCZVVxpasOWxNZn2ZdVHgR0CUdr5emStXoF90iQo-YQZ2dp8bVgt9BZ6uMJPIJ6u-h-aOJgA-TjUoSrfkT_sK22UTBV_GkGg6cnOo2PbKMabPIfV1vUg9GsiA8ZFCOu87rB0r_j69xoGI5YbLTF879RM35gDJzlrhUxHshYEUpFCehvbMmOr_H-UhGrLORXVNjo9TXSKAs",
    attachment: {
      name: "TRAINING_PLAN_V2.PDF",
      preview:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCbd8NNCXh9bHPgV1gzK6sYcopRHR3kUBi4Wh3OwsCi03vz0v2kK6PkdwfSjToiR1OWu2OSiwvOKaQjhO06MjBum_F6Yt_Y4Y5gifvg7zftkjh7DZNqy6BclIOzpQQQT51T3gT5F3DV1O7IB2_LCObiyxyGpq19jnPpkBZJvwaYCt49mXJFMIwDVlv2K9S8tzW3m2DFAfCQQFx4GzUeDO-tD-ZCu19FGC0Z8XxpB_Rm_eA2NRLVMQOIIr2wj3XRS2YRf6Km_0mn6Wk",
    },
  },
  {
    id: 4,
    text: "Lịch tập ngày mai lúc 6:00 sáng vẫn như cũ nhé!",
    time: "09:30 AM",
    sent: true,
  },
];

export default function MemberMessagesPage() {
  return (
    <div className="mh-wrap mm-page">
      <div className="mh-head mm-page-head">
        <div className="mm-head-left">
          <span className="mm-sub-label">Trung tâm liên lạc</span>
          <h2 className="mh-title mm-title">Tin nhắn</h2>
          <div className="mh-sub mm-desc">
            Trao đổi với huấn luyện viên, bộ phận hỗ trợ và hệ thống GFMS.
          </div>
        </div>
      </div>

      <div className="mm-layout">
        <aside className="mm-sidebar m-card">
          <div className="mm-sidebar-header">
            <h3 className="mm-sidebar-title">Hội thoại</h3>

            <div className="mm-search-box">
              <span className="material-symbols-outlined mm-search-icon">search</span>
              <input
                type="text"
                className="mm-search-input"
                placeholder="TÌM KIẾM HỘI THOẠI..."
              />
            </div>

            <div className="mm-filter-tabs">
              <button className="mm-tab active">TẤT CẢ</button>
              <button className="mm-tab">HUẤN LUYỆN VIÊN</button>
              <button className="mm-tab">HỖ TRỢ</button>
            </div>
          </div>

          <div className="mm-conversation-list">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`mm-conversation-item ${conv.active ? "active" : ""}`}
              >
                <div className="mm-avatar-container">
                  <img src={conv.avatar} alt={conv.name} className="mm-avatar" />
                  {conv.online && <div className="mm-online-indicator" />}
                </div>

                <div className="mm-conversation-content">
                  <div className="mm-conversation-header">
                    <h4 className="mm-conversation-name">{conv.name}</h4>
                    <span className={`mm-conversation-time ${conv.active ? "active" : ""}`}>
                      {conv.time}
                    </span>
                  </div>
                  <p className="mm-conversation-message">{conv.message}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="mm-chat m-card">
          <header className="mm-chat-header">
            <div className="mm-chat-user">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCijMVjvJJOVgazf-3p3-ajh1wHozc4ZVeoOxMeYvVl3h7oujMeJU2RYP-jjM95Lrtq8ng6pAmVfEUKZWEIUj6zfzWSBw8b0JkdzA2TvgRFjg8sA53W-G4fjtBgOIGcjOife8vX3Ue9DvjLyZuPmrDT7WgZ9QrCYdFUPKEvJcyMWjDf9QyFJKx9RTM4EQAzeYzzXKEGGxyQ_M9nFZU3yQaEVa-ZJBcR5DMf8Tu_tbIG52rDXZFK9OMIbQ9VC4gaYOlJE0Csaem5Zgo"
                alt="PT"
                className="mm-chat-avatar"
              />
              <div>
                <h3 className="mm-chat-name">MINH QUÂN (PT)</h3>
                <div className="mm-chat-status">
                  <span className="mm-status-dot" />
                  <span className="mm-status-text">ĐANG TRỰC TUYẾN</span>
                </div>
              </div>
            </div>

            <div className="mm-chat-actions">
              <button className="mm-action-btn">
                <span className="material-symbols-outlined">call</span>
              </button>
              <button className="mm-action-btn">
                <span className="material-symbols-outlined">videocam</span>
              </button>
              <button className="mm-action-btn">
                <span className="material-symbols-outlined">info</span>
              </button>
            </div>
          </header>

          <div className="mm-message-stream">
            <div className="mm-date-divider">
              <span className="mm-date-label">HÔM NAY</span>
            </div>

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mm-message-wrapper ${msg.sent ? "sent" : "received"}`}
              >
                {!msg.sent && msg.avatar && (
                  <img src={msg.avatar} alt="avatar" className="mm-msg-avatar" />
                )}

                <div className="mm-message-content">
                  <div className="mm-bubble">
                    <p>{msg.text}</p>
                  </div>

                  {msg.attachment && (
                    <div className="mm-attachment">
                      <div className="mm-attachment-preview">
                        <img src={msg.attachment.preview} alt={msg.attachment.name} />
                        <div className="mm-attachment-overlay">
                          <span className="material-symbols-outlined">description</span>
                          <span className="mm-filename">{msg.attachment.name}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mm-meta">
                    <span className="mm-meta-time">{msg.time}</span>
                    {msg.sent && (
                      <span className="material-symbols-outlined mm-status-icon">
                        done_all
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mm-input-area">
            <div className="mm-input-container">
              <button className="mm-tool-btn">
                <span className="material-symbols-outlined">attach_file</span>
              </button>
              <button className="mm-tool-btn">
                <span className="material-symbols-outlined">image</span>
              </button>

              <input
                type="text"
                className="mm-chat-input"
                placeholder="NHẬP TIN NHẮN CỦA BẠN TẠI ĐÂY..."
              />

              <button className="mm-send-btn">
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}