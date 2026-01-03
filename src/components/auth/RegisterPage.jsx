import React, {  useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RegisterPage.css';
// import axios from 'axios';
import { registerNewUser } from '../../services/authService';

const RegisterPage = () => {
  // Sử dụng state riêng cho từng field
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
  // Validate form trước
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
      // Success
      alert(`✅ ${response.data.EM}`);
      navigate('/login');
    } else {
      // Error từ server
      const serverError = response.data.EM;
      let userFriendlyMessage = serverError;
      
      // Chuyển đổi thông báo lỗi từ server sang tiếng Việt
      const errorMap = {
        'The email is already exist': 'Email đã tồn tại trong hệ thống',
        'The phone number is already exist': 'Số điện thoại đã được sử dụng',
        'The username is already exist': 'Tên người dùng đã tồn tại',
        'Missing required fields': 'Vui lòng điền đầy đủ thông tin',
        'Create new user success': 'Đăng ký thành công!',
        'Something went wrong in service...': 'Có lỗi xảy ra, vui lòng thử lại sau'
      };
      
      if (errorMap[serverError]) {
        userFriendlyMessage = errorMap[serverError];
      }
      
      alert(`❌ ${userFriendlyMessage}`);
      
      // Có thể highlight field bị lỗi
      if (serverError.includes('email')) {
        setErrors(prev => ({ ...prev, email: 'Email đã tồn tại' }));
      }
      if (serverError.includes('phone')) {
        setErrors(prev => ({ ...prev, phone: 'Số điện thoại đã được sử dụng' }));
      }
      if (serverError.includes('username')) {
        setErrors(prev => ({ ...prev, username: 'Tên người dùng đã tồn tại' }));
      }
    }
  } catch (error) {
    console.error('Register error:', error);
    
    let errorMessage = "Có lỗi xảy ra khi đăng ký";
    
    if (error.response) {
      // Lỗi từ server response
      if (error.response.data && error.response.data.EM) {
        const serverError = error.response.data.EM;
        const errorMap = {
          'Missing required fields': 'Vui lòng điền đầy đủ thông tin',
          'The email is already exist': 'Email đã tồn tại',
          'The phone number is already exist': 'Số điện thoại đã tồn tại',
          'The username is already exist': 'Tên người dùng đã tồn tại'
        };
        
        errorMessage = errorMap[serverError] || serverError;
      } else {
        errorMessage = `Lỗi ${error.response.status}: ${error.response.statusText}`;
      }
    } else if (error.request) {
      errorMessage = "Không thể kết nối đến server. Vui lòng kiểm tra lại";
    }
    
    alert(`❌ ${errorMessage}`);
  } finally {
    setIsLoading(false);
  }
}



  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!email) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email không hợp lệ';
    }
    
    // Phone number validation
    if (!phone) {
      newErrors.phone = 'Số điện thoại là bắt buộc';
    } else if (!/^\d{10,11}$/.test(phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }
    
    // Username validation
    if (!username.trim()) {
      newErrors.username = 'Tên người dùng là bắt buộc';
    } else if (username.length < 3) {
      newErrors.username = 'Tên người dùng phải có ít nhất 3 ký tự';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới';
    }
    
    // Password validation
    if (!password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (password.length < 8) {
      newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số';
    }
    
    // Confirm password validation
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
    
    // Tạo object data để gửi API
    const formData = {
      email,
      phone,
      username,
      password,
      agreeTerms
    };
    
    // Simulate API call
    setTimeout(() => {
      console.log('Registration data:', formData);
      setIsLoading(false);
      // navigate('/login');
    }, 2000);
  };

  const handleLogin = () => {
    navigate('/login');
  };
  const isFormEmpty = !email || !phone || !username || !password || !confirmPassword || !agreeTerms;
  return (
    <div className="register-page">
      <div className="gym-background"></div>
      <div className="register-overlay"></div>
      
      <div className="register-container">
        <div className="register-left">
          <div className="brand-section" style={{marginBottom:"350px"}}>
            <h1 className="logo">GFMS</h1>
            <p className="slogan">GYM Franchise Management System</p>
            <h2 className="tagline">Smart Management<br/><span className="highlight">Professional Fitness</span></h2>
            
            <div className="features">
              <div className="feature">
                <span className="feature-icon">🚀</span>
                <div className="feature-content">
                  <h3>Bắt đầu hành trình của bạn</h3>
                  <p>Tham gia hệ thống quản lý phòng gym hàng đầu</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">🔒</span>
                <div className="feature-content">
                  <h3>Bảo mật tuyệt đối</h3>
                  <p>Dữ liệu của bạn được mã hóa và bảo vệ 24/7</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">📈</span>
                <div className="feature-content">
                  <h3>Quản lý thông minh</h3>
                  <p>Công cụ phân tích và báo cáo chuyên nghiệp</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">👥</span>
                <div className="feature-content">
                  <h3>Cộng đồng rộng lớn</h3>
                  <p>Kết nối với hàng nghìn phòng gym và PT</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="register-right">
          <div className="register-card">
            <div className="register-header">
              <h2>Tạo tài khoản GFMS</h2>
              <p>Điền thông tin để bắt đầu sử dụng hệ thống</p>
            </div>

            <form onSubmit={handleSubmit} className="register-form">
              <div className="form-group">
                <label htmlFor="email">Email:</label>
                <div className="input-with-icon">
                  <span className="input-icon">📧</span>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className={errors.email ? 'error' : ''}
                  />
                </div>
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone number:</label>
                <div className="input-with-icon">
                  <span className="input-icon">📱</span>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number"
                    className={errors.phone ? 'error' : ''}
                  />
                </div>
                {errors.phone && <span className="error-message">{errors.phone}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="username">Username:</label>
                <div className="input-with-icon">
                  <span className="input-icon">👤</span>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className={errors.username ? 'error' : ''}
                  />
                </div>
                {errors.username && <span className="error-message">{errors.username}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="password">Password:</label>
                <div className="input-with-icon">
                  <span className="input-icon">🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className={errors.password ? 'error' : ''}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Ẩn' : 'Hiện'}
                  </button>
                </div>
                {errors.password && <span className="error-message">{errors.password}</span>}
                
                <div className="password-requirements">
                  <p>Mật khẩu phải có:</p>
                  <ul>
                    <li className={password.length >= 8 ? 'valid' : ''}>Ít nhất 8 ký tự</li>
                    <li className={/(?=.*[a-z])/.test(password) ? 'valid' : ''}>1 chữ cái thường</li>
                    <li className={/(?=.*[A-Z])/.test(password) ? 'valid' : ''}>1 chữ cái hoa</li>
                    <li className={/(?=.*\d)/.test(password) ? 'valid' : ''}>1 chữ số</li>
                  </ul>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Re-enter password:</label>
                <div className="input-with-icon">
                  <span className="input-icon">🔒</span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className={errors.confirmPassword ? 'error' : ''}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? 'Ẩn' : 'Hiện'}
                  </button>
                </div>
                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
              </div>

              <div className="terms-section">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  <span className="terms-text">
                    Tôi đồng ý với <button type="button" className="terms-link">Điều khoản sử dụng</button> và <button type="button" className="terms-link">Chính sách bảo mật</button> của GFMS
                  </span>
                </label>
                {errors.agreeTerms && <span className="error-message">{errors.agreeTerms}</span>}
              </div>

              <button 
                type="submit" 
                className="register-button"
                disabled={isLoading || isFormEmpty}
                onClick={() => handleRegister()}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Đang đăng ký...
                  </>
                ) : (
                  'Đăng ký tài khoản'
                )}
              </button>

              <div className="login-section">
                <p>
                  Đã có tài khoản?{' '}
                  <button 
                    type="button" 
                    className="login-btn"
                    onClick={handleLogin}
                  >
                    Đăng nhập ngay
                  </button>
                </p>
              </div>
            </form>

            <div className="copyright">
              <p>&copy; {new Date().getFullYear()} GFMS. Bản quyền thuộc về GYM Franchise Management System.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;