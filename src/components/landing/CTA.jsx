import React, { useMemo, useState } from 'react';
import './CTA.css';
import { ChevronLeft, ChevronRight, MessageSquareQuote, Star } from 'lucide-react';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN');
};

const getTypeLabel = (type) => {
  if (type === 'gym') return 'Phòng gym';
  if (type === 'trainer') return 'PT';
  if (type === 'package') return 'Gói tập';
  return 'GFMS';
};

const CTA = ({ testimonials = [] }) => {
  const [index, setIndex] = useState(0);
  const safeTestimonials = Array.isArray(testimonials) ? testimonials : [];
  const current = useMemo(() => safeTestimonials[index] || null, [safeTestimonials, index]);

  const next = () => setIndex((prev) => (prev + 1) % safeTestimonials.length);
  const prev = () => setIndex((prev) => (prev - 1 + safeTestimonials.length) % safeTestimonials.length);

  return (
    <section className="cta">
      <div className="cta-container">
        <div className="cta-card testimonial-mode">
          <div className="cta-content">
            <span className="cta-kicker">PHẢN HỒI ĐÁNG TIN CẬY</span>
            <h2 className="cta-title">
              Người dùng nói gì <br /> về gym, PT và gói tập?
            </h2>
          </div>

          <div className="cta-testimonialBox">
            {current ? (
              <>
                <div className="cta-testimonialTop">
                  <span className="cta-quoteIcon"><MessageSquareQuote size={20} /></span>
                  <span className="cta-rating"><Star size={14} /> {Number(current.rating || 0).toFixed(1)}</span>
                </div>
                <div className="cta-testimonialQuote">“{current.comment}”</div>
                <div className="cta-testimonialMeta">
                  <strong>{current.memberName || 'Thành viên GFMS'}</strong>
                  <span>{getTypeLabel(current.reviewType)} • {formatDate(current.createdAt)}</span>
                </div>

                {safeTestimonials.length > 1 ? (
                  <div className="cta-nav">
                    <button type="button" onClick={prev}><ChevronLeft size={18} /></button>
                    <div className="cta-dots">
                      {safeTestimonials.map((item, idx) => (
                        <span key={item.id || idx} className={idx === index ? 'active' : ''} />
                      ))}
                    </div>
                    <button type="button" onClick={next}><ChevronRight size={18} /></button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="cta-empty">Chưa có feedback nào.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
