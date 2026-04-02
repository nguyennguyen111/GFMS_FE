// src/components/member/pages/BMICard.jsx
import React, { useMemo, useState } from "react";
import { memberCreateMetric } from "../../../services/memberMetricService";

const calcBMI = (heightCm, weightKg) => {
  const h = Number(heightCm) / 100;
  const w = Number(weightKg);
  if (!h || !w || h <= 0 || w <= 0) return null;
  return +(w / (h * h)).toFixed(2);
};

const bmiStatusVi = (bmi) => {
  if (bmi == null) return "Chưa có dữ liệu";
  if (bmi < 18.5) return "Thiếu cân";
  if (bmi < 25) return "Bình thường";
  if (bmi < 30) return "Thừa cân";
  return "Béo phì";
};

const bmiTone = (bmi) => {
  if (bmi == null) return "neutral";
  if (bmi < 18.5) return "low";
  if (bmi < 25) return "good";
  if (bmi < 30) return "warn";
  return "danger";
};

const fmtDiff = (n) => {
  const v = Number(n || 0);
  if (v === 0) return "0";
  return v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
};

export default function BMICard({ latestMetric, metrics = [], onCreated }) {
  const [form, setForm] = useState({
    heightCm: latestMetric?.heightCm || "",
    weightKg: latestMetric?.weightKg || "",
    note: "",
  });
  const [saving, setSaving] = useState(false);

  const bmi = useMemo(
    () => calcBMI(form.heightCm, form.weightKg),
    [form.heightCm, form.weightKg]
  );

  const displayBMI = bmi || latestMetric?.bmi || null;
  const displayStatus = bmi ? bmiStatusVi(bmi) : latestMetric?.status || "Chưa có dữ liệu";
  const tone = bmiTone(displayBMI);

  const previousMetric = metrics.length > 1 ? metrics[1] : null;

  const weightDiff =
    latestMetric?.weightKg != null && previousMetric?.weightKg != null
      ? Number(latestMetric.weightKg) - Number(previousMetric.weightKg)
      : null;

  const bmiDiff =
    latestMetric?.bmi != null && previousMetric?.bmi != null
      ? Number(latestMetric.bmi) - Number(previousMetric.bmi)
      : null;

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const h = Number(form.heightCm);
    const w = Number(form.weightKg);

    if (!h || !w) {
      alert("Vui lòng nhập đầy đủ chiều cao và cân nặng");
      return false;
    }

    if (h < 50 || h > 260) {
      alert("Chiều cao không hợp lệ");
      return false;
    }

    if (w < 10 || w > 500) {
      alert("Cân nặng không hợp lệ");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await memberCreateMetric({
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
        note: form.note?.trim() || "",
      });

      alert("✅ Đã lưu chỉ số BMI mới");
      onCreated?.();
      setForm((prev) => ({
        ...prev,
        note: "",
      }));
    } catch (e) {
      alert("❌ Không lưu được BMI");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mprof-card bmi-card-modern">
      <div className="mprof-cardHead bmi-head">
        <div>
          <h3>BMI & chỉ số cơ thể</h3>
          <span className="mprof-muted">
            Cập nhật cân nặng và chiều cao để theo dõi tiến trình tập luyện theo thời gian.
          </span>
        </div>

        <div className={`bmi-badge ${tone}`}>{displayStatus}</div>
      </div>

      <div className="bmi-layout">
        <div className="bmi-formPanel">
          <div className="bmi-panelTitle">Nhập chỉ số mới</div>

          <div className="mprof-row2">
            <div className="mprof-field">
              <label className="mprof-label">Chiều cao (cm)</label>
              <input
                type="number"
                min="50"
                max="260"
                className="mprof-input"
                value={form.heightCm}
                onChange={(e) => handleChange("heightCm", e.target.value)}
                placeholder="Ví dụ: 170"
              />
            </div>

            <div className="mprof-field">
              <label className="mprof-label">Cân nặng (kg)</label>
              <input
                type="number"
                min="10"
                max="500"
                step="0.1"
                className="mprof-input"
                value={form.weightKg}
                onChange={(e) => handleChange("weightKg", e.target.value)}
                placeholder="Ví dụ: 65"
              />
            </div>
          </div>

          <div className="mprof-field">
            <label className="mprof-label">Ghi chú</label>
            <input
              className="mprof-input"
              value={form.note}
              onChange={(e) => handleChange("note", e.target.value)}
              placeholder="Ví dụ: sau 2 tuần cardio hoặc bắt đầu siết cân"
            />
          </div>

          <div className="bmi-livePreview">
            <div className="bmi-liveLabel">BMI tạm tính</div>
            <div className="bmi-liveValue">{bmi ?? "--"}</div>
            <div className={`bmi-liveStatus ${bmiTone(bmi)}`}>
              {bmi ? bmiStatusVi(bmi) : "Nhập số liệu để xem kết quả"}
            </div>
          </div>

          <div className="mprof-saveRow bmi-actions">
            <button className="mprof-btn primary bmi-saveBtn" onClick={handleSubmit} disabled={saving}>
              {saving ? "Đang lưu..." : "Tính & lưu BMI"}
            </button>
          </div>

          <div className="bmi-guide">
            <div className="bmi-guideItem">
              <span className="dot low" />
              <span>Thiếu cân: &lt; 18.5</span>
            </div>
            <div className="bmi-guideItem">
              <span className="dot good" />
              <span>Bình thường: 18.5 - 24.9</span>
            </div>
            <div className="bmi-guideItem">
              <span className="dot warn" />
              <span>Thừa cân: 25 - 29.9</span>
            </div>
            <div className="bmi-guideItem">
              <span className="dot danger" />
              <span>Béo phì: ≥ 30</span>
            </div>
          </div>
        </div>

        <div className="bmi-summaryPanel">
          <div className={`bmi-hero ${tone}`}>
            <div className="bmi-heroLabel">BMI hiện tại</div>
            <div className="bmi-heroValue">{displayBMI ?? "--"}</div>
            <div className="bmi-heroText">{displayStatus}</div>
          </div>

          <div className="bmi-statsGrid">
            <div className="bmi-statCard">
              <span>Lần cập nhật gần nhất</span>
              <strong>{latestMetric?.createdAt ? new Date(latestMetric.createdAt).toLocaleDateString("vi-VN") : "—"}</strong>
            </div>

            <div className="bmi-statCard">
              <span>Cân nặng gần nhất</span>
              <strong>{latestMetric?.weightKg ? `${latestMetric.weightKg} kg` : "—"}</strong>
            </div>

            <div className="bmi-statCard">
              <span>Chiều cao</span>
              <strong>{latestMetric?.heightCm ? `${latestMetric.heightCm} cm` : "—"}</strong>
            </div>

            <div className="bmi-statCard">
              <span>Số lần cập nhật</span>
              <strong>{metrics?.length || 0}</strong>
            </div>
          </div>

          <div className="bmi-compareBox">
            <div className="bmi-panelTitle">So sánh với lần trước</div>

            <div className="mprof-infoList">
              <div className="mprof-infoRow">
                <span>Thay đổi cân nặng</span>
                <b>{weightDiff == null ? "—" : `${fmtDiff(weightDiff)} kg`}</b>
              </div>
              <div className="mprof-infoRow">
                <span>Thay đổi BMI</span>
                <b>{bmiDiff == null ? "—" : fmtDiff(bmiDiff)}</b>
              </div>
              <div className="mprof-infoRow">
                <span>Ghi chú gần nhất</span>
                <b>{latestMetric?.note || "—"}</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}