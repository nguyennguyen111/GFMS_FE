import React, { useMemo, useState, useEffect } from "react";
import { connectSocket } from "../../services/socketClient";
import { getPTBookings, invalidatePTServiceCache } from "../../services/ptService";
import "./PTClients.css";

const AVATAR_PLACEHOLDER = "https://placehold.co/96x96/101317/D6FF00?text=GFMS";

const isUsableAvatarUrl = (url) => {
  const s = String(url || "").trim();
  if (!s) return false;
  if (/default-avatar\.png$/i.test(s)) return false;
  return /^https?:\/\//i.test(s) || s.startsWith("data:image/");
};

const pickMemberAvatar = (memberLike) => {
  const direct = memberLike?.avatar;
  const nested = memberLike?.User?.avatar;
  if (isUsableAvatarUrl(direct)) return String(direct).trim();
  if (isUsableAvatarUrl(nested)) return String(nested).trim();
  return "";
};

const bookingStatusVi = (raw) => {
  const s = String(raw || "").toLowerCase();
  const map = {
    pending: "Chờ xử lý",
    confirmed: "Đã xác nhận",
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
    absent: "Vắng",
    present: "Có mặt",
    in_progress: "Đang diễn ra",
    no_show: "Vắng (no-show)",
  };
  return map[s] || raw || "—";
};

const normalizeBookingsPayload = (data) => {
  if (Array.isArray(data)) return data;
  if (data?.DT && Array.isArray(data.DT)) return data.DT;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.bookings && Array.isArray(data.bookings)) return data.bookings;
  return [];
};

const sessionsLeftFromActivation = (act) => {
  if (!act) return null;
  if (act.sessionsRemaining != null && act.sessionsRemaining !== "") {
    const n = Number(act.sessionsRemaining);
    return Number.isFinite(n) ? n : null;
  }
  const total = Number(act.totalSessions);
  const used = Number(act.sessionsUsed ?? 0);
  if (Number.isFinite(total)) return Math.max(0, total - (Number.isFinite(used) ? used : 0));
  return null;
};

const groupKeyForBooking = (b) => {
  const midRaw = b.memberId ?? b.Member?.id;
  if (midRaw == null || midRaw === "") return null;
  const mid = String(midRaw);
  const paId = b.packageActivationId ?? b.PackageActivation?.id ?? null;
  if (paId != null && paId !== "") {
    return { key: `act|${mid}|${String(paId)}`, mid, paId: String(paId), mode: "activation" };
  }
  const pkgId = b.packageId ?? b.Package?.id ?? null;
  if (pkgId != null && pkgId !== "") {
    return { key: `pkg|${mid}|${String(pkgId)}`, mid, paId: null, pkgId: String(pkgId), mode: "package" };
  }
  return { key: `orph|${mid}`, mid, paId: null, pkgId: null, mode: "orphan" };
};

const sortBookingsDesc = (list) =>
  [...list].sort((a, b) => {
    const da = new Date(a.bookingDate || a.createdAt || 0).getTime();
    const db = new Date(b.bookingDate || b.createdAt || 0).getTime();
    return db - da;
  });

const buildPackageSlice = (packageKey, sortedBookings) => {
  const sample = sortedBookings[0];
  const act = sample.PackageActivation || sample.packageActivation;
  const pkg = sample.Package || sample.package;
  const gymNames = [...new Set(sortedBookings.map((x) => x.Gym?.name).filter(Boolean))];
  const completedCount = sortedBookings.filter(
    (b) => String(b.status || "").toLowerCase() === "completed"
  ).length;
  const totalSessions = Number(act?.totalSessions ?? pkg?.sessions ?? 0) || 0;
  let sessionsRemaining = null;
  if (totalSessions > 0) {
    sessionsRemaining = Math.max(0, totalSessions - completedCount);
  } else {
    const fromAct = sessionsLeftFromActivation(act);
    sessionsRemaining =
      fromAct != null && Number.isFinite(fromAct) ? fromAct : null;
  }

  return {
    packageKey,
    branchLabel: gymNames.length ? gymNames.join(", ") : "—",
    packageName: pkg?.name || "—",
    activationId: act?.id != null ? act.id : null,
    sessionsRemaining,
    bookings: sortedBookings,
  };
};

const buildMemberGroups = (bookings) => {
  const byMember = new Map();
  for (const b of bookings) {
    const gk = groupKeyForBooking(b);
    if (!gk) continue;
    if (!byMember.has(gk.mid)) byMember.set(gk.mid, new Map());
    const pkgMap = byMember.get(gk.mid);
    if (!pkgMap.has(gk.key)) pkgMap.set(gk.key, []);
    pkgMap.get(gk.key).push(b);
  }

  const members = [];
  for (const [mid, pkgMap] of byMember) {
    const packages = [];
    for (const [packageKey, list] of pkgMap) {
      const sorted = sortBookingsDesc(list);
      packages.push(buildPackageSlice(packageKey, sorted));
    }
    packages.sort((a, b) => {
      const na = a.activationId != null ? Number(a.activationId) : NaN;
      const nb = b.activationId != null ? Number(b.activationId) : NaN;
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return nb - na;
      return String(a.packageName).localeCompare(String(b.packageName), "vi");
    });

    const firstBooking = packages[0]?.bookings[0];
    const name =
      firstBooking?.Member?.User?.username ||
      firstBooking?.Member?.name ||
      `Học viên #${mid}`;
    const phone = firstBooking?.Member?.User?.phone || "—";
    const avatar = pickMemberAvatar(firstBooking?.Member);

    members.push({
      memberKey: `mem|${mid}`,
      memberId: mid,
      name,
      phone,
      avatar,
      packages,
    });
  }

  members.sort((a, b) => String(a.name).localeCompare(String(b.name), "vi"));
  return members;
};

