// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import "./LoginPage.css";
// import { loginUser } from "../../services/authService";

// const LoginPage = () => {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   const [errors, setErrors] = useState({});
//   const [showPassword, setShowPassword] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);

//   const navigate = useNavigate();

//   const validateEmail = (email) => {
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     return emailRegex.test(email);
//   };

//   const validatePassword = (password) => password.length >= 6;

//   const handleEmailChange = (e) => {
//     const value = e.target.value;
//     setEmail(value);
//     if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
//   };

//   const handlePasswordChange = (e) => {
//     const value = e.target.value;
//     setPassword(value);
//     if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
//   };

//   const validateForm = () => {
//     const newErrors = {};

//     if (!email.trim()) newErrors.email = "Email là bắt buộc";
//     else if (!validateEmail(email))
//       newErrors.email = "Email không hợp lệ. Vui lòng nhập email đúng định dạng";

//     if (!password) newErrors.password = "Mật khẩu là bắt buộc";
//     else if (!validatePassword(password))
//       newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";

//     return newErrors;
//   };

//   // ✅ Map chuẩn theo groupId
//   // 1=Admin, 2=Owner, 3=Trainer, 4=Member, 5=Guest
//   const getHomePathByGroupId = (groupId) => {
//     const map = {
//       1: "/admin",
//       2: "/owner",
//       3: "/trainer",
//       4: "/member",
//       5: "/",
//     };
//     return map[groupId] || "/";
//   };

//   const handleLogin = async () => {
//     const validationErrors = validateForm();
//     if (Object.keys(validationErrors).length > 0) {
//       setErrors(validationErrors);
//       return;
//     }

//     setIsLoading(true);

//     try {
//       const response = await loginUser(email, password);
//       const data = response?.data;

//       console.log("✅ Login response:", data);

//       if (data?.EC === 0) {
//         alert(`✅ ${data?.EM || "Login success"}`);

//         const dt = data?.DT || {};
//         const user = dt?.user || {};
//         const accessToken = dt?.accessToken || "";

//         // ✅ groupId đôi khi là group_id (do config DB/Sequelize)
//         const groupIdRaw = user?.groupId ?? user?.group_id;
//         const groupId = Number(groupIdRaw);

//         console.log("✅ USER:", user);
//         console.log("✅ accessToken:", accessToken);
//         console.log("✅ groupId:", groupId);

//         // ✅ Lưu riêng token cho dễ gắn Authorization
//         localStorage.setItem("accessToken", accessToken);
//         localStorage.setItem("user", JSON.stringify(user));
//         localStorage.setItem("roles", JSON.stringify(dt?.roles || []));

//         // ✅ Redirect theo role
//         const homePath = getHomePathByGroupId(groupId);
//         navigate(homePath, { replace: true });

//         return;
//       }

//       // ❌ Login fail
//       const serverError = data?.EM || "Có lỗi xảy ra";
//       const errorMap = {
//         "User not found": "Email không tồn tại trong hệ thống",
//         "Wrong password": "Mật khẩu không đúng",
//         "Missing required fields": "Vui lòng điền đầy đủ thông tin",
//       };

//       alert(`❌ ${errorMap[serverError] || serverError}`);
//     } catch (error) {
//       console.error("❌ Login error:", error);

//       let errorMessage = "Có lỗi xảy ra khi đăng nhập";

//       if (error.response) {
//         errorMessage =
//           error.response?.data?.EM ||
//           `Lỗi ${error.response.status}: ${error.response.statusText}`;
//       } else if (error.request) {
//         errorMessage = "Không thể kết nối đến server. Vui lòng kiểm tra lại";
//       }

//       alert(`❌ ${errorMessage}`);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleForgotPassword = () => navigate("/forgot-password");
//   const handleRegister = () => navigate("/register");

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     handleLogin();
//   };

