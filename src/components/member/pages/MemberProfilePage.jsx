import React, { useEffect, useMemo, useState } from "react";
import "./MemberProfilePage.css";
import { memberGetLatestMetric, memberGetMetrics } from "../../../services/memberMetricService";
import {
  memberGetMyProfile,
  memberUpdateMyProfile,
  memberChangeMyPassword,
} from "../../../services/memberProfileService";
import { uploadGymImage } from "../../../services/uploadService";
import { showAppToast } from "../../../utils/appToast";

const safeParse = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const unwrapApi = (res) => {
  const data = res?.data ?? res;
  if (!data) return null;
  if (typeof data === "object" && "EC" in data) {
    return data.EC === 0 ? data.DT ?? null : null;
  }
  return data;
};

const getStoredUser = () => {
  const raw = localStorage.getItem("user");
  const parsed = safeParse(raw);
  return parsed?.user ? parsed.user : parsed || null;
};

const persistStoredUser = (nextUser) => {
  if (!nextUser) return;
  localStorage.setItem("user", JSON.stringify(nextUser));
  if (nextUser.username || nextUser.email) {
    localStorage.setItem("username", nextUser.username || nextUser.email);
  }
  window.dispatchEvent(new Event("authChanged"));
};

const normalizeUser = (u = {}) => ({
  id: u?.id ?? "",
  username: u?.username ?? "",
  email: u?.email ?? "",
  phone: u?.phone ?? "",
  address: u?.address ?? "",
  sex: String(u?.sex || "male").toLowerCase(),
  status: String(u?.status || "active").toLowerCase(),
  emailVerified: !!u?.emailVerified,
  lastLogin: u?.lastLogin || null,
  avatar: u?.avatar || u?.avatarUrl || "",
  memberCode: u?.memberCode || u?.memberId || u?.code || "",
  groupId: u?.groupId ?? 4,
  gym: u?.gym || null,
  currentPackage: u?.currentPackage || null,
  latestMetric: u?.latestMetric || null,
});

const initFormFromUser = (u) => ({
  username: u?.username || "",
  email: u?.email || "",
  phone: u?.phone || "",
  address: u?.address || "",
  sex: u?.sex || "male",
  status: u?.status || "active",
  emailVerified: !!u?.emailVerified,
  lastLogin: u?.lastLogin || null,
  avatar: u?.avatar || "",
  memberCode: u?.memberCode || "",
});

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN");
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("vi-VN");
};

const getRoleText = (role) => {
  const v = String(role || "member").toLowerCase();
  if (v === "admin") return "QUẢN TRỊ";
  if (v === "owner") return "CHỦ GYM";
  if (v === "trainer") return "HUẤN LUYỆN VIÊN";
  return "HỘI VIÊN";
};

const getStatusText = (status) => {
  const v = String(status || "").toLowerCase();
  if (v === "active") return "ĐANG HOẠT ĐỘNG";
  if (v === "inactive") return "CHƯA KÍCH HOẠT";
  if (v === "suspended") return "TẠM NGƯNG";
  return String(status || "—").toUpperCase();
};

const getSexText = (sex) => {
  const v = String(sex || "").toLowerCase();
  if (v === "male") return "Nam";
  if (v === "female") return "Nữ";
  return "Khác";
};


const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
const isValidPhone = (value) => !value || /^(\+84|0)\d{9,10}$/.test(String(value || "").replace(/\s+/g, ""));
const isStrongPassword = (value) => /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(String(value || ""));

const getBMIStatusText = (bmi) => {
  const n = Number(bmi);
  if (!Number.isFinite(n) || n <= 0) return "Chưa có dữ liệu";
  if (n < 18.5) return "Thiếu cân";
  if (n < 25) return "Bình thường";
  if (n < 30) return "Thừa cân";
  return "Béo phì";
};

