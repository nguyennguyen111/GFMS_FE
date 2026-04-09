import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import './ForgotPasswordPage.css';
import { forgotPassword, verifyOtp, resetPassword } from '../../services/authService';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

  const startTimer = () => {
    setTimer(300);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await forgotPassword(email);

      if (Number(response.data.EC) === 0) {
        alert('✅ OTP đã được gửi đến email của bạn!');
        setStep(2);
        setOtpSent(true);
        startTimer();
      } else {
        alert(`❌ ${response.data.EM}`);
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      alert('❌ Có lỗi xảy ra khi gửi OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      setErrors({ otp: 'Vui lòng nhập OTP' });
      return;
    }

    if (otp.length !== 6) {
      setErrors({ otp: 'OTP phải có 6 chữ số' });
      return;
    }

    setIsLoading(true);

    try {
      const response = await verifyOtp(email, otp);

      if (Number(response.data.EC) === 0) {
        alert('✅ OTP hợp lệ! Vui lòng đặt mật khẩu mới.');
        setStep(3);
      } else {
        alert(`❌ ${response.data.EM}`);
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      alert(`❌ ${error?.response?.data?.EM || 'Có lỗi xảy ra khi xác thực OTP'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const newErrors = {};

    if (!newPassword) {
      newErrors.newPassword = 'Mật khẩu mới là bắt buộc';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Mật khẩu phải có ít nhất 8 ký tự';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      newErrors.newPassword = 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu không khớp';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await resetPassword(email, otp, newPassword);

      if (Number(response.data.EC) === 0) {
        alert('✅ Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.');
        navigate('/login');
      } else {
        alert(`❌ ${response.data.EM}`);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      alert(`❌ ${error?.response?.data?.EM || 'Có lỗi xảy ra khi đặt lại mật khẩu'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);

    try {
      const response = await forgotPassword(email);

      if (Number(response.data.EC) === 0) {
        alert('✅ Đã gửi lại OTP mới!');
        startTimer();
      } else {
        alert(`❌ ${response.data.EM}`);
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      alert(`❌ ${error?.response?.data?.EM || 'Có lỗi xảy ra khi gửi lại OTP'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="forgot-page auth-compact">
      <div className="forgot-page__glow forgot-page__glow--left" />
      <div className="forgot-page__glow forgot-page__glow--right" />

      <div className="forgot-shell">
        <div className="forgot-branding">
          <div className="forgot-kicker">Security Access</div>

          <h1 className="forgot-branding__title">
            QUÊN <br />
            <span>MẬT KHẨU?</span>
          </h1>

          <p className="forgot-branding__desc">
            Khôi phục quyền truy cập vào hệ thống GFMS qua 3 bước xác thực đơn giản và an toàn.
          </p>

          <div className="forgot-branding__info">
            <div className="forgot-branding__infoItem">
              <ShieldCheck size={18} />
              <span>Xác thực qua email đăng ký</span>
            </div>
            <div className="forgot-branding__infoItem">
              <KeyRound size={18} />
              <span>OTP có thời hạn bảo mật</span>
            </div>
            <div className="forgot-branding__infoItem">
              <Lock size={18} />
              <span>Thiết lập lại mật khẩu mới</span>
            </div>
          </div>
        </div>

        <div className="forgot-card">
          <div className="forgot-card__header">
            <p className="forgot-card__eyebrow">Recovery Flow</p>
            <h2>Thiết lập lại mật khẩu</h2>
            <p>Hoàn tất quy trình để lấy lại quyền truy cập tài khoản của bạn.</p>
          </div>

          <div className="forgot-steps">
            <div className={`forgot-step ${step >= 1 ? 'is-active' : ''}`}>
              <span className="forgot-step__dot">1</span>
              <span className="forgot-step__label">Email</span>
            </div>
            <div className={`forgot-step ${step >= 2 ? 'is-active' : ''}`}>
              <span className="forgot-step__dot">2</span>
              <span className="forgot-step__label">OTP</span>
            </div>
            <div className={`forgot-step ${step >= 3 ? 'is-active' : ''}`}>
              <span className="forgot-step__dot">3</span>
              <span className="forgot-step__label">Mật khẩu mới</span>
            </div>
          </div>

          {step === 1 && (
            <div className="forgot-content">
              <div className="forgot-formGroup">
                <label className="forgot-label">Email đăng ký</label>
                <div className="forgot-inputWrap">
                  <Mail size={18} className="forgot-inputIcon" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: '' });
                    }}
                    placeholder="name@company.com"
                    className={`forgot-input ${errors.email ? 'is-error' : ''}`}
                  />
                </div>
                {errors.email && <span className="forgot-error">{errors.email}</span>}
              </div>

              <button className="forgot-submit" onClick={handleSendOTP} disabled={isLoading}>
                {isLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
                {!isLoading && <ArrowRight size={18} />}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="forgot-content">
              <div className="forgot-note">
                <p>Mã OTP đã được gửi đến: <strong>{email}</strong></p>
                <p>Vui lòng kiểm tra email và nhập mã xác thực 6 số.</p>

                {timer > 0 && (
                  <div className="forgot-timer">
                    ⏳ Thời gian còn lại: <strong>{formatTime(timer)}</strong>
                  </div>
                )}

                {timer === 0 && otpSent && (
                  <div className="forgot-expired">
                    ⚠️ Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.
                  </div>
                )}
              </div>

              <div className="forgot-formGroup">
                <label className="forgot-label">Mã OTP</label>
                <div className="forgot-inputWrap">
                  <KeyRound size={18} className="forgot-inputIcon" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtp(value);
                      if (errors.otp) setErrors({ ...errors, otp: '' });
                    }}
                    placeholder="Nhập mã OTP"
                    className={`forgot-input ${errors.otp ? 'is-error' : ''}`}
                  />
                </div>
                {errors.otp && <span className="forgot-error">{errors.otp}</span>}
              </div>

              <div className="forgot-buttonRow">
                <button
                  className="forgot-submit"
                  onClick={handleVerifyOTP}
                  disabled={isLoading || timer === 0}
                >
                  {isLoading ? 'Đang xác thực...' : 'Xác thực OTP'}
                </button>

                <button
                  className="forgot-secondary"
                  onClick={handleResendOTP}
                  disabled={isLoading || timer > 0}
                >
                  Gửi lại OTP
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="forgot-content">
              <div className="forgot-formGroup">
                <label className="forgot-label">Mật khẩu mới</label>
                <div className="forgot-inputWrap">
                  <Lock size={18} className="forgot-inputIcon" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
                    }}
                    placeholder="Nhập mật khẩu mới"
                    className={`forgot-input ${errors.newPassword ? 'is-error' : ''}`}
                  />
                </div>
                {errors.newPassword && <span className="forgot-error">{errors.newPassword}</span>}
              </div>

              <div className="forgot-formGroup">
                <label className="forgot-label">Xác nhận mật khẩu mới</label>
                <div className="forgot-inputWrap">
                  <Lock size={18} className="forgot-inputIcon" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                    }}
                    placeholder="Nhập lại mật khẩu mới"
                    className={`forgot-input ${errors.confirmPassword ? 'is-error' : ''}`}
                  />
                </div>
                {errors.confirmPassword && (
                  <span className="forgot-error">{errors.confirmPassword}</span>
                )}
              </div>

              <button className="forgot-submit" onClick={handleResetPassword} disabled={isLoading}>
                {isLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                {!isLoading && <ArrowRight size={18} />}
              </button>
            </div>
          )}

          <div className="forgot-back">
            <button className="forgot-backBtn" onClick={() => navigate('/login')}>
              <ArrowLeft size={16} />
              Quay lại đăng nhập
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;