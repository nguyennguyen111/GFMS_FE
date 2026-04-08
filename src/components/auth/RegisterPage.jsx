import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Phone,
  User,
  Lock,
  ChevronRight,
  Check,
  ShieldCheck,
  Rocket,
  LineChart,
  Users,
} from 'lucide-react';
import './RegisterPage.css';
import { registerNewUser } from '../../services/authService';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const navigate = useNavigate();

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!agreeTerms) {
      alert('Bạn phải đồng ý với điều khoản sử dụng');
      return;
    }

    setIsLoading(true);

    try {
      let response = await registerNewUser(email, phone, username, password);

      console.log('Register response:', response.data);

      if (response.data.EC === 0) {
        alert(`✅ ${response.data.EM}`);
        navigate('/login');
      } else {
        const serverError = response.data.EM;
        let userFriendlyMessage = serverError;

        const errorMap = {
          'The email is already exist': 'Email đã tồn tại trong hệ thống',
          'The phone number is already exist': 'Số điện thoại đã được sử dụng',
          'The username is already exist': 'Tên người dùng đã tồn tại',
          'Missing required fields': 'Vui lòng điền đầy đủ thông tin',
          'Create new user success': 'Đăng ký thành công!',
          'Something went wrong in service...': 'Có lỗi xảy ra, vui lòng thử lại sau',
        };

        if (errorMap[serverError]) {
          userFriendlyMessage = errorMap[serverError];
        }

        alert(`❌ ${userFriendlyMessage}`);

        if (serverError.includes('email')) {
          setErrors((prev) => ({ ...prev, email: 'Email đã tồn tại' }));
        }
        if (serverError.includes('phone')) {
          setErrors((prev) => ({ ...prev, phone: 'Số điện thoại đã được sử dụng' }));
        }
        if (serverError.includes('username')) {
          setErrors((prev) => ({ ...prev, username: 'Tên người dùng đã tồn tại' }));
        }
      }
    } catch (error) {
      console.error('Register error:', error);

      let errorMessage = 'Có lỗi xảy ra khi đăng ký';

      if (error.response) {
        if (error.response.data && error.response.data.EM) {
          const serverError = error.response.data.EM;
          const errorMap = {
            'Missing required fields': 'Vui lòng điền đầy đủ thông tin',
            'The email is already exist': 'Email đã tồn tại',
            'The phone number is already exist': 'Số điện thoại đã tồn tại',
            'The username is already exist': 'Tên người dùng đã tồn tại',
          };

          errorMessage = errorMap[serverError] || serverError;
        } else {
          errorMessage = `Lỗi ${error.response.status}: ${error.response.statusText}`;
        }
      } else if (error.request) {
        errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra lại';
      }

      alert(`❌ ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!phone) {
      newErrors.phone = 'Số điện thoại là bắt buộc';
    } else if (!/^\d{10,11}$/.test(phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    if (!username.trim()) {
      newErrors.username = 'Tên người dùng là bắt buộc';
    } else if (username.length < 3) {
      newErrors.username = 'Tên người dùng phải có ít nhất 3 ký tự';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới';
    }

    if (!password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (password.length < 8) {
      newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng nhập lại mật khẩu';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu không khớp';
    }

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = validateForm();

    if (!agreeTerms) {
      newErrors.agreeTerms = 'Bạn phải đồng ý với điều khoản sử dụng';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    const formData = {
      email,
      phone,
      username,
      password,
      agreeTerms,
    };

    setTimeout(() => {
      console.log('Registration data:', formData);
      setIsLoading(false);
    }, 2000);
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const isFormEmpty = !email || !phone || !username || !password || !confirmPassword || !agreeTerms;

  return (
    <div className="register-page auth-compact">
      <div className="register-page__glow register-page__glow--left" />
      <div className="register-page__glow register-page__glow--right" />

      <div className="register-shell">
        <section className="register-branding">
          <div className="register-kicker">Elite System Access</div>

          <h1 className="register-branding__title">
            NÂNG TẦM <br />
            <span>HIỆU SUẤT</span>
          </h1>

          <p className="register-branding__desc">
            Hệ thống quản lý phòng gym cao cấp dành cho những chủ sở hữu theo đuổi
            vận hành chuyên nghiệp, tăng trưởng bền vững và trải nghiệm khách hàng vượt trội.
          </p>

          <div className="register-branding__ad">
            <div className="register-branding__adHead">
              <span>Giải pháp gợi ý</span>
            </div>

            <div className="register-branding__adBody">
              <div className="register-branding__adMedia">
                <Rocket size={28} />
              </div>

              <div>
                <h3>Tăng tốc vận hành chuỗi phòng gym</h3>
                <p>Tối ưu quản lý hội viên, PT, booking và dữ liệu kinh doanh trong một nền tảng thống nhất.</p>
              </div>
            </div>
          </div>

          <div className="register-featureList">
            <div className="register-featureItem">
              <div className="register-featureIcon">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3>Bảo mật tuyệt đối</h3>
                <p>Dữ liệu vận hành và tài khoản được bảo vệ theo quy trình an toàn.</p>
              </div>
            </div>

            <div className="register-featureItem">
              <div className="register-featureIcon">
                <LineChart size={18} />
              </div>
              <div>
                <h3>Quản lý thông minh</h3>
                <p>Theo dõi hiệu suất kinh doanh và hành vi hội viên dễ dàng hơn.</p>
              </div>
            </div>

            <div className="register-featureItem">
              <div className="register-featureIcon">
                <Users size={18} />
              </div>
              <div>
                <h3>Cộng đồng rộng lớn</h3>
                <p>Kết nối với hệ sinh thái gym, PT và thành viên trên toàn hệ thống.</p>
              </div>
            </div>
          </div>

          <div className="register-stats">
            <div className="register-statItem">
              <div className="register-statValue">500+</div>
              <div className="register-statLabel">Đối tác tin dùng</div>
            </div>
            <div className="register-statItem">
              <div className="register-statValue">98%</div>
              <div className="register-statLabel">Sự hài lòng</div>
            </div>
          </div>
        </section>

        <section className="register-panel">
          <div className="register-card">
            <div className="register-card__header">
              <p className="register-card__eyebrow">Create Account</p>
              <h2>Bắt đầu hành trình</h2>
              <p>Tạo tài khoản để khởi tạo hệ thống GFMS của bạn.</p>
            </div>

            <form onSubmit={handleSubmit} className="register-form">
              <div className="register-form__group">
                <label htmlFor="email" className="register-label">Email</label>
                <div className="register-inputWrap">
                  <Mail size={18} className="register-inputIcon" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@gym.vn"
                    className={`register-input ${errors.email ? 'is-error' : ''}`}
                  />
                </div>
                {errors.email && <span className="register-error">{errors.email}</span>}
              </div>

              <div className="register-form__group">
                <label htmlFor="phone" className="register-label">Số điện thoại</label>
                <div className="register-inputWrap">
                  <Phone size={18} className="register-inputIcon" />
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0901234567"
                    className={`register-input ${errors.phone ? 'is-error' : ''}`}
                  />
                </div>
                {errors.phone && <span className="register-error">{errors.phone}</span>}
              </div>

              <div className="register-form__group">
                <label htmlFor="username" className="register-label">Tên người dùng</label>
                <div className="register-inputWrap">
                  <User size={18} className="register-inputIcon" />
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your_username"
                    className={`register-input ${errors.username ? 'is-error' : ''}`}
                  />
                </div>
                {errors.username && <span className="register-error">{errors.username}</span>}
              </div>

              <div className="register-form__group">
                <label htmlFor="password" className="register-label">Mật khẩu</label>
                <div className="register-inputWrap">
                  <Lock size={18} className="register-inputIcon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`register-input ${errors.password ? 'is-error' : ''}`}
                  />
                  <button
                    type="button"
                    className="register-passwordToggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <span className="register-error">{errors.password}</span>}

                <div className="register-passwordRules">
                  <p>Mật khẩu cần có:</p>
                  <ul>
                    <li className={password.length >= 8 ? 'is-valid' : ''}>Ít nhất 8 ký tự</li>
                    <li className={/(?=.*[a-z])/.test(password) ? 'is-valid' : ''}>1 chữ thường</li>
                    <li className={/(?=.*[A-Z])/.test(password) ? 'is-valid' : ''}>1 chữ hoa</li>
                    <li className={/(?=.*\d)/.test(password) ? 'is-valid' : ''}>1 chữ số</li>
                  </ul>
                </div>
              </div>

              <div className="register-form__group">
                <label htmlFor="confirmPassword" className="register-label">Xác nhận mật khẩu</label>
                <div className="register-inputWrap">
                  <Lock size={18} className="register-inputIcon" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`register-input ${errors.confirmPassword ? 'is-error' : ''}`}
                  />
                  <button
                    type="button"
                    className="register-passwordToggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className="register-error">{errors.confirmPassword}</span>
                )}
              </div>

              <div className="register-terms">
                <label className="register-checkbox">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                  />
                  <span className="register-checkmark">
                    <Check size={14} />
                  </span>
                  <span className="register-termsText">
                    Tôi đồng ý với
                    <button type="button" className="register-termsLink">Điều khoản sử dụng</button>
                    và
                    <button type="button" className="register-termsLink">Chính sách bảo mật</button>
                    của GFMS
                  </span>
                </label>
                {errors.agreeTerms && <span className="register-error">{errors.agreeTerms}</span>}
              </div>

              <button
                type="submit"
                className="register-submit"
                disabled={isLoading || isFormEmpty}
                onClick={() => handleRegister()}
              >
                {isLoading ? (
                  <>
                    <span className="register-spinner" />
                    Đang đăng ký...
                  </>
                ) : (
                  <>
                    <span>Tạo tài khoản</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="register-loginBox">
                <p>
                  Đã có tài khoản?
                  <button type="button" className="register-loginBtn" onClick={handleLogin}>
                    Đăng nhập ngay <ChevronRight size={15} />
                  </button>
                </p>
              </div>
            </form>

            <div className="register-card__footer">
              <p>&copy; {new Date().getFullYear()} GFMS. Bản quyền thuộc về GYM Franchise Management System.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default RegisterPage;