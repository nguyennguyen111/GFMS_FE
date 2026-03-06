import React, { useState, useEffect } from "react";
import { getPTBookings } from "../../services/ptService"; 
import "./PTClients.css"; // Đảm bảo tên file CSS khớp với file bạn vừa tạo

const PTClients = ({ trainerId = "me" }) => { 
  const [bookings, setBookings] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Hàm hỗ trợ định dạng ngày tháng
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN'); 
  };

  useEffect(() => {
    getPTBookings(trainerId)
      .then((data) => {
        setBookings(data); 
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Error fetching student bookings");
        setLoading(false);
      });
  }, [trainerId]);

  if (loading) return <div className="ptp-wrap">Loading...</div>;
  if (error) return <div className="ptp-wrap" style={{color: '#ff5555'}}>{error}</div>;

  return (
    <div className="ptp-wrap">
      <div className="ptp-card">
        <h2>Danh sách lịch học viên</h2>
        
        {bookings && bookings.length > 0 ? (
          <div className="pt-table-container">
            <table className="pt-custom-table">
              <thead>
                <tr>
                  <th>Học viên</th>
                  <th>Thời gian</th>
                  <th>Phòng tập</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((item, index) => (
                  <tr key={item.id || index}>
                    <td>
                      <div className="student-info">
                        <span className="student-name">
                          {item.Member?.User?.username || `HV #${item.memberId}`}
                        </span>
                        <br/>
                        <small>{item.Member?.User?.phone || "Chưa có SĐT"}</small>
                      </div>
                    </td>
                    <td>
                      <div style={{ color: "#eef2ff", fontWeight: "600" }}>
                        {item.startTime?.substring(0, 5)} - {item.endTime?.substring(0, 5)}
                      </div>
                      <small style={{ opacity: 0.6 }}>{formatDate(item.bookingDate)}</small>
                    </td>
                    <td>
                      <span style={{ color: "rgba(238, 242, 255, 0.8)" }}>
                        {item.Gym?.name || "N/A"}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${item.status}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {/* Tạm thời để nút chi tiết hoặc bạn có thể thêm logic Check-in ở đây */}
                      <button className="btn-action">Chi tiết</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ptw-empty">
            <p>Hiện tại chưa có học viên nào đăng ký lịch dạy.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PTClients; 