//   const handleEmailBlur = (e) => {
//     const value = e.target.value;
//     if (value.trim() && !validateEmail(value)) {
//       setErrors((prev) => ({
//         ...prev,
//         email: "Email không hợp lệ. Vui lòng nhập email đúng định dạng",
//       }));
//     }
//   };

//   const handlePasswordBlur = (e) => {
//     const value = e.target.value;
//     if (value && !validatePassword(value)) {
//       setErrors((prev) => ({
//         ...prev,
//         password: "Mật khẩu phải có ít nhất 6 ký tự",
//       }));
//     }
//   };

//   const togglePasswordVisibility = () => setShowPassword(!showPassword);

//   return (
//     <div className="login-page">
//       <div className="gym-background"></div>
//       <div className="login-overlay"></div>

//       <div className="login-container">
//         <div className="login-left">
//           <div className="brand-section">
//             <h1 className="logo">GFMS</h1>
//             <p className="slogan">GYM Franchise Management System</p>
//             <h2 className="tagline">
//               Smart Management
//               <br />
//               <span className="highlight">Professional Fitness</span>
//             </h2>

//             <div className="features">
//               <div className="feature">
//                 <span className="feature-icon">✓</span>
//                 <div className="feature-content">
//                   <h3>Quản lý đa phòng gym</h3>
//                   <p>Quản lý nhiều chi nhánh một cách hiệu quả</p>
//                 </div>
//               </div>
//               <div className="feature">
//                 <span className="feature-icon">✓</span>
//                 <div className="feature-content">
//                   <h3>Kết nối PT & Hội viên</h3>
//                   <p>Tương tác và quản lý mối quan hệ</p>
//                 </div>
//               </div>
//               <div className="feature">
//                 <span className="feature-icon">✓</span>
//                 <div className="feature-content">
//                   <h3>Theo dõi hiệu suất</h3>
//                   <p>Phân tích dữ liệu thành viên</p>
//                 </div>
//               </div>
//               <div className="feature">
//                 <span className="feature-icon">✓</span>
//                 <div className="feature-content">
//                   <h3>Hệ thống báo cáo thông minh</h3>
//                   <p>Báo cáo chi tiết và tùy chỉnh</p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="login-right">
//           <div className="login-card">
//             <div className="login-header">
//               <h2>Chào mừng trở lại</h2>
//               <p>Đăng nhập để tiếp tục sử dụng hệ thống</p>
//             </div>

//             <form onSubmit={handleSubmit} className="login-form">
//               <div className="form-group">
//                 <label htmlFor="email">Email</label>
//                 <div className="input-with-icon">
//                   <span className="input-icon">📧</span>
//                   <input
//                     type="email"
//                     id="email"
//                     name="email"
//                     value={email}
//                     onChange={handleEmailChange}
//                     onBlur={handleEmailBlur}
//                     placeholder="Nhập email của bạn"
//                     className={errors.email ? "error" : ""}
//                   />
//                 </div>
//                 {errors.email && (
//                   <span className="error-message">{errors.email}</span>
//                 )}
//               </div>

//               <div className="form-group">
//                 <label htmlFor="password">Mật khẩu</label>
//                 <div className="input-with-icon">
//                   <span className="input-icon">🔒</span>
//                   <input
//                     type={showPassword ? "text" : "password"}
//                     id="password"
//                     name="password"
//                     value={password}
//                     onChange={handlePasswordChange}
//                     onBlur={handlePasswordBlur}
//                     placeholder="Nhập mật khẩu"
//                     className={errors.password ? "error" : ""}
//                   />
//                   <button
//                     type="button"
//                     className="password-toggle"
//                     onClick={togglePasswordVisibility}
//                     aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
//                   >
//                     {showPassword ? "👁️ Ẩn" : "👁️‍🗨️ Hiện"}
//                   </button>
//                 </div>
//                 {errors.password && (
//                   <span className="error-message">{errors.password}</span>
//                 )}
//               </div>

//               <div className="form-options">
//                 <button
//                   type="button"
//                   className="forgot-password-btn"
//                   onClick={handleForgotPassword}
//                 >
//                   Quên mật khẩu?
//                 </button>
//               </div>

