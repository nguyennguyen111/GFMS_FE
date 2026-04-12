import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { publicFranchiseContractApi } from "../../services/publicFranchiseContractApi";
import { FRANCHISE_CONTRACT_STATUS_LABEL } from "../../utils/franchiseContractLabels";
import "./SignContractPage.css";

export default function SignContractPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [data, setData] = useState(null);

  const [agree, setAgree] = useState(false);
  const [signerName, setSignerName] = useState("Chủ phòng");
  const sigRef = useRef(null);

  const safeToken = useMemo(() => (token ? token.slice(0, 6) + "..." + token.slice(-6) : ""), [token]);

  const [docType, setDocType] = useState("original");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      setOkMsg("");
      try {
        const res = await publicFranchiseContractApi.getByToken(token);
        if (!mounted) return;
        const payload = res.data?.data || res.data;
        setData(payload);

        // auto choose doc to preview
        const st = payload?.contractStatus;
        if (st === "completed") setDocType("final");
        else if (st === "signed") setDocType("owner_signed");
        else setDocType("original");
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.message || e?.message || "Liên kết không hợp lệ hoặc đã hết hạn.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (token) load();
    else {
      setLoading(false);
      setError("Thiếu mã liên kết (token).");
    }
    return () => {
      mounted = false;
    };
  }, [token]);

  async function onSign() {
    setSigning(true);
    setError("");
    setOkMsg("");
    try {
      const signatureDataUrl = sigRef.current?.exportPngDataUrl();
      if (!signatureDataUrl) throw new Error("Vui lòng ký tay trong khung chữ ký trước khi gửi.");

      const res = await publicFranchiseContractApi.sign(token, { signerName, signatureDataUrl, consent: agree, consentVersion: "v1" });
      setOkMsg(res.data?.message || "Đã ký thành công.");

      // reload
      const fresh = await publicFranchiseContractApi.getByToken(token);
      const payload = fresh.data?.data || fresh.data;
      setData(payload);
      setDocType("owner_signed");
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Ký không thành công.");
    } finally {
      setSigning(false);
    }
  }

  // ✅ DEMO stability:
  // - iframe preview uses mode=proxy so BE returns a proper PDF with Content-Type: application/pdf (works across browsers)
  // - open-in-new-tab/downloads keep default redirect to Cloudinary secure_url (lighter on server)
  const iframeSrc = token ? publicFranchiseContractApi.documentUrl(token, docType, { mode: "proxy" }) + `&t=${Date.now()}` : "";

  const canViewOwnerSigned = data?.contractStatus === "signed" || data?.contractStatus === "completed";
  const canViewFinal = data?.contractStatus === "completed";
  const canViewCertificate = data?.contractStatus === "completed";

  /** Hoàn tất nhưng DB chưa có finalSha256 (mock / thiếu countersign thật) — PDF xem có thể là bản gốc hoặc thiếu chữ ký đối chiếu. */
  const showFinalFallbackWarning =
    data?.contractStatus === "completed" && docType === "final" && !data?.document?.finalSha256;

  return (
    <div className="sc-page">
      <div className="sc-shell">
        <div className="sc-topbar">
          <div className="sc-brand">
            <div className="sc-brandBadge">F</div>
            <div>
              <div className="sc-title">Ký điện tử hợp đồng</div>
              <div className="sc-subtitle">
                Liên kết bảo mật · mã thông báo <span className="sc-mono">{safeToken || "-"}</span>
              </div>
            </div>
          </div>

          <Link to="/" className="sc-homeLink">
            ← Trang chủ
          </Link>
        </div>

        <div className="sc-card">
          {loading ? (
            <div className="sc-loading">Đang tải hợp đồng…</div>
          ) : error ? (
            <div className="sc-errorBox">
              <div className="sc-errorTitle">Lỗi</div>
              <div className="sc-errorMsg">{error}</div>
              <div className="sc-errorHint">
                Vui lòng liên hệ quản trị để gửi lại lời mời và tạo liên kết mới.
              </div>
            </div>
          ) : (
            <>
              <div className="sc-grid2">
                <Info label="Cơ sở / doanh nghiệp" value={data?.businessName} />
                <Info label="Địa điểm" value={data?.location} />
                <Info label="Người liên hệ" value={data?.contactPerson} />
                <Info label="Email" value={data?.contactEmail} />
                <Info
                  label="Trạng thái hợp đồng"
                  value={FRANCHISE_CONTRACT_STATUS_LABEL[data?.contractStatus] || data?.contractStatus || "-"}
                  mono
                />
                <Info label="Mã yêu cầu" value={data?.id ? `#${data.id}` : "-"} mono />
              </div>

              <div className="sc-section">
                <div className="sc-rowWrap">
                  <div className="sc-sectionTitle">Xem trước PDF</div>

                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="sc-select"
                  >
                    <option value="original">Bản gốc</option>
                    <option value="owner_signed" disabled={!canViewOwnerSigned}>
                      Đã ký (chủ phòng)
                    </option>
                    <option value="final" disabled={!canViewFinal}>
                      Bản chính (admin đối chiếu)
                    </option>
                    <option value="certificate" disabled={!canViewCertificate}>
                      Chứng nhận hoàn tất
                    </option>
                  </select>

                  <button
                    // Dùng proxy để tránh lỗi PDF viewer khi Cloudinary không hỗ trợ Range/CORS đầy đủ.
                    onClick={() => window.open(publicFranchiseContractApi.documentUrl(token, docType, { mode: "proxy" }), "_blank")}
                    className="sc-btn sc-btnGhost"
                  >
                    Mở tab mới
                  </button>
                </div>

                {showFinalFallbackWarning ? (
                  <div className="sc-warnBanner" role="status">
                    Hệ thống chưa lưu bản PDF <strong>đã đối chiếu (final)</strong> cho hợp đồng này (thường gặp khi chỉ
                    mô phỏng &quot;Hoàn tất&quot;). Khung dưới có thể hiển thị bản gốc / bản gần nhất — chưa đủ chữ ký
                    như khi admin countersign thật. Hãy nhờ admin đối chiếu lại hoặc dùng yêu cầu đã chạy đủ luồng ký.
                  </div>
                ) : null}

                <div className="sc-pdfFrame">
                  <iframe title="Xem PDF hợp đồng" src={iframeSrc} style={{ width: "100%", height: 520, border: 0 }} />
                </div>

                <div className="sc-hint">
                  ✅ Luồng gần với ký điện tử doanh nghiệp: PDF được tạo phía máy chủ, chữ ký nhúng vào file PDF, hệ thống
                  lưu mã băm SHA-256 và chứng nhận hoàn tất.
                </div>
              </div>

              {okMsg ? (
                <div className="sc-okBox">
                  <div className="sc-okTitle">✅ {okMsg}</div>
                  <div className="sc-okMsg">
                    Vui lòng chờ quản trị đối chiếu. Sau đó bạn có thể tải PDF bản chính và chứng nhận hoàn tất.
                  </div>
                </div>
              ) : null}

              {/* Signing area */}
              <div className="sc-gridSign">
                <div className="sc-subCard">
                  <div className="sc-subCardTitle">Chữ ký của bạn</div>

                  <div className="sc-rowWrap" style={{ marginBottom: 8 }}>
                    <label className="sc-label">Họ tên trên chữ ký</label>
                    <input
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Họ tên chủ phòng"
                      className="sc-input"
                    />
                    <button onClick={() => sigRef.current?.clear()} className="sc-btn sc-btnGhost">
                      Xóa
                    </button>
                  </div>

                  <SignaturePad ref={sigRef} />

                  <div className="sc-rowWrap" style={{ marginTop: 10 }}>
                    <label className="sc-consent">
                      <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                      <span>Tôi đồng ý ký điện tử (đồng ý ký số theo quy định).</span>
                    </label>

                    <button
                      onClick={onSign}
                      disabled={!agree || signing || (data?.contractStatus !== "viewed" && data?.contractStatus !== "sent")}
                      style={{ marginLeft: "auto" }}
                      className={`sc-btn sc-btnPrimary ${(!agree || signing) ? "is-disabled" : ""}`}
                      title={!agree ? "Vui lòng tick đồng ý trước" : "Ký hợp đồng"}
                    >
                      {signing ? "Đang ký…" : "Ký"}
                    </button>
                  </div>

                  <div className="sc-hint" style={{ marginTop: 10 }}>
                    Gợi ý: Liên kết ký thường chỉ dùng một lần. Nếu hết hạn, vui lòng nhờ quản trị gửi lại.
                  </div>
                </div>

                <div className="sc-subCard">
                  <div className="sc-subCardTitle">Tải xuống</div>
                  <DownloadRow label="PDF gốc" onClick={() => window.open(publicFranchiseContractApi.documentUrl(token, "original", { mode: "proxy" }), "_blank")} />
                  <DownloadRow
                    label="PDF đã ký (chủ phòng)"
                    disabled={!canViewOwnerSigned}
                    onClick={() => window.open(publicFranchiseContractApi.documentUrl(token, "owner_signed", { mode: "proxy" }), "_blank")}
                  />
                  <DownloadRow
                    label="PDF bản chính (đã đối chiếu)"
                    disabled={!canViewFinal}
                    onClick={() => window.open(publicFranchiseContractApi.documentUrl(token, "final", { mode: "proxy" }), "_blank")}
                  />
                  <DownloadRow
                    label="Chứng nhận hoàn tất"
                    disabled={!canViewCertificate}
                    onClick={() => window.open(publicFranchiseContractApi.documentUrl(token, "certificate", { mode: "proxy" }), "_blank")}
                  />
                  <div className="sc-hint" style={{ marginTop: 10 }}>
                    Sau khi quản trị đối chiếu, PDF bản chính và chứng nhận sẽ hiển thị tại đây.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono }) {
  return (
    <div className="sc-info">
      <div className="sc-infoLabel">{label}</div>
      <div className={`sc-infoValue ${mono ? "sc-mono" : ""}`}>{value || "-"}</div>
    </div>
  );
}

function DownloadRow({ label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`sc-downloadRow ${disabled ? "is-disabled" : ""}`}
    >
      {label}
    </button>
  );
}

