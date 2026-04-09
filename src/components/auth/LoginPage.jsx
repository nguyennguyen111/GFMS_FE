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
import { GoogleLogin } from '@react-oauth/google';
import { applyAuthPayload, loginUser, loginWithGoogle } from '../../services/authService';
import { getRememberedEmail, setRememberedEmail } from '../../services/authSession';
import { showAppToast } from '../../utils/appToast';

const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const showGoogleLogin = Boolean(googleClientId);

const LoginPage = () => {
  const [email, setEmail] = useState(getRememberedEmail());
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(Boolean(getRememberedEmail()));

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  const loginErrorMap = {
    'User not found': 'Email không tồn tại trong hệ thống',
    'Wrong password': 'Mật khẩu không đúng',
    'Missing required fields': 'Vui lòng điền đầy đủ thông tin',
    'Account inactive': 'Tài khoản đã bị vô hiệu hoá',
    'Account suspended': 'Tài khoản đang bị khoá/tạm đình chỉ',
    'Invalid or expired Google token': 'Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn',
    'Invalid Google token payload': 'Phiên đăng nhập Google không hợp lệ',
    'Google account has no email': 'Tài khoản Google không có email',
    'Google email is not verified': 'Email Google chưa được xác minh',
    'Missing Google credential': 'Thiếu thông tin xác thực Google',
    'Google login is not configured on server (missing GOOGLE_CLIENT_ID)':
      'Đăng nhập Google chưa được cấu hình trên server',
  };

  /** Lưu session + điều hướng — dùng chung cho email/password và Google */
  const applyLoginSession = (data) => {
    if (data?.EC !== 0) return false;

    showAppToast({
      type: 'success',
      title: 'Đăng nhập',
      message: data?.EM || 'Đăng nhập thành công',
    });

    const dt = data?.DT || {};
    const user = dt?.user || null;
    if (!user) {
      showAppToast({
        type: 'error',
        title: 'Đăng nhập',
        message: 'Không lấy được thông tin người dùng',
      });
      return false;
    }

    const groupIdRaw = user?.groupId ?? user?.group_id;
    const groupId = Number(groupIdRaw);

    if (!applyAuthPayload(dt)) return false;

    const redirect = sessionStorage.getItem('redirectAfterLogin');
    if (redirect && isRedirectAllowedForGroup(groupId, redirect)) {
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirect, { replace: true });
      return true;
    }

    if (redirect) {
      sessionStorage.removeItem('redirectAfterLogin');
    }

    const homePath = getHomePathByGroupId(groupId);
    navigate(homePath, { replace: true });
    return true;
  };

  const handleLogin = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await loginUser(email, password, rememberMe);
      if (rememberMe) setRememberedEmail(email);
      else setRememberedEmail("");
      const data = response?.data;

      if (applyLoginSession(data)) {
        return;
      }

      const serverError = data?.EM || 'Có lỗi xảy ra';
      showAppToast({
        type: 'error',
        title: 'Đăng nhập',
        message: loginErrorMap[serverError] || serverError,
      });
    } catch (error) {
      console.error('Login error:', error);

      let errorMessage = 'Có lỗi xảy ra khi đăng nhập';
      if (error.response?.data?.EM) {
        errorMessage = error.response.data.EM;
      } else if (error.request) {
        errorMessage = 'Không thể kết nối đến server';
      }

      showAppToast({ type: 'error', title: 'Đăng nhập', message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    if (!credential) {
      showAppToast({
        type: 'error',
        title: 'Đăng nhập',
        message: 'Không nhận được mã xác thực từ Google',
      });
      return;
    }

    setGoogleLoading(true);
    try {
      const response = await loginWithGoogle(credential, rememberMe);
      const data = response?.data;

      if (applyLoginSession(data)) {
        return;
      }

      const serverError = data?.EM || 'Đăng nhập Google thất bại';
      showAppToast({
        type: 'error',
        title: 'Đăng nhập',
        message: loginErrorMap[serverError] || serverError,
      });
    } catch (error) {
      console.error('Google login error:', error);
      let errorMessage = 'Có lỗi xảy ra khi đăng nhập Google';
      if (error.response?.data?.EM) {
        const em = error.response.data.EM;
        errorMessage = loginErrorMap[em] || em;
      } else if (error.request) {
        errorMessage = 'Không thể kết nối đến server';
      }
      showAppToast({ type: 'error', title: 'Đăng nhập', message: errorMessage });
    } finally {
      setGoogleLoading(false);
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
    <div className="login-page auth-compact">
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
                    autoComplete="username"
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
                    autoComplete="current-password"
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

              <div className="login-rememberBox">
                <label className="login-rememberRow">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Lưu đăng nhập trên thiết bị này</span>
                </label>
                <p className="login-rememberHint">
                  Không lưu mật khẩu. Chỉ duy trì phiên an toàn bằng cookie bảo mật.
                </p>
              </div>

              <button type="submit" className="login-submit" disabled={isLoading || googleLoading}>
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

              {!showGoogleLogin && process.env.NODE_ENV === 'development' && (
                <p className="login-googleConfigHint">
                  <strong>Đăng nhập Google</strong> chưa bật: thêm{' '}
                  <code>REACT_APP_GOOGLE_CLIENT_ID</code> vào file <code>.env</code> trong thư mục{' '}
                  <code>GFMS_FE</code> (cùng giá trị với <code>GOOGLE_CLIENT_ID</code> ở backend), rồi{' '}
                  <strong>tắt và chạy lại</strong> <code>npm start</code>.
                </p>
              )}

              {showGoogleLogin && (
                <>
                  <div className="login-oauthDivider login-oauthDivider--enterprise">
                    <span>hoặc</span>
                  </div>
                  <div className="login-googleEnterprise">
                    <div className="login-googleEnterprise-panel">
                      <div className="login-googleEnterprise-header">
                        <div className="login-googleEnterprise-iconWrap" aria-hidden>
                          <ShieldCheck size={22} strokeWidth={1.75} />
                        </div>
                        <div className="login-googleEnterprise-copy">
                          <p className="login-googleEnterprise-desc">
                            Xác thực qua Google — hỗ trợ Google Workspace và tài khoản Gmail được cấp quyền truy cập.
                          </p>
                        </div>
                      </div>
                      <div className="login-googleEnterprise-action">
                        <GoogleLogin
                          onSuccess={(res) => {
                            if (res?.credential) handleGoogleCredential(res.credential);
                          }}
                          onError={() => {
                            showAppToast({
                              type: 'error',
                              title: 'Đăng nhập',
                              message: 'Đăng nhập Google bị từ chối hoặc lỗi',
                            });
                          }}
                          useOneTap={false}
                          theme="outline"
                          size="large"
                          width={320}
                          text="signin_with"
                          shape="rectangular"
                          logo_alignment="left"
                        />
                      </div>
                      <p className="login-googleEnterprise-trust">
                        <span className="login-googleEnterprise-trustDot" aria-hidden />
                        OAuth 2.0 · Kết nối TLS · Không lưu mật khẩu Google trên máy chủ GFMS
                      </p>
                    </div>
                    {googleLoading && (
                      <p className="login-googleHint login-googleHint--enterprise">
                        Đang xác thực với Google…
                      </p>
                    )}
                  </div>
                </>
              )}

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