const buildActivitiesFromMetrics = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [
      {
        icon: "monitor_weight",
        title: "CHƯA CÓ DỮ LIỆU CHỈ SỐ",
        time: "Hãy thêm bản ghi BMI đầu tiên",
      },
    ];
  }

  const sorted = [...rows]
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.recordedAt || b.date || 0) -
        new Date(a.createdAt || a.recordedAt || a.date || 0)
    )
    .slice(0, 3);

  return sorted.map((item) => {
    const bmi = item?.bmi ?? item?.BMI ?? 0;
    const weight = item?.weight ?? item?.weightKg ?? item?.weightKg ?? 0;
    const height = item?.height ?? item?.heightCm ?? item?.heightCm ?? 0;
    const when = item?.createdAt || item?.recordedAt || item?.date || item?.measuredAt;

    return {
      icon: "analytics",
      title: `BMI ${Number(bmi || 0).toFixed(1)} • ${Number(weight || 0).toFixed(1)}KG • ${Number(height || 0)}CM`,
      time: formatDateTime(when),
    };
  });
};

export default function MemberProfilePage() {
  const [tab, setTab] = useState("profile");
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [metrics, setMetrics] = useState([]);
  const [latestMetric, setLatestMetric] = useState(null);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState({ type: "", message: "" });
  const [passwordNotice, setPasswordNotice] = useState({ type: "", message: "" });

  const role = localStorage.getItem("role") || "member";

  const loadProfile = async () => {
    setLoadingProfile(true);
    try {
      const localUser = normalizeUser(getStoredUser() || {});
      let nextUser = localUser;

      try {
        const res = await memberGetMyProfile();
        const apiUser = normalizeUser(unwrapApi(res) || {});
        if (apiUser && (apiUser.id || apiUser.email || apiUser.username)) {
          nextUser = { ...localUser, ...apiUser };
          persistStoredUser(nextUser);
        }
      } catch (e) {
        console.warn("memberGetMyProfile fallback localStorage:", e?.message || e);
      }

      if (!nextUser || (!nextUser.email && !nextUser.username)) {
        setUser(null);
        setForm(null);
      } else {
        setUser(nextUser);
        setForm(initFormFromUser(nextUser));
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const [rows, latest] = await Promise.all([memberGetMetrics(), memberGetLatestMetric()]);
      setMetrics(Array.isArray(rows) ? rows : []);
      setLatestMetric(latest || null);
    } catch (e) {
      console.error("loadMetrics error:", e);
      setMetrics([]);
      setLatestMetric(null);
    }
  };

  useEffect(() => {
    loadProfile();
    loadMetrics();
  }, []);

  const displayName = useMemo(() => form?.username || user?.username || "HỘI VIÊN", [form, user]);

  const initials = useMemo(() => {
    const t = String(displayName || "").trim();
    if (!t) return "M";
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0] || ""}${words[words.length - 1][0] || ""}`.toUpperCase();
    }
    return t.slice(0, 1).toUpperCase();
  }, [displayName]);

  const activityItems = useMemo(() => buildActivitiesFromMetrics(metrics), [metrics]);

  const metricCards = useMemo(() => {
    const latestBmi = Number(latestMetric?.bmi ?? latestMetric?.BMI ?? user?.latestMetric?.bmi ?? 0);
    const latestWeight = Number(latestMetric?.weightKg ?? latestMetric?.weight ?? user?.latestMetric?.weightKg ?? 0);
    const latestHeight = Number(latestMetric?.heightCm ?? latestMetric?.height ?? user?.latestMetric?.heightCm ?? 0);

    return [
      {
        value: metrics.length || 0,
        label: "SỐ BẢN GHI CHỈ SỐ",
      },
      {
        value: latestBmi > 0 ? latestBmi.toFixed(1) : "—",
        label: "BMI GẦN NHẤT",
      },
      {
        value: latestWeight > 0 ? `${latestWeight.toFixed(1)} KG` : "—",
        label: "CÂN NẶNG HIỆN TẠI",
      },
      {
        value: latestHeight > 0 ? `${latestHeight} CM` : "—",
        label: "CHIỀU CAO HIỆN TẠI",
      },
    ];
  }, [metrics, latestMetric, user]);

  const membershipData = useMemo(() => {
    const bmi = Number(latestMetric?.bmi ?? latestMetric?.BMI ?? user?.latestMetric?.bmi ?? 0);
    const currentPackage = user?.currentPackage || null;

    return {
      status: getStatusText(form?.status || user?.status),
      nextPayment: currentPackage?.expiryDate
        ? formatDate(currentPackage.expiryDate)
        : latestMetric?.createdAt
          ? formatDate(latestMetric.createdAt)
          : latestMetric?.recordedAt
            ? formatDate(latestMetric.recordedAt)
            : user?.lastLogin
              ? formatDate(user.lastLogin)
              : "—",
      planName: currentPackage?.packageName
        ? `${currentPackage.packageName}`.toUpperCase()
        : bmi > 0
          ? `THỂ TRẠNG: ${getBMIStatusText(bmi).toUpperCase()}`
          : "CHƯA CÓ DỮ LIỆU SỨC KHỎE",
      progress: currentPackage?.totalSessions
        ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((Number(currentPackage.totalSessions) - Number(currentPackage.sessionsRemaining || 0)) /
                Number(currentPackage.totalSessions)) *
              100
            )
          )
        )
        : bmi > 0
          ? Math.max(18, Math.min(100, Math.round((bmi / 30) * 100)))
          : 24,
    };
  }, [latestMetric, form, user]);

  const handlePickAvatar = async (file) => {
    if (!file) return;
    const validType = ["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type);
    if (!validType) {
      setProfileNotice({ type: "error", message: "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileNotice({ type: "error", message: "Ảnh đại diện tối đa 5MB." });
      return;
    }
    const url = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, avatar: url, _avatarFile: file }));
  };

  const handleCancelEdit = () => {
    setForm(initFormFromUser(user));
    setEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!form) return;

    if (!form.username.trim()) {
      setProfileNotice({ type: "error", message: "Vui lòng nhập họ và tên hoặc username." });
      return;
    }

    if (!form.email.trim()) {
      setProfileNotice({ type: "error", message: "Vui lòng nhập email." });
      return;
    }

    if (!isValidEmail(form.email)) {
      setProfileNotice({ type: "error", message: "Email không đúng định dạng." });
      return;
    }

    if (!isValidPhone(form.phone)) {
      setProfileNotice({ type: "error", message: "Số điện thoại không hợp lệ. Hãy nhập số Việt Nam đúng định dạng." });
      return;
    }

    if (String(form.username).trim().length < 2) {
      setProfileNotice({ type: "error", message: "Tên hiển thị phải có ít nhất 2 ký tự." });
      return;
    }

    if (String(form.address || "").trim().length > 255) {
      setProfileNotice({ type: "error", message: "Địa chỉ tối đa 255 ký tự." });
      return;
    }

    setProfileNotice({ type: "", message: "" });
    setSaving(true);
    try {
      let avatarUrl = form.avatar || "";

      if (form._avatarFile) {
        const uploadJson = await uploadGymImage(form._avatarFile);
        avatarUrl = uploadJson?.url || avatarUrl;
      }

      const payload = {
        username: form.username?.trim(),
        email: form.email?.trim(),
        phone: form.phone?.trim(),
        address: form.address?.trim(),
        sex: form.sex,
        avatar: avatarUrl,
      };

      let nextUser = { ...(user || {}), ...form, avatar: avatarUrl };

      const res = await memberUpdateMyProfile(payload);
      const updated = normalizeUser(unwrapApi(res) || payload);
      nextUser = { ...(user || {}), ...form, ...updated, avatar: updated.avatar || avatarUrl };

      persistStoredUser(nextUser);
      setUser(nextUser);
      setForm(initFormFromUser(nextUser));
      setEditing(false);
      setProfileNotice({ type: "success", message: "Đã cập nhật thông tin thành công." });
      showAppToast({ type: "success", title: "Hồ sơ", message: "Đã cập nhật thông tin thành công." });
    } catch (e) {
      console.error(e);
      const message = e?.response?.data?.EM || e?.message || "Không thể cập nhật thông tin. Vui lòng thử lại.";
      setPasswordNotice({ type: "error", message });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pw.current || !pw.next || !pw.confirm) {
      setPasswordNotice({ type: "error", message: "Vui lòng nhập đầy đủ thông tin mật khẩu." });
      return;
    }

    if (!isStrongPassword(pw.next)) {
      setPasswordNotice({ type: "error", message: "Mật khẩu mới phải từ 8 ký tự, có ít nhất 1 chữ cái và 1 số." });
      return;
    }

    if (pw.next !== pw.confirm) {
      setPasswordNotice({ type: "error", message: "Mật khẩu xác nhận không khớp." });
      return;
    }

    if (pw.current === pw.next) {
      setPasswordNotice({ type: "error", message: "Mật khẩu mới không được trùng mật khẩu hiện tại." });
      return;
    }

    setPasswordNotice({ type: "", message: "" });
    setPwSaving(true);
    try {
      const res = await memberChangeMyPassword({
        currentPassword: pw.current,
        newPassword: pw.next,
        confirmPassword: pw.confirm,
      });

      const data = res?.data ?? res;
      if (data?.EC !== 0) {
        throw new Error(data?.EM || "Đổi mật khẩu thất bại");
      }

      setPw({ current: "", next: "", confirm: "" });
      setPasswordNotice({ type: "success", message: "Đổi mật khẩu thành công." });
      showAppToast({ type: "success", title: "Mật khẩu", message: "Đổi mật khẩu thành công." });
      setTab("profile");
    } catch (e) {
      console.error(e);
      const message =
        e?.response?.data?.EM ||
        e?.message ||
        "Backend của bạn chưa có endpoint đổi mật khẩu hoặc dữ liệu chưa đúng.";
      setPasswordNotice({ type: "error", message });
    } finally {
      setPwSaving(false);
    }
  };

  if (loadingProfile) {
    return <div className="mprof-empty">Đang tải hồ sơ hội viên...</div>;
  }

  if (!user || !form) {
    return <div className="mprof-empty">Không có dữ liệu người dùng</div>;
  }

  return (
    <div className="mprof-page">
      <div className="mprof-header">
        <span className="mprof-eyebrow">HỒ SƠ THÀNH VIÊN</span>
        <h1 className="mprof-pageTitle">
          QUẢN LÝ <span>TÀI KHOẢN</span>
        </h1>
        <p className="mprof-pageSub">
          Theo dõi hồ sơ cá nhân, cập nhật thông tin tài khoản và quản lý chỉ số sức khỏe tại GFMS.
        </p>
      </div>

      <div className="mprof-hero">
        <div className="mprof-avatarSection">
          <div className="mprof-avatarWrap">
            {form.avatar ? (
              <img className="mprof-avatarImg" src={form.avatar} alt="avatar" />
            ) : (
              <div className="mprof-avatarFallback">{initials}</div>
            )}
          </div>

          <label className={`mprof-avatarEdit ${editing ? "" : "disabled"}`}>
            <input
              type="file"
              accept="image/*"
              disabled={!editing}
              onChange={(e) => handlePickAvatar(e.target.files?.[0])}
            />
            <span className="material-symbols-outlined">edit</span>
          </label>
        </div>

        <div className="mprof-heroInfo">
          <div className="mprof-nameRow">
            <div className="mprof-name">{displayName}</div>
            <span className={`mprof-role ${String(role).toLowerCase()}`}>{getRoleText(role)}</span>
          </div>

          <div className="mprof-meta">
            <span>{form.email || "—"}</span>
            <span>{form.phone || "—"}</span>
            <span>{form.memberCode || user.memberCode || "MEMBER"}</span>
            {user?.gym?.name ? <span>{user.gym.name}</span> : null}
          </div>

          <div className="mprof-badges">
            <span className={`mprof-badge ${String(form.status).toLowerCase()}`}>
              {getStatusText(form.status)}
            </span>
            <span className={`mprof-badge ${form.emailVerified ? "ok" : "warn"}`}>
              {form.emailVerified ? "EMAIL ĐÃ XÁC THỰC" : "EMAIL CHƯA XÁC THỰC"}
            </span>
          </div>
        </div>

        <div className="mprof-heroActions">
          <button
            className="mprof-btn ghost"
            onClick={() => {
              setEditing((prev) => !prev);
              setTab("profile");
              if (editing) {
                setForm(initFormFromUser(user));
              }
            }}
          >
            {editing ? "HUỶ CHỈNH SỬA" : "CHỈNH SỬA HỒ SƠ"}
          </button>

          <button className="mprof-btn primary" onClick={() => setTab("password")}>
            ĐỔI MẬT KHẨU
          </button>
        </div>
      </div>

      <div className="mprof-tabs">
        <button
          className={`mprof-tab ${tab === "profile" ? "active" : ""}`}
          onClick={() => setTab("profile")}
        >
          THÔNG TIN CÁ NHÂN
        </button>

        <button
          className={`mprof-tab ${tab === "password" ? "active" : ""}`}
          onClick={() => setTab("password")}
        >
          BẢO MẬT
        </button>

      </div>

      {tab === "profile" && (
        <>
          <div className="mprof-bento">
            <section className="mprof-card mprof-card-main">
              <div className="mprof-cardHead">
                <label className="mprof-cardLabel">THÔNG TIN CÁ NHÂN</label>
                <h3 className="mprof-cardTitle">HỒ SƠ THÀNH VIÊN</h3>
              </div>

              <div className="mprof-form">
                {profileNotice.message ? <div className={`m-inline-note ${profileNotice.type}`}>{profileNotice.message}</div> : null}
                <div className="mprof-row2">
                  <Field
                    label="HỌ VÀ TÊN"
                    value={form.username}
                    readOnly={!editing}
                    onChange={(v) => setForm((p) => ({ ...p, username: v }))}
                  />
                  <Field
                    label="EMAIL"
                    value={form.email}
                    readOnly={!editing}
                    onChange={(v) => setForm((p) => ({ ...p, email: v }))}
                  />
                </div>

                <div className="mprof-row2">
                  <Field
                    label="SỐ ĐIỆN THOẠI"
                    value={form.phone}
                    readOnly={!editing}
                    onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
                  />
                  <Select
                    label="GIỚI TÍNH"
                    value={form.sex}
                    disabled={!editing}
                    onChange={(v) => setForm((p) => ({ ...p, sex: v }))}
                    options={[
                      { value: "male", label: "Nam" },
                      { value: "female", label: "Nữ" },
                      { value: "other", label: "Khác" },
                    ]}
                  />
                </div>

                <Textarea
                  label="ĐỊA CHỈ"
                  value={form.address}
                  readOnly={!editing}
                  onChange={(v) => setForm((p) => ({ ...p, address: v }))}
                />

                <div className="mprof-uploadBox">
                  <div className="mprof-uploadPreview">
                    {form.avatar ? (
                      <img src={form.avatar} alt="avatar preview" />
                    ) : (
                      <div className="mprof-uploadFallback">{initials}</div>
                    )}
                  </div>

                  <div className="mprof-uploadInfo">
                    <div className="mprof-uploadTitle">ẢNH ĐẠI DIỆN</div>
                    <div className="mprof-uploadText">PNG, JPG, WEBP • upload cloudinary</div>
                    <label className={`mprof-uploadBtn ${editing ? "" : "disabled"}`}>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={!editing}
                        onChange={(e) => handlePickAvatar(e.target.files?.[0])}
                      />
                      CHỌN ẢNH
                    </label>
                  </div>
                </div>

                <div className="mprof-saveRow">
                  <button
                    className="mprof-btn ghost"
                    disabled={!editing || saving}
                    onClick={handleCancelEdit}
                  >
                    HUỶ
                  </button>

                  <button
                    className="mprof-btn primary"
                    disabled={!editing || saving}
                    onClick={handleSaveProfile}
                  >
                    {saving ? "ĐANG LƯU..." : "CẬP NHẬT THÔNG TIN"}
                  </button>
                </div>
              </div>
            </section>

            <section className="mprof-statusCard">
              <div className="mprof-statusHeader">
                <label className="mprof-statusLabel">TRẠNG THÁI TÀI KHOẢN</label>
                <h2 className="mprof-statusTitle">{getStatusText(form.status)}</h2>
              </div>

              <div className="mprof-statusFooter">
                <div className="mprof-statusInfo">
                  <span className="mprof-statusInfoLabel">CẬP NHẬT / HẾT HẠN</span>
                  <span className="mprof-statusInfoValue">{membershipData.nextPayment}</span>
                </div>

                <div className="mprof-progressTrack">
                  <div className="mprof-progressBar" style={{ width: `${membershipData.progress}%` }} />
                </div>

                <p className="mprof-planName">{membershipData.planName}</p>
              </div>
            </section>

            <section className="mprof-activityCard">
              <div className="mprof-activityHead">
                <label className="mprof-cardLabel">HOẠT ĐỘNG GẦN ĐÂY</label>
                <span className="material-symbols-outlined mprof-analyticsIcon">analytics</span>
              </div>

              <div className="mprof-activityList">
                {activityItems.map((activity, index) => (
                  <div className="mprof-activityItem" key={`${activity.title}-${index}`}>
                    <div className="mprof-activityIconWrap">
                      <span className="material-symbols-outlined">{activity.icon}</span>
                    </div>

                    <div className="mprof-activityDetails">
                      <p className="mprof-activityTitle">{activity.title}</p>
                      <p className="mprof-activityTime">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mprof-systemCard">
              <div className="mprof-cardHead">
                <label className="mprof-cardLabel">THÔNG TIN HỆ THỐNG</label>
                <h3 className="mprof-cardTitle">TRẠNG THÁI HỒ SƠ</h3>
              </div>

              <div className="mprof-infoList">
                <Info label="VAI TRÒ" value={getRoleText(role)} />
                <Info label="TRẠNG THÁI" value={getStatusText(form.status)} />
                <Info label="GIỚI TÍNH" value={getSexText(form.sex)} />
                <Info label="EMAIL VERIFIED" value={form.emailVerified ? "YES" : "NO"} />
                <Info label="LẦN ĐĂNG NHẬP CUỐI" value={formatDateTime(form.lastLogin)} />
                <Info label="GYM HIỆN TẠI" value={user?.gym?.name || "—"} />
                <Info label="MÃ HỘI VIÊN" value={form.memberCode || "—"} />
              </div>

              <div className="mprof-note">
                * Trang này đã ưu tiên lấy dữ liệu từ API profile member.
              </div>
            </section>
          </div>

          <div className="mprof-metricsGrid">
            {metricCards.map((item, index) => (
              <div key={index} className="mprof-metricCard">
                <p className="mprof-metricValue">{item.value}</p>
                <p className="mprof-metricLabel">{item.label}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "password" && (
        <div className="mprof-singleGrid">
          <section className="mprof-securityCard">
            <div className="mprof-cardHead">
              <label className="mprof-cardLabel">BẢO MẬT & MẬT KHẨU</label>
              <h3 className="mprof-cardTitle">THAY ĐỔI MẬT KHẨU</h3>
            </div>

            {passwordNotice.message ? <div className={`m-inline-note ${passwordNotice.type}`}>{passwordNotice.message}</div> : null}

            <div className="mprof-securityForm">
              <div className="mprof-field full">
                <div className="mprof-label">MẬT KHẨU HIỆN TẠI</div>
                <input
                  className="mprof-input"
                  type="password"
                  placeholder="••••••••"
                  value={pw.current}
                  onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                />
              </div>

              <div className="mprof-field">
                <div className="mprof-label">MẬT KHẨU MỚI</div>
                <input
                  className="mprof-input"
                  type="password"
                  placeholder="••••••••"
                  value={pw.next}
                  onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                />
              </div>

              <div className="mprof-field">
                <div className="mprof-label">XÁC NHẬN MẬT KHẨU</div>
                <input
                  className="mprof-input"
                  type="password"
                  placeholder="••••••••"
                  value={pw.confirm}
                  onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                />
              </div>
            </div>

            <div className="mprof-saveRow end">
              <button className="mprof-btn ghost" onClick={() => setTab("profile")} disabled={pwSaving}>
                QUAY LẠI
              </button>

              <button className="mprof-btn primary" onClick={handleChangePassword} disabled={pwSaving}>
                {pwSaving ? "ĐANG CẬP NHẬT..." : "CẬP NHẬT MẬT KHẨU"}
              </button>
            </div>

            <div className="mprof-note">
              * Phần đổi mật khẩu đã nối API backend thật.
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, readOnly, onChange }) {
  return (
    <div className="mprof-field">
      <div className="mprof-label">{label}</div>
      <input
        className="mprof-input"
        value={value || ""}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Textarea({ label, value, readOnly, onChange }) {
  return (
    <div className="mprof-field">
      <div className="mprof-label">{label}</div>
      <textarea
        className="mprof-textarea"
        value={value || ""}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
      />
    </div>
  );
}

function Select({ label, value, disabled, onChange, options }) {
  return (
    <div className="mprof-field">
      <div className="mprof-label">{label}</div>
      <select
        className="mprof-input"
        value={value || "male"}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="mprof-infoRow">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}