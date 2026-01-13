import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import "../../services/chartSetup"; // IMPORTANT: register chart.js
import { makeLineChartData, makeLineOptions } from "../../services/chartService";
import { getTrainerId } from "./ptStorage";
import "./PTDashboard.css";

const PTDashboard = () => {
  const navigate = useNavigate();
  const ptId = getTrainerId(); // ✅ lấy ptId từ storage (không phụ thuộc params)

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) {
    return (
      <div className="ptd-wrap">
        <div className="ptd-card">
          <h2>Bạn chưa đăng nhập</h2>
          <p>Vui lòng đăng nhập để vào PT Dashboard.</p>
          <button className="ptd-btn" onClick={() => navigate("/login")}>
            Đi tới trang đăng nhập
          </button>
        </div>
      </div>
    );
  }

  // ===== MOCK DATA (nối API sau) =====
  const stats = {
    students: 2,
    packages: 2,
    totalRevenue: 32000000,
    wallet: 32000000,
    rating: 5,
    reviews: 1,
  };

  const students = [{ name: "", email: "" }];

  const weekMini = [
    { day: "Mon", note: "No sessions" },
    { day: "Tue", note: "No sessions" },
    { day: "Wed", note: "No sessions" },
    { day: "Thu", note: "No sessions" },
    { day: "Fri", note: "No sessions" },
    { day: "Sat", note: "No sessions" },
    { day: "Sun", note: "No sessions" },
  ];

  const revenueData = makeLineChartData({
    labels: ["W1", "W2", "W3", "W4"],
    label: "Doanh thu (₫)",
    data: [6000000, 7000000, 8200000, 11000000],
  });

  const revenueOptions = makeLineOptions("Doanh thu theo tuần");

  const displayName = user?.username || user?.fullName || "PT";
  const email = user?.email || "—";

  // ✅ route schedule đúng (nếu chưa có ptId thì đẩy về /pt/profile để nhập)
  const scheduleLink = ptId ? `/pt/${ptId}/schedule` : "/pt/profile";

  return (
    // ✅ BỎ sidebar trong dashboard. Chỉ giữ main content
    <div className="ptd-main2">
      {/* Top bar */}
      <header className="ptd-topbar">
        <div className="ptd-topLeft">
          <div className="ptd-appName">
            <span className="ptd-brandOrange">GFMS</span> Coach
          </div>
        </div>

        <div className="ptd-topRight">
          <button className="ptd-pillBtn">Help</button>
          <div className="ptd-userChip">
            <span className="ptd-userDot" />
            <span className="ptd-userChipName">{displayName}</span>
          </div>

          {/* ✅ Logout vẫn giữ */}
          <button className="ptd-pillBtn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* KPI Row */}
      <section className="ptd-kpiGrid">
        <div className="ptd-kpiCard">
          <div className="ptd-kpiHead">
            <div className="ptd-kpiTitle">Students</div>
            <div className="ptd-kpiIcon">👥</div>
          </div>
          <div className="ptd-kpiValue">{stats.students}</div>
          <div className="ptd-kpiSub">{stats.packages} packages sold</div>
        </div>

        <div className="ptd-kpiCard">
          <div className="ptd-kpiHead">
            <div className="ptd-kpiTitle">My packages</div>
            <div className="ptd-kpiIcon">📦</div>
          </div>
          <div className="ptd-kpiValue">{stats.packages}</div>
          <div className="ptd-kpiSub">Active templates</div>
        </div>

        <div className="ptd-kpiCard">
          <div className="ptd-kpiHead">
            <div className="ptd-kpiTitle">Total revenue</div>
            <div className="ptd-kpiIcon">🪙</div>
          </div>
          <div className="ptd-kpiValue">{stats.totalRevenue.toLocaleString("vi-VN")}đ</div>
          <div className="ptd-kpiSub">From sold packages</div>
        </div>

        <div className="ptd-kpiCard">
          <div className="ptd-kpiHead">
            <div className="ptd-kpiTitle">Wallet balance</div>
            <div className="ptd-kpiIcon">💳</div>
          </div>
          <div className="ptd-kpiValue">{stats.wallet.toLocaleString("vi-VN")}đ</div>
          <div className="ptd-kpiSub">Ready to payout</div>
        </div>
      </section>

      {/* Content Grid */}
      <section className="ptd-contentGrid">
        {/* Left column */}
        <div className="ptd-leftCol">
          <div className="ptd-card2">
            <div className="ptd-card2Head">
              <div className="ptd-card2Title">Weekly Calendar</div>
              <Link className="ptd-link" to={scheduleLink}>
                Open calendar
              </Link>
            </div>

            <div className="ptd-miniWeek">
              {weekMini.map((d) => (
                <div key={d.day} className="ptd-miniDay">
                  <div className="ptd-miniDayName">{d.day}</div>
                  <div className="ptd-miniDaySub">{d.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="ptd-card2">
            <div className="ptd-card2Head">
              <div className="ptd-card2Title">Recent Sessions</div>
              <Link className="ptd-link" to="/pt/sessions">
                View all
              </Link>
            </div>

            <div className="ptd-table">
              <div className="ptd-tableRow ptd-tableHead">
                <div>Student</div>
                <div>Time</div>
                <div>Status</div>
              </div>
              <div className="ptd-tableRow ptd-tableEmpty">
                <div>No sessions yet.</div>
                <div />
                <div />
              </div>
            </div>
          </div>

          <div className="ptd-card2">
            <div className="ptd-card2Head">
              <div className="ptd-card2Title">Revenue chart</div>
              <div className="ptd-muted2">This month</div>
            </div>

            <div className="ptd-chartBox">
              <Line data={revenueData} options={revenueOptions} />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="ptd-rightCol">
          <div className="ptd-card2">
            <div className="ptd-card2Head">
              <div className="ptd-card2Title">Students</div>
              <Link className="ptd-link" to="/pt/clients">
                Manage
              </Link>
            </div>

            {students.map((s) => (
              <div key={s.email || "empty"} className="ptd-studentItem">
                <div className="ptd-avatar" />
                <div className="ptd-studentMeta">
                  <div className="ptd-studentName">{s.name}</div>
                  <div className="ptd-studentEmail">{s.email}</div>
                </div>
                <Link className="ptd-miniBtn" to="/pt/clients">
                  View
                </Link>
              </div>
            ))}
          </div>

          <div className="ptd-card2">
            <div className="ptd-card2Head">
              <div className="ptd-card2Title">Rating</div>
            </div>
            <div className="ptd-ratingRow">
              <div className="ptd-ratingValue">{stats.rating}</div>
              <div className="ptd-star">★</div>
            </div>
            <div className="ptd-muted2">{stats.reviews} reviews</div>
          </div>

          <div className="ptd-card2">
            <div className="ptd-card2Head">
              <div className="ptd-card2Title">Free plan limit</div>
            </div>
            <div className="ptd-planText">
              Bạn đang ở gói <b>Free</b> — quản lý tối đa <b>2</b> học viên. Nâng cấp để không
              giới hạn.
            </div>
            <button className="ptd-upgradeBtn">Upgrade to PT Pro</button>
          </div>

          <div className="ptd-card2 ptd-userFooter">
            <div className="ptd-userFooterName">{displayName}</div>
            <div className="ptd-userFooterEmail">{email}</div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PTDashboard;
