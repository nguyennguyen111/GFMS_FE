// src/components/member/pages/BMICard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { memberCreateMetric } from "../../../services/memberMetricService";
import { showAppToast } from "../../../utils/appToast";

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

export default function BMICard({ latestMetric, metrics = [], onCreated }) {
  const [form, setForm] = useState({
    heightCm: latestMetric?.heightCm || "",
    weightKg: latestMetric?.weightKg || "",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      heightCm: latestMetric?.heightCm || "",
      weightKg: latestMetric?.weightKg || "",
    }));
  }, [latestMetric?.heightCm, latestMetric?.weightKg]);

  const bmi = useMemo(
    () => calcBMI(form.heightCm, form.weightKg),
    [form.heightCm, form.weightKg]
  );

  const displayBMI = bmi || latestMetric?.bmi || null;
  const displayStatus = bmi
    ? bmiStatusVi(bmi)
    : latestMetric?.status || bmiStatusVi(latestMetric?.bmi || null);
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
      setFeedback({
        type: "error",
        message: "Vui lòng nhập đầy đủ chiều cao và cân nặng.",
      });
      return false;
    }

    if (h < 50 || h > 260) {
      setFeedback({
        type: "error",
        message: "Chiều cao không hợp lệ. Hãy nhập từ 50 đến 260 cm.",
      });
      return false;
    }

    if (w < 10 || w > 500) {
      setFeedback({
        type: "error",
        message: "Cân nặng không hợp lệ. Hãy nhập từ 10 đến 500 kg.",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setFeedback({ type: "", message: "" });
    setSaving(true);

    try {
      await memberCreateMetric({
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
        note: form.note?.trim() || "",
      });

      setFeedback({ type: "success", message: "Đã lưu chỉ số BMI mới." });
      showAppToast({
        type: "success",
        title: "BMI",
        message: "Đã lưu chỉ số BMI mới.",
      });

      onCreated?.();

      setForm((prev) => ({
        ...prev,
        note: "",
      }));
    } catch (e) {
      setFeedback({
        type: "error",
        message: e?.response?.data?.EM || e?.message || "Không lưu được BMI.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mprof-card bmi-card-modern">
      <div className="mprof-cardHead bmi-head">
        <div>
          <h3>BMI & chỉ số cơ thể</h3>
        </div>
        <div className={`bmi-badge ${tone}`}>{displayStatus}</div>
      </div>

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

        {feedback.message ? (
          <div className={`m-inline-note ${feedback.type}`}>{feedback.message}</div>
        ) : null}

        <div className="bmi-livePreview">
          <div className="bmi-liveLabel">BMI tạm tính</div>
          <div className="bmi-liveValue">{bmi ?? "--"}</div>
          <div className={`bmi-liveStatus ${bmiTone(bmi)}`}>
            {bmi ? bmiStatusVi(bmi) : "Nhập số liệu để xem kết quả"}
          </div>
        </div>

        {(weightDiff != null || bmiDiff != null) && (
          <div className="bmi-compareRow">
            {weightDiff != null ? (
              <div className="bmi-compareItem">
                <span>Cân nặng gần nhất</span>
                <strong>{weightDiff > 0 ? "+" : ""}{weightDiff.toFixed(1)} kg</strong>
              </div>
            ) : null}

            {bmiDiff != null ? (
              <div className="bmi-compareItem">
                <span>BMI gần nhất</span>
                <strong>{bmiDiff > 0 ? "+" : ""}{bmiDiff.toFixed(2)}</strong>
              </div>
            ) : null}
          </div>
        )}

        <div className="mprof-saveRow bmi-actions">
          <button
            type="button"
            className="mprof-btn primary bmi-saveBtn"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Đang lưu..." : "Tính & lưu BMI"}
          </button>
        </div>
      </div>
    </div>
  );
}