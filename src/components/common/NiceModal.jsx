import React, { useEffect } from "react";
import "./NiceModal.css";

/**
 * Modal overlay — dark glass style, matches PT / Owner portals.
 */
export default function NiceModal({
  open,
  onClose,
  title,
  children,
  footer,
  tone = "default",
  zIndex = 1000,
  wide = false,
  closeOnOverlay = true,
  showCloseButton = true,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toneClass =
    tone === "success" ? "nice-modal--success" : tone === "danger" ? "nice-modal--danger" : tone === "info" ? "nice-modal--info" : "";

  return (
    <div
      className="nice-modal-overlay"
      style={{ zIndex }}
      role="presentation"
      onClick={closeOnOverlay ? onClose : undefined}
    >
      <div
        className={`nice-modal ${wide ? "nice-modal--wide" : ""} ${toneClass}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "nice-modal-title" : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="nice-modal__glow" aria-hidden />
        {showCloseButton && (
          <button type="button" className="nice-modal__close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        )}
        {title ? (
          <h2 id="nice-modal-title" className="nice-modal__title">
            {title}
          </h2>
        ) : null}
        <div className="nice-modal__body">{children}</div>
        {footer ? <div className="nice-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