//               <button type="submit" className="login-button" disabled={isLoading}>
//                 {isLoading ? (
//                   <>
//                     <span className="spinner"></span>
//                     Đang đăng nhập...
//                   </>
//                 ) : (
//                   "Đăng nhập"
//                 )}
//               </button>

//               <div className="register-section">
//                 <p>
//                   Chưa có tài khoản?{" "}
//                   <button
//                     type="button"
//                     className="register-btn"
//                     onClick={handleRegister}
//                   >
//                     Đăng ký ngay
//                   </button>
//                 </p>
//               </div>
//             </form>

//             <div className="copyright">
//               <p>
//                 &copy; {new Date().getFullYear()} GFMS. Bản quyền thuộc về GYM
//                 Franchise Management System.
//               </p>
//               <p style={{ fontSize: "0.8rem", marginTop: "5px" }}>
//                 Demo account: admin@gym.com / mật khẩu: 123456
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LoginPage;
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import { loginUser } from '../../services/authService';

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
    console.log(`Changing email to:`, value);
    setEmail(value);
    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    console.log(`Changing password to:`, value);
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

  const getHomePathByGroupId = (groupId) => {
    // Mapping chuẩn theo DB groupId của bạn:
    // 1=Admin, 2=Owner, 3=Trainer, 4=Member, 5=Guest
    const map = {
      1: '/admin',     // admin area
      2: '/owner',          // tạm thời chưa có owner page => về home
      3: '/pt',          // tạm thời chưa có trainer page => về home
      4: '/member',          // tạm thời chưa có member page => về home
      5: '/',          // guest => home
    };
    return map[groupId] || '/';
  };

  const handleLogin = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);

    try {
      let response = await loginUser(email, password);
      console.log('Login response:', response.data);

      if (response.data.EC === 0) {
        alert(`✅ ${response.data.EM}`);

        // ✅ Lưu full DT (đang chứa access_Token + user)
        localStorage.setItem('user', JSON.stringify(response.data.DT));

        const groupId = response?.data?.DT?.user?.groupId;
        const homePath = getHomePathByGroupId(groupId);

       navigate(homePath, { replace: true });
      } else {
        const serverError = response.data.EM;
        let userFriendlyMessage = serverError;

        const errorMap = {
          'User not found': 'Email không tồn tại trong hệ thống',
          'Wrong password': 'Mật khẩu không đúng',
          'Missing required fields': 'Vui lòng điền đầy đủ thông tin',
          'The email is already exist': 'Email đã tồn tại',
          'The phone number is already exist': 'Số điện thoại đã tồn tại',
          'The username is already exist': 'Tên người dùng đã tồn tại',
          'Create new user success': 'Đăng ký thành công',
          'Login success': 'Đăng nhập thành công'
        };

        if (errorMap[serverError]) userFriendlyMessage = errorMap[serverError];
        alert(`❌ ${userFriendlyMessage}`);
      }
    } catch (error) {
      console.error('Login error:', error);

      let errorMessage = "Có lỗi xảy ra khi đăng nhập";
      if (error.response) {
        if (error.response.data && error.response.data.EM) {
          errorMessage = error.response.data.EM;
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
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

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
            <h2 className="tagline">Smart Management<br/><span className="highlight">Professional Fitness</span></h2>

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
                    className={errors.email ? 'error' : ''}
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
                    className={errors.password ? 'error' : ''}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? '👁️ Ẩn' : '👁️‍🗨️ Hiện'}
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

              <button
                type="submit"
                className="login-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Đang đăng nhập...
                  </>
                ) : (
                  'Đăng nhập'
                )}
              </button>

              <div className="register-section">
                <p>
                  Chưa có tài khoản?{' '}
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
              <p>&copy; {new Date().getFullYear()} GFMS. Bản quyền thuộc về GYM Franchise Management System.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '5px' }}>
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