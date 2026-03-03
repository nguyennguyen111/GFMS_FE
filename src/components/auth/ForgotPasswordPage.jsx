// ForgotPasswordPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ForgotPasswordPage.css';
import { forgotPassword, verifyOtp, resetPassword } from '../../services/authService';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Nhập email, 2: Nhập OTP, 3: Đổi mật khẩu
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

  // Hàm đếm ngược thời gian
  const startTimer = () => {
    setTimer(300); // 5 phút = 300 giây
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Bước 1: Gửi yêu cầu OTP
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
      
      // NOTE: backend có thể trả EC dạng number hoặc string ("0").
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

  // Bước 2: Xác thực OTP
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

  // Bước 3: Đặt mật khẩu mới
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

  // Gửi lại OTP
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

  // Định dạng thời gian
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="forgot-password-page">
      <div className="gym-background"></div>
      <div className="forgot-overlay"></div>
      
      <div className="forgot-container">
        <div className="forgot-card">
          <div className="forgot-header">
            <h2>Quên mật khẩu</h2>
            <p>Thiết lập lại mật khẩu của bạn</p>
          </div>
          
          <div className="progress-steps">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>
              <span className="step-number">1</span>
              <span className="step-label">Nhập email</span>
            </div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>
              <span className="step-number">2</span>
              <span className="step-label">Xác thực OTP</span>
            </div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>
              <span className="step-number">3</span>
              <span className="step-label">Mật khẩu mới</span>
            </div>
          </div>
          
          {step === 1 && (
            <div className="step-content">
              <div className="form-group">
                <label>Email đăng ký</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  placeholder="Nhập email của bạn"
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>
              
              <button 
                className="submit-btn"
                onClick={handleSendOTP}
                disabled={isLoading}
              >
                {isLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
              </button>
            </div>
          )}
          
          {step === 2 && (
            <div className="step-content">
              <div className="otp-info">
                <p>Mã OTP đã được gửi đến: <strong>{email}</strong></p>
                <p>Vui lòng kiểm tra email (cả hộp thư rác) và nhập mã 6 số:</p>
                
                {timer > 0 && (
                  <div className="timer">
                    ⏳ Thời gian còn lại: <strong>{formatTime(timer)}</strong>
                  </div>
                )}
                
                {timer === 0 && otpSent && (
                  <div className="timer-expired">
                    ⚠️ Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label>Mã OTP (6 số)</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                    if (errors.otp) setErrors({ ...errors, otp: '' });
                  }}
                  placeholder="Nhập mã OTP"
                  className={errors.otp ? 'error' : ''}
                />
                {errors.otp && <span className="error-message">{errors.otp}</span>}
              </div>
              
              <div className="button-group">
                <button 
                  className="submit-btn"
                  onClick={handleVerifyOTP}
                  disabled={isLoading || timer === 0}
                >
                  {isLoading ? 'Đang xác thực...' : 'Xác thực OTP'}
                </button>
                
                <button 
                  className="resend-btn"
                  onClick={handleResendOTP}
                  disabled={isLoading || timer > 0}
                >
                  Gửi lại OTP
                </button>
              </div>
            </div>
          )}
          
          {step === 3 && (
            <div className="step-content">
              <div className="form-group">
                <label>Mật khẩu mới</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
                  }}
                  placeholder="Nhập mật khẩu mới"
                  className={errors.newPassword ? 'error' : ''}
                />
                {errors.newPassword && <span className="error-message">{errors.newPassword}</span>}
              </div>
              
              <div className="form-group">
                <label>Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                  }}
                  placeholder="Nhập lại mật khẩu mới"
                  className={errors.confirmPassword ? 'error' : ''}
                />
                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
              </div>
              
              <button 
                className="submit-btn"
                onClick={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </button>
            </div>
          )}
          
          <div className="back-to-login">
            <button 
              className="back-btn"
              onClick={() => navigate('/login')}
            >
              ← Quay lại đăng nhập
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;