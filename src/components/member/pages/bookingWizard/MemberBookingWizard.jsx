import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import Stepper from "./Stepper";

import Step1SelectPackage from "./Step1SelectPackage";
import Step2PickTrainer from "./Step2PickTrainer";
import Step3FixedSchedule from "./Step3FixedSchedule";
import Step4StartDate from "./Step4StartDate";
import Step5PreviewConfirm from "./Step5PreviewConfirm";

import {
  mpGetGymDetail,
  mpGetPackages,
  mpGetTrainers,
} from "../../../../services/marketplaceService";

import "./bookingWizard.css";

const STEPS = [
  "Chọn gói",
  "Chọn PT",
  "Lịch cố định",
  "Ngày bắt đầu",
  "Xác nhận",
];

export default function MemberBookingWizard() {
  const [sp] = useSearchParams();
  const gymId = sp.get("gymId");
  const preselectedPackageId = Number(sp.get("packageId")) || null;
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [gym, setGym] = useState(null);
  const [packages, setPackages] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [pkg, setPkg] = useState(null);
  const [trainer, setTrainer] = useState(null);
  const [pattern, setPattern] = useState([]);
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    if (!gymId) {
      setErr("Thiếu gymId");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const [gRes, pRes, tRes] = await Promise.all([
          mpGetGymDetail(gymId),
          mpGetPackages({ gymId }),
          mpGetTrainers({ gymId }),
        ]);

        const gymData = gRes?.data?.DT || null;
        const packageData = Array.isArray(pRes?.data?.DT?.items)
          ? pRes.data.DT.items
          : Array.isArray(pRes?.data?.DT)
          ? pRes.data.DT
          : [];
        const trainerData = Array.isArray(tRes?.data?.DT?.items)
          ? tRes.data.DT.items
          : Array.isArray(tRes?.data?.DT)
          ? tRes.data.DT
          : [];

        setGym(gymData);
        setPackages(packageData);
        setTrainers(trainerData);

        if (preselectedPackageId) {
          const foundPkg = packageData.find(
            (p) => Number(p.id) === Number(preselectedPackageId)
          );

          if (!foundPkg) {
            setErr("Gói tập không tồn tại trong gym này.");
            return;
          }

          setPkg(foundPkg);
          setStep(1);
        } else {
          setStep(0);
        }
      } catch (e) {
        setErr(
          e?.response?.data?.EM ||
            e?.response?.data?.message ||
            "Không tải được dữ liệu"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [gymId, preselectedPackageId]);

  const matchedTrainers = useMemo(() => {
    if (!pkg) return trainers;

    const type = String(pkg.type || "").trim().toLowerCase();
    if (!type || type === "basic") return trainers;

    return trainers.filter((t) => {
      const specs = String(t.specialization || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      return specs.includes(type);
    });
  }, [trainers, pkg]);

  const canNext = (s) => {
    if (s === 0) return !!pkg;
    if (s === 1) return !!trainer;
    if (s === 2) return Array.isArray(pattern) && pattern.length > 0;
    if (s === 3) return !!startDate;
    return true;
  };

  if (loading) {
    return (
      <div className="bw-page bw-center">
        <div className="bw-stateCard">
          <div className="bw-stateText">Đang tải dữ liệu đặt lịch…</div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="bw-page bw-center">
        <div className="bw-stateCard bw-stateCardError">
          <div className="bw-stateText bw-stateError">{err}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bw-page">
      <div className="bw-pageGlow bw-pageGlow--1" />
      <div className="bw-pageGlow bw-pageGlow--2" />

      <div className="bw-container">
        <header className="bw-hero">
          <div className="bw-heroContent">
            <h1 className="bw-title">Đặt lịch tại hệ thống</h1>
            <p className="bw-subtitle">
              Hoàn tất 5 bước đơn giản để bắt đầu hành trình tập luyện của bạn.
            </p>

            <div className="bw-heroMeta">
              {gym?.name && (
                <div className="bw-infoPill">
                  <MapPin size={16} />
                  <span>{gym.name}</span>
                </div>
              )}

              {pkg?.name && preselectedPackageId ? (
                <div className="bw-infoPill bw-infoPill--accent">
                  <span>Gói chọn sẵn:</span>
                  <b>{pkg.name}</b>
                </div>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="bw-btn bw-btnGhost bw-btnBack"
          >
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </button>
        </header>

        <div className="bw-shell">
          <Stepper steps={STEPS} current={step} />

          <div className="bw-card">
            {step === 0 && !preselectedPackageId && (
              <Step1SelectPackage
                packages={packages}
                value={pkg?.id || null}
                onPick={(p) => {
                  setPkg(p);
                  setTrainer(null);
                  setPattern([]);
                  setStartDate("");
                }}
                onNext={() => canNext(0) && setStep(1)}
              />
            )}

            {step === 1 && (
              <Step2PickTrainer
                trainers={matchedTrainers}
                value={trainer?.id || null}
                onPick={(t) => {
                  setTrainer(t);
                  setPattern([]);
                  setStartDate("");
                }}
                onBack={() => {
                  if (preselectedPackageId) navigate(-1);
                  else setStep(0);
                }}
                onNext={() => canNext(1) && setStep(2)}
              />
            )}

            {step === 2 && (
              <Step3FixedSchedule
                pattern={pattern}
                setPattern={(val) => {
                  setPattern(val);
                  setStartDate("");
                }}
                onBack={() => setStep(1)}
                onNext={() => canNext(2) && setStep(3)}
              />
            )}

            {step === 3 && (
              <Step4StartDate
                pattern={pattern}
                value={startDate}
                onPick={setStartDate}
                onBack={() => setStep(2)}
                onNext={() => canNext(3) && setStep(4)}
              />
            )}

            {step === 4 && (
              <Step5PreviewConfirm
                gym={gym}
                pkg={pkg}
                trainer={trainer}
                pattern={pattern}
                startDate={startDate}
                onBack={() => setStep(3)}
                onDone={() => navigate("/member/bookings")}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}