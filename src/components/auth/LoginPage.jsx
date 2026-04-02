import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ChevronRight,
  ShieldCheck,
  Dumbbell,
  LineChart,
  Building2,
} from 'lucide-react';
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
    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email là bắt buộc';
    else if (!validateEmail(email)) newErrors.email = 'Email không hợp lệ. Vui lòng nhập email đúng định dạng';

    if (!password) newErrors.password = 'Mật khẩu là bắt buộc';
    else if (!validatePassword(password)) newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';

    return newErrors;
  };

  const getHomePathByGroupId = (groupId) => {
    const map = {
      1: '/admin',
      2: '/owner',
      3: '/pt',
      4: '/',
      5: '/',
    };
    return map[groupId] || '/';
  };

  const isRedirectAllowedForGroup = (groupId, path) => {
    if (!path || typeof path !== 'string') return false;
    if (!path.startsWith('/')) return false;
    if (path.startsWith('//')) return false;

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
        alert(`✅ ${data?.EM || 'Đăng nhập thành công'}`);

        const dt = data?.DT || {};
        const user = dt?.user || null;
        const accessToken = dt?.accessToken || dt?.access_Token || '';

        if (!user) {
          alert('❌ Không lấy được thông tin người dùng');
          return;
        }

        const groupIdRaw = user?.groupId ?? user?.group_id;
        const groupId = Number(groupIdRaw);

        console.log('✅ USER:', user);
        console.log('✅ accessToken:', accessToken);
        console.log('✅ groupId:', groupId);

        if (accessToken) {
          localStorage.setItem('accessToken', accessToken);
        }

        setCurrentUser(user);

        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('roles', JSON.stringify(dt?.roles || []));

        const redirect = sessionStorage.getItem('redirectAfterLogin');
        if (redirect && isRedirectAllowedForGroup(groupId, redirect)) {
          sessionStorage.removeItem('redirectAfterLogin');
          navigate(redirect, { replace: true });
          return;
        }

        if (redirect) {
          sessionStorage.removeItem('redirectAfterLogin');
        }

        const homePath = getHomePathByGroupId(groupId);
        navigate(homePath, { replace: true });
        return;
      }

      const serverError = data?.EM || 'Có lỗi xảy ra';
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

      let errorMessage = 'Có lỗi xảy ra khi đăng nhập';
      if (error.response?.data?.EM) {
        errorMessage = error.response.data.EM;
      } else if (error.request) {
        errorMessage = 'Không thể kết nối đến server';
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
      setErrors((prev) => ({
        ...prev,
        email: 'Email không hợp lệ. Vui lòng nhập email đúng định dạng',
      }));
    }
  };

  const handlePasswordBlur = (e) => {
    const value = e.target.value;
    if (value && !validatePassword(value)) {
      setErrors((prev) => ({
        ...prev,
        password: 'Mật khẩu phải có ít nhất 6 ký tự',
      }));
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <div className="login-page">
      <div className="login-page__glow login-page__glow--left" />
      <div className="login-page__glow login-page__glow--right" />

      <div className="login-shell">
        <div className="login-branding">
          <div className="login-kicker">Franchise Fitness Platform</div>

          <h1 className="login-branding__title">
            System <br />
            <span>GFMS</span>
          </h1>

          <p className="login-branding__desc">
            Hệ thống quản lý phòng tập cao cấp dành cho những người dẫn đầu. Hiệu năng vượt
            trội, vận hành thông minh và trải nghiệm liền mạch cho toàn bộ hệ sinh thái GFMS.
          </p>

          <div className="login-branding__footer">
            <div className="login-branding__line" />
            <span>Phát triển cho hệ thống nhượng quyền gym hiện đại</span>
          </div>

          <div className="login-featureList">
            <div className="login-featureItem">
              <div className="login-featureIcon">
                <Building2 size={18} />
              </div>
              <div>
                <h3>Quản lý đa phòng gym</h3>
                <p>Đồng bộ vận hành cho nhiều chi nhánh trên cùng một nền tảng.</p>
              </div>
            </div>

            <div className="login-featureItem">
              <div className="login-featureIcon">
                <Dumbbell size={18} />
              </div>
              <div>
                <h3>Kết nối PT & hội viên</h3>
                <p>Tối ưu booking, lịch tập và trải nghiệm cá nhân hóa.</p>
              </div>
            </div>

            <div className="login-featureItem">
              <div className="login-featureIcon">
                <LineChart size={18} />
              </div>
              <div>
                <h3>Theo dõi hiệu suất</h3>
                <p>Phân tích dữ liệu, doanh thu và tăng trưởng rõ ràng hơn.</p>
              </div>
            </div>

            <div className="login-featureItem">
              <div className="login-featureIcon">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3>Bảo mật và ổn định</h3>
                <p>Quy trình truy cập an toàn, phù hợp cho vận hành thực tế.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="login-panel">
          <div className="login-card">
            <div className="login-card__header">
              <h2>Chào mừng trở lại</h2>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-form__group">
                <label htmlFor="email" className="login-form__label">
                  Email
                </label>
                <div className="login-inputWrap">
                  <Mail size={18} className="login-inputIcon" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    placeholder="email@gfms.com"
                    className={`login-input ${errors.email ? 'is-error' : ''}`}
                  />
                </div>
                {errors.email && <span className="login-error">{errors.email}</span>}
              </div>

              <div className="login-form__group">
                <div className="login-form__labelRow">
                  <label htmlFor="password" className="login-form__label">
                    Mật khẩu
                  </label>
                  <button
                    type="button"
                    className="login-linkBtn"
                    onClick={handleForgotPassword}
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                <div className="login-inputWrap">
                  <Lock size={18} className="login-inputIcon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={password}
                    onChange={handlePasswordChange}
                    onBlur={handlePasswordBlur}
                    placeholder="••••••••"
                    className={`login-input ${errors.password ? 'is-error' : ''}`}
                  />
                  <button
                    type="button"
                    className="login-passwordToggle"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <span className="login-error">{errors.password}</span>}
              </div>

              <button type="submit" className="login-submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="login-spinner" />
                    Đang đăng nhập...
                  </>
                ) : (
                  <>
                    <span>Đăng nhập</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="login-registerBox">
                <p>
                  Chưa có tài khoản?
                  <button
                    type="button"
                    className="login-registerBtn"
                    onClick={handleRegister}
                  >
                    Đăng ký ngay <ChevronRight size={15} />
                  </button>
                </p>
              </div>
            </form>

            <div className="login-card__footer">
              <p> Bản quyền thuộc về GYM Franchise Management System.</p>
              <p className="login-demo">&copy; {new Date().getFullYear()} GFMS.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;