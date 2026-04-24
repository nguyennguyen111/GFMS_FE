import React from 'react';
import './Footer.css';
import { Instagram, Youtube, Facebook } from 'lucide-react';
import logoWordmark from "../../assets/logo-wordmark.png";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-logo">
          <img src={logoWordmark} alt="GFMS" className="footer-wordmark" />
        </div>

        <div className="footer-links">
          {['Điều khoản', 'Bảo mật', 'Liên hệ', 'Cơ sở', 'Tuyển dụng'].map((link) => (
            <a key={link} href="#" className="footer-link">
              {link}
            </a>
          ))}
        </div>

        <div className="footer-socials">
          <button className="footer-social-btn" type="button"><Instagram size={18} /></button>
          <button className="footer-social-btn" type="button"><Youtube size={18} /></button>
          <button className="footer-social-btn" type="button"><Facebook size={18} /></button>
        </div>

        <div className="footer-copyright">
          <p>© 2026 GFMS. ALL RIGHTS RESERVED.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;