import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  memberGetCurrentMembershipCard,
  memberGetMembershipCardPlans,
  memberPurchaseMembershipCard,
} from "../../../services/membershipCardService";
import { mpGetGymDetail, mpGetGyms } from "../../../services/marketplaceService";
import "./MemberMembershipCardPage.css";

const fmtVnd = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;

export default function MemberMembershipCardPage() {
  const [searchParams] = useSearchParams();
  const initialGymId = Number(searchParams.get("gymId") || 0) || null;
  const [plans, setPlans] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const [gymId, setGymId] = useState(initialGymId);
  const [selectedGym, setSelectedGym] = useState(null);
  const [gymOptions, setGymOptions] = useState([]);
  const [planMonths, setPlanMonths] = useState(1);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [planRes, cardRes, gymsRes] = await Promise.all([
          memberGetMembershipCardPlans({ gymId: initialGymId || undefined }),
          memberGetCurrentMembershipCard({ gymId: initialGymId || undefined }),
          mpGetGyms({ page: 1, limit: 100 }),
        ]);
        setPlans(Array.isArray(planRes?.data?.data) ? planRes.data.data : []);
        setCurrentCard(cardRes?.data?.data || null);
        const gyms =
          gymsRes?.data?.DT?.items && Array.isArray(gymsRes.data.DT.items)
            ? gymsRes.data.DT.items
            : Array.isArray(gymsRes?.data?.DT)
              ? gymsRes.data.DT
              : [];
        setGymOptions(gyms);
      } catch (e) {
        setNotice(e?.response?.data?.message || "Không tải được dữ liệu thẻ thành viên.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!gymId) {
      setSelectedGym(null);
      setPlans([]);
      return;
    }
    let mounted = true;
    Promise.all([
      mpGetGymDetail(gymId),
      memberGetMembershipCardPlans({ gymId }),
      memberGetCurrentMembershipCard({ gymId }),
    ])
      .then(([gymRes, plansRes, cardRes]) => {
        if (!mounted) return;
        setSelectedGym(gymRes?.data?.DT || null);
        const nextPlans = Array.isArray(plansRes?.data?.data) ? plansRes.data.data : [];
        setPlans(nextPlans);
        setCurrentCard(cardRes?.data?.data || null);
        if (nextPlans.length > 0) {
          setPlanMonths(Number(nextPlans[0].months));
        }
      })
      .catch(() => {
        if (mounted) {
          setSelectedGym(null);
          setPlans([]);
        }
      });
    return () => {
      mounted = false;
    };
  }, [gymId]);

  const selectedPlan = useMemo(
    () => plans.find((p) => Number(p.months) === Number(planMonths)) || null,
    [plans, planMonths]
  );

  const handleBuy = async () => {
    if (!gymId) {
      setNotice("Vui lòng chọn phòng gym trước khi mua thẻ.");
      return;
    }
    if (!selectedPlan) {
      setNotice("Vui lòng chọn loại thẻ.");
      return;
    }
    setBuying(true);
    setNotice("");
    try {
      const res = await memberPurchaseMembershipCard({
        gymId: Number(gymId),
        planId: selectedPlan.id,
        paymentMethod: "payos",
      });
      const data = res?.data?.data || null;
      if (data?.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
      setNotice("Mua thẻ thành công.");
      navigate("/member/profile");
    } catch (e) {
      setNotice(e?.response?.data?.message || "Mua thẻ thất bại.");
    } finally {
      setBuying(false);
    }
  };

  if (loading) return <div className="mmc-loading">Đang tải thẻ thành viên...</div>;

  return (
    <div className="mmc-page">
      <div className="mmc-container">
        <div className="mmc-header">
          <h2>Mua thẻ thành viên</h2>
          <p>Chọn thẻ 1/2/3 tháng để sử dụng dịch vụ phòng gym.</p>
        </div>

        {currentCard ? (
          <div className="mmc-current-card">
            <strong>Thẻ hiện tại:</strong> {currentCard.planMonths} tháng - hết hạn{" "}
            {new Date(currentCard.endDate).toLocaleDateString("vi-VN")}
          </div>
        ) : (
          <div className="mmc-current-empty">Bạn chưa có thẻ đang hoạt động.</div>
        )}

        <div className="mmc-gym-card">
          <div className="mmc-gym-label">Phòng gym áp dụng</div>
          <select
            className="mmc-gym-select"
            value={gymId || ""}
            onChange={(e) => setGymId(Number(e.target.value) || null)}
          >
            <option value="">-- Chọn phòng gym --</option>
            {gymOptions.map((gym) => (
              <option key={gym.id} value={gym.id}>
                {gym.name}
              </option>
            ))}
          </select>
          {selectedGym ? (
            <div className="mmc-gym-info">
              <div className="mmc-gym-name">{selectedGym.name}</div>
              <div className="mmc-gym-address">{selectedGym.address || "Chưa cập nhật địa chỉ"}</div>
            </div>
          ) : null}
        </div>

        <div className="mmc-plan-grid">
          {plans.map((plan) => (
            <button
              key={plan.code}
              onClick={() => setPlanMonths(Number(plan.months))}
              className={`mmc-plan-btn ${Number(planMonths) === Number(plan.months) ? "active" : ""}`}
            >
              {plan.imageUrl ? <img className="mmc-plan-image" src={plan.imageUrl} alt={plan.label} /> : null}
              <div className="mmc-plan-title">{plan.label}</div>
              <div className="mmc-plan-price">{fmtVnd(plan.price)}</div>
              <div className="mmc-plan-note">Sử dụng toàn bộ tiện ích trong gym</div>
            </button>
          ))}
        </div>

        <div className="mmc-footer">
          <button onClick={handleBuy} disabled={buying || !gymId} className="mmc-buy-btn">
            {buying ? "Đang tạo thanh toán..." : `Mua ${selectedPlan?.label || "thẻ thành viên"}`}
          </button>
        </div>

        {notice ? <div className="mmc-notice">{notice}</div> : null}
      </div>
    </div>
  );
}