// ===== Signature Pad (no external libs, enterprise smoothing + export black) =====
const SignaturePad = React.forwardRef(function SignaturePad(_, ref) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const pts = useRef([]);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  function getCtx() {
    const c = canvasRef.current;
    if (!c) return null;
    if (!ctxRef.current) ctxRef.current = c.getContext("2d");
    return ctxRef.current;
  }

  function setupCtx() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = getCtx();
    if (!ctx) return;

    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    sizeRef.current = { w: rect.width, h: rect.height, dpr };

    c.width = Math.max(1, Math.floor(rect.width * dpr));
    c.height = Math.max(1, Math.floor(rect.height * dpr));

    // Reset transform before scaling (avoid cumulative scaling on resize)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Enterprise ink (preview: light on dark)
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(238,242,255,0.96)";
    ctx.lineWidth = 3.6; // thicker
  }

  function resizeCanvas() {
    // Resize clears canvas; acceptable for signing pad
    setupCtx();
  }

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  function posFromEvent(e) {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : null;
    const clientX = t ? t.clientX : e.clientX;
    const clientY = t ? t.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top, t: Date.now() };
  }

  function mid(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function drawSmooth() {
    const ctx = getCtx();
    if (!ctx) return;
    const p = pts.current;
    if (p.length < 2) return;

    // Dynamic width based on speed
    const last = p[p.length - 1];
    const prev = p[p.length - 2];
    const dt = Math.max(1, (last.t || 0) - (prev.t || 0));
    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const v = dist / dt; // px/ms
    const w = Math.max(2.6, Math.min(4.6, 4.4 - v * 6));
    ctx.lineWidth = w;

    if (p.length === 2) {
      ctx.beginPath();
      ctx.moveTo(p[0].x, p[0].y);
      ctx.lineTo(p[1].x, p[1].y);
      ctx.stroke();
      return;
    }

    const p0 = p[p.length - 3];
    const p1 = p[p.length - 2];
    const p2 = p[p.length - 1];
    const m1 = mid(p0, p1);
    const m2 = mid(p1, p2);

    ctx.beginPath();
    ctx.moveTo(m1.x, m1.y);
    ctx.quadraticCurveTo(p1.x, p1.y, m2.x, m2.y);
    ctx.stroke();
  }

  function start(e) {
    e.preventDefault();
    drawing.current = true;
    pts.current = [];
    const p = posFromEvent(e);
    pts.current.push(p);

    // draw a dot for taps
    const ctx = getCtx();
    if (ctx) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(238,242,255,0.96)";
      ctx.fill();
    }
  }

  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const p = posFromEvent(e);

    // ignore tiny moves
    const prev = pts.current[pts.current.length - 1];
    if (prev) {
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      if (dx * dx + dy * dy < 0.5) return;
    }

    pts.current.push(p);
    drawSmooth();
  }

  function end(e) {
    e.preventDefault();
    drawing.current = false;
    pts.current = [];
  }

  function clear() {
    const c = canvasRef.current;
    const ctx = getCtx();
    if (!c || !ctx) return;
    const { w, h } = sizeRef.current;
    ctx.clearRect(0, 0, w, h);
  }

  function exportPngDataUrl() {
    const c = canvasRef.current;
    if (!c) return null;

    // blank check
    const ctx = c.getContext("2d");
    const img = ctx.getImageData(0, 0, c.width, c.height).data;
    let nonEmpty = false;
    for (let i = 3; i < img.length; i += 4) {
      if (img[i] !== 0) {
        nonEmpty = true;
        break;
      }
    }
    if (!nonEmpty) return null;

    // Export MUST be black (for embedding into PDF)
    const off = document.createElement("canvas");
    off.width = c.width;
    off.height = c.height;
    const octx = off.getContext("2d");
    octx.drawImage(c, 0, 0);

    const data = octx.getImageData(0, 0, off.width, off.height);
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (a !== 0) {
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
        if (a < 250) d[i + 3] = 255;
      }
    }
    octx.putImageData(data, 0, 0);

    return off.toDataURL("image/png");
  }

  React.useImperativeHandle(ref, () => ({ clear, exportPngDataUrl }));

  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.25)",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: 170, display: "block", touchAction: "none" }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
    </div>
  );
});