const formatBookingDate = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("vi-VN");
};

const PTPackageBlock = ({ compositeKey, pkg }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="ptp-packageBlock">
      <div className="ptp-packageBlock__head">
        {pkg.activationId != null ? (
          <div className="ptp-packageBlock__label">Gói kích hoạt #{pkg.activationId}</div>
        ) : null}
        <dl className="ptp-studentCard__meta ptp-packageBlock__meta">
          <div>
            <dt>Chi nhánh</dt>
            <dd>{pkg.branchLabel}</dd>
          </div>
          <div>
            <dt>Gói học</dt>
            <dd>{pkg.packageName}</dd>
          </div>
          <div>
            <dt>Buổi còn lại (gói này)</dt>
            <dd>{pkg.sessionsRemaining != null ? pkg.sessionsRemaining : "—"}</dd>
          </div>
        </dl>
        <button
          type="button"
          className="ptp-studentCard__toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Thu gọn lịch" : "Xem lịch đặt (gói này)"}
        </button>
      </div>
      {expanded ? (
        <div className="ptp-studentCard__bookings">
          <table className="ptp-miniTable">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Giờ</th>
                <th>Chi nhánh</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {pkg.bookings.map((item, index) => (
                <tr key={item.id || `${compositeKey}-${index}`}>
                  <td>{formatBookingDate(item.bookingDate)}</td>
                  <td>
                    {item.startTime?.toString?.().substring?.(0, 5) || "—"} –{" "}
                    {item.endTime?.toString?.().substring?.(0, 5) || "—"}
                  </td>
                  <td>{item.Gym?.name || "—"}</td>
                  <td>
                    <span className={`ptp-badge st-${String(item.status || "").toLowerCase()}`}>
                      {bookingStatusVi(item.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

const PTMemberCard = ({ member, onOpenDetail }) => (
  <div className="ptp-memberCard">
    <div className="ptp-memberCard__head">
      <div className="ptp-studentCard__main ptp-memberCard__profile">
        {member.avatar ? (
          <img className="ptp-studentCard__avatarImg" src={member.avatar} alt={member.name || "Học viên"} />
        ) : (
          <div className="ptp-studentCard__avatar" aria-hidden>
            {String(member.name || "?")
              .trim()
              .slice(0, 2)
              .toUpperCase()}
          </div>
        )}
        <div className="ptp-studentCard__info">
          <div className="ptp-studentCard__name">{member.name}</div>
          <div className="ptp-studentCard__phone">{member.phone}</div>
          {member.packages.length > 1 ? (
            <div className="ptp-memberCard__hint">{member.packages.length} gói đang tập với bạn</div>
          ) : null}
        </div>
      </div>
      <span className="ptp-memberCard__pill">Đang học</span>
    </div>
    <div className="ptp-memberCard__summary ptp-memberCard__foot">
      <div className="ptp-memberCard__summaryRow">
        <span>Tổng gói</span>
        <strong>{member.packages.length}</strong>
      </div>
      <button type="button" className="ptp-memberCard__detailBtn" onClick={onOpenDetail}>
        Xem chi tiết
      </button>
    </div>
  </div>
);

const PTMemberDetailModal = ({ member, onClose }) => {
  if (!member) return null;
  return (
    <div className="ptp-modal__backdrop" onClick={onClose}>
      <div className="ptp-modal__card" onClick={(e) => e.stopPropagation()}>
        <div className="ptp-modal__head">
          <h3>Chi tiết học viên</h3>
          <button type="button" className="ptp-modal__close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>
        <div className="ptp-modal__member">
          {member.avatar ? (
            <img className="ptp-studentCard__avatarImg" src={member.avatar} alt={member.name || "Học viên"} />
          ) : (
            <div className="ptp-studentCard__avatar" aria-hidden>
              {String(member.name || "?")
                .trim()
                .slice(0, 2)
                .toUpperCase()}
            </div>
          )}
          <div>
            <div className="ptp-studentCard__name">{member.name}</div>
            <div className="ptp-studentCard__phone">{member.phone}</div>
          </div>
        </div>
        <div className="ptp-modal__body">
          {member.packages.map((pkg) => (
            <PTPackageBlock
              key={`${member.memberKey}::${pkg.packageKey}`}
              compositeKey={`${member.memberKey}::${pkg.packageKey}`}
              pkg={pkg}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const CLIENTS_PAGE_SIZE = 4;

const buildPagerSlots = (total, cur) => {
  if (total <= 1) return [];
  if (total <= 15) {
    return Array.from({ length: total }, (_, i) => ({ type: "page", n: i + 1 }));
  }
  const slots = [];
  const windowSize = 7;
  let winStart = Math.max(2, Math.min(cur - 3, total - windowSize));
  let winEnd = Math.min(total - 1, winStart + windowSize - 1);
  slots.push({ type: "page", n: 1 });
  if (winStart > 2) slots.push({ type: "dots" });
  for (let i = winStart; i <= winEnd; i++) slots.push({ type: "page", n: i });
  if (winEnd < total - 1) slots.push({ type: "dots" });
  slots.push({ type: "page", n: total });
  return slots;
};

const PTClients = ({ trainerId = "me" }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [detailMember, setDetailMember] = useState(null);

  useEffect(() => {
    setPage(1);
  }, [trainerId]);

  useEffect(() => {
    getPTBookings(trainerId)
      .then((data) => {
        setBookings(normalizeBookingsPayload(data));
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Không tải được danh sách học viên.");
        setLoading(false);
      });
  }, [trainerId]);

  useEffect(() => {
    const socket = connectSocket();
    let t = null;
    const onNoti = (payload) => {
      const type = String(payload?.notificationType || "").toLowerCase();
      if (type !== "booking_update" && type !== "booking") return;
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        invalidatePTServiceCache("/bookings");
        setLoading(true);
        getPTBookings(trainerId)
          .then((data) => setBookings(normalizeBookingsPayload(data)))
          .catch(() => {})
          .finally(() => setLoading(false));
      }, 250);
    };
    socket.on("notification:new", onNoti);
    return () => {
      if (t) clearTimeout(t);
      socket.off("notification:new", onNoti);
    };
  }, [trainerId]);

  const members = useMemo(() => buildMemberGroups(bookings), [bookings]);

  const totalPages = Math.max(1, Math.ceil(members.length / CLIENTS_PAGE_SIZE));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [members.length, totalPages]);

  const pageClamped = Math.min(Math.max(1, page), totalPages);

  const paginatedMembers = useMemo(() => {
    const start = (pageClamped - 1) * CLIENTS_PAGE_SIZE;
    return members.slice(start, start + CLIENTS_PAGE_SIZE);
  }, [members, pageClamped]);

  const pagerSlots = useMemo(
    () => buildPagerSlots(totalPages, pageClamped),
    [totalPages, pageClamped]
  );

  if (loading) return <div className="ptp-wrap">Đang tải...</div>;
  if (error) {
    return (
      <div className="ptp-wrap" style={{ color: "#ff6b6b" }}>
        {error}
      </div>
    );
  }

  return (
    <div className="ptp-wrap ptp-wrap--clients">
      <div className="ptp-head ptp-head--clients">
        <h2 className="ptp-title">Học viên</h2>
        <p className="ptp-desc">Danh sách học viên đã đặt lịch với bạn.</p>
      </div>

      {members.length > 0 ? (
        <>
          <div className="ptp-clientsGrid">
            {paginatedMembers.map((m) => (
              <PTMemberCard key={m.memberKey} member={m} onOpenDetail={() => setDetailMember(m)} />
            ))}
          </div>
          <div className="ptp-clientsPager">
            <div className="ptp-clientsPager__controls">
              <button
                type="button"
                className="ptp-clientsPager__btn"
                disabled={pageClamped <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Trang trước"
              >
                ← Trước
              </button>
              <div className="ptp-clientsPager__nums" role="navigation" aria-label="Chọn trang">
                {totalPages <= 1 ? (
                  <>
                    <button type="button" className="ptp-clientsPager__num is-current" disabled>
                      1
                    </button>
                    <button
                      type="button"
                      className="ptp-clientsPager__num"
                      disabled
                      title="Thêm học viên để có trang 2"
                    >
                      2
                    </button>
                  </>
                ) : (
                  pagerSlots.map((slot, idx) =>
                    slot.type === "dots" ? (
                      <span key={`d-${idx}`} className="ptp-clientsPager__dots">
                        …
                      </span>
                    ) : (
                      <button
                        key={slot.n}
                        type="button"
                        className={`ptp-clientsPager__num${pageClamped === slot.n ? " is-current" : ""}`}
                        onClick={() => setPage(slot.n)}
                        aria-label={`Trang ${slot.n}`}
                        aria-current={pageClamped === slot.n ? "page" : undefined}
                      >
                        {slot.n}
                      </button>
                    )
                  )
                )}
              </div>
              <button
                type="button"
                className="ptp-clientsPager__btn"
                disabled={pageClamped >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Trang sau"
              >
                Sau →
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="ptw-empty">
          <p>Chưa có học viên đặt lịch với bạn.</p>
        </div>
      )}
      <PTMemberDetailModal member={detailMember} onClose={() => setDetailMember(null)} />
    </div>
  );
};

export default PTClients;
