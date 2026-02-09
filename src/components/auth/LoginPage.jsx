import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import { loginUser } from '../../services/authService';
import { setCurrentUser } from '../../utils/auth';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => password.length >= 6;

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email là bắt buộc';
    else if (!validateEmail(email)) newErrors.email = 'Email không hợp lệ. Vui lòng nhập email đúng định dạng';

    if (!password) newErrors.password = 'Mật khẩu là bắt buộc';
    else if (!validatePassword(password)) newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';

    return newErrors;
  };

  // Mapping chuẩn theo DB groupId:
  // 1=Admin, 2=Owner, 3=Trainer/PT, 4=Member, 5=Guest
  const getHomePathByGroupId = (groupId) => {
    const map = {
      1: '/admin',
      2: '/owner',
      3: '/pt',
      4: '/member', // nếu bạn muốn member về "/" thì đổi lại
      5: '/',
    };
    return map[groupId] || '/';
  };

  // ✅ Chỉ cho redirectAfterLogin hợp lệ với groupId
  const isRedirectAllowedForGroup = (groupId, path) => {
    if (!path || typeof path !== 'string') return false;

    // block các case lạ
    if (!path.startsWith('/')) return false;
    if (path.startsWith('//')) return false;

    // Admin: thường cho vào admin area (đỡ bị "đè" sang member)
    if (groupId === 1) return path === '/admin' || path.startsWith('/admin/');

    if (groupId === 2) return path === '/owner' || path.startsWith('/owner/');
    if (groupId === 3) return path === '/pt' || path.startsWith('/pt/');
    if (groupId === 4) return path === '/member' || path.startsWith('/member/') || path === '/';
    if (groupId === 5) return path === '/';

    return false;
  };

  const handleLogin = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await loginUser(email, password);
      const data = response?.data;

      console.log('Login response:', data);

      if (data?.EC === 0) {
        alert(`✅ ${data?.EM || "Đăng nhập thành công"}`);

        const dt = data?.DT || {};
        const user = dt?.user || null;
        const accessToken = dt?.accessToken || dt?.access_Token || "";

        if (!user) {
          alert("❌ Không lấy được thông tin người dùng");
          return;
        }

        // ✅ groupId chắc chắn parse đúng
        const groupIdRaw = user?.groupId ?? user?.group_id;
        const groupId = Number(groupIdRaw);

        console.log("✅ USER:", user);
        console.log("✅ accessToken:", accessToken);
        console.log("✅ groupId:", groupId);

        // ✅ LƯU TOKEN (CHO AXIOS)
        if (accessToken) {
          localStorage.setItem("accessToken", accessToken);
        }

        // ✅ LƯU USER CHUẨN CHO TOÀN HỆ THỐNG
        setCurrentUser(user);

        // ✅ BACKWARD COMPAT
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("roles", JSON.stringify(dt?.roles || []));

        // ✅ FIX: redirectAfterLogin không được phép "đè" role
        const redirect = sessionStorage.getItem("redirectAfterLogin");
        if (redirect && isRedirectAllowedForGroup(groupId, redirect)) {
          sessionStorage.removeItem("redirectAfterLogin");
          navigate(redirect, { replace: true });
          return;
        }

        // Nếu redirect tồn tại nhưng KHÔNG hợp lệ => xóa luôn để khỏi dính lần sau
        if (redirect) {
          sessionStorage.removeItem("redirectAfterLogin");
        }

        // ✅ FALLBACK: redirect theo role
        const homePath = getHomePathByGroupId(groupId);
        navigate(homePath, { replace: true });
        return;
      }

      // ❌ LOGIN FAIL
      const serverError = data?.EM || "Có lỗi xảy ra";
      const errorMap = {
        'User not found': 'Email không tồn tại trong hệ thống',
        'Wrong password': 'Mật khẩu không đúng',
        'Missing required fields': 'Vui lòng điền đầy đủ thông tin',
        'Account inactive': 'Tài khoản đã bị vô hiệu hoá',
        'Account suspended': 'Tài khoản đang bị khoá/tạm đình chỉ',
      };

      alert(`❌ ${errorMap[serverError] || serverError}`);

    } catch (error) {
      console.error('Login error:', error);

      let errorMessage = "Có lỗi xảy ra khi đăng nhập";
      if (error.response?.data?.EM) {
        errorMessage = error.response.data.EM;
      } else if (error.request) {
        errorMessage = "Không thể kết nối đến server";
      }

      alert(`❌ ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => navigate('/forgot-password');
  const handleRegister = () => navigate('/register');

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  const handleEmailBlur = (e) => {
    const value = e.target.value;
    if (value.trim() && !validateEmail(value)) {
      setErrors(prev => ({
        ...prev,
        email: 'Email không hợp lệ. Vui lòng nhập email đúng định dạng'
      }));
    }
  };

  const handlePasswordBlur = (e) => {
    const value = e.target.value;
    if (value && !validatePassword(value)) {
      setErrors(prev => ({
        ...prev,
        password: 'Mật khẩu phải có ít nhất 6 ký tự'
      }));
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <div className="login-page">
      <div className="gym-background"></div>
      <div className="login-overlay"></div>

      <div className="login-container">
        <div className="login-left">
          <div className="brand-section">
            <h1 className="logo">GFMS</h1>
            <p className="slogan">GYM Franchise Management System</p>
            <h2 className="tagline">
              Smart Management<br />
              <span className="highlight">Professional Fitness</span>
            </h2>

            <div className="features">
              <div className="feature">
                <span className="feature-icon">✓</span>
                <div className="feature-content">
                  <h3>Quản lý đa phòng gym</h3>
                  <p>Quản lý nhiều chi nhánh một cách hiệu quả</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">✓</span>
                <div className="feature-content">
                  <h3>Kết nối PT & Hội viên</h3>
                  <p>Tương tác và quản lý mối quan hệ</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">✓</span>
                <div className="feature-content">
                  <h3>Theo dõi hiệu suất</h3>
                  <p>Phân tích dữ liệu thành viên</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">✓</span>
                <div className="feature-content">
                  <h3>Hệ thống báo cáo thông minh</h3>
                  <p>Báo cáo chi tiết và tùy chỉnh</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="login-right">
          <div className="login-card">
            <div className="login-header">
              <h2>Chào mừng trở lại</h2>
              <p>Đăng nhập để tiếp tục sử dụng hệ thống</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-with-icon">
                  <span className="input-icon">📧</span>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    placeholder="Nhập email của bạn"
                    className={errors.email ? "error" : ""}
                  />
                </div>
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="password">Mật khẩu</label>
                <div className="input-with-icon">
                  <span className="input-icon">🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={password}
                    onChange={handlePasswordChange}
                    onBlur={handlePasswordBlur}
                    placeholder="Nhập mật khẩu"
                    className={errors.password ? "error" : ""}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? "👁️ Ẩn" : "👁️‍🗨️ Hiện"}
                  </button>
                </div>
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              <div className="form-options">
                <button
                  type="button"
                  className="forgot-password-btn"
                  onClick={handleForgotPassword}
                >
                  Quên mật khẩu?
                </button>
              </div>

              <button type="submit" className="login-button" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Đang đăng nhập...
                  </>
                ) : (
                  "Đăng nhập"
                )}
              </button>

              <div className="register-section">
                <p>
                  Chưa có tài khoản?{" "}
                  <button
                    type="button"
                    className="register-btn"
                    onClick={handleRegister}
                  >
                    Đăng ký ngay
                  </button>
                </p>
              </div>
            </form>

            <div className="copyright">
              <p>
                &copy; {new Date().getFullYear()} GFMS. Bản quyền thuộc về GYM
                Franchise Management System.
              </p>
              <p style={{ fontSize: "0.8rem", marginTop: "5px" }}>
                Demo account: admin@gym.com / mật khẩu: 123456
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
