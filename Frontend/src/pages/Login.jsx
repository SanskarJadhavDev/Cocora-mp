import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../css/login.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated, isAdmin } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    rememberMe: false
  });

  const [errors, setErrors] = useState({});
  const [statusNotice, setStatusNotice] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else {
        const from = location.state?.from || '/';
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, isAdmin, navigate, location.state]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^\S+@\S+\.\S+$/;

    if (isRegister) {
      if (!formData.name.trim()) {
        newErrors.name = 'Full name is required';
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (isRegister) {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusNotice('');

    if (!validate() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isRegister) {
        const user = await register(formData.name.trim(), formData.email.trim(), formData.password);
        if (user && user.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          const from = location.state?.from || '/';
          navigate(from, { replace: true });
        }
      } else {
        const user = await login(formData.email.trim(), formData.password);
        if (user && user.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          const from = location.state?.from || '/';
          navigate(from, { replace: true });
        }
      }
    } catch (err) {
      setStatusNotice(err.message || 'Authentication failed. Please verify your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (registerMode) => {
    setIsRegister(registerMode);
    setErrors({});
    setStatusNotice('');
  };

  return (
    <div>
      <main className="auth-main">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <p className="section-tag">{isRegister ? 'CREATE ACCOUNT' : 'WELCOME BACK'}</p>
              <h1 className="auth-title">{isRegister ? 'Join Cocora' : 'Sign in to Cocora'}</h1>
              <p className="auth-subtitle">
                {isRegister
                  ? 'Craft your personal chocolate boxes and track gifts.'
                  : 'Manage your curated boxes and orders.'}
              </p>
            </div>

            {statusNotice && (
              <div className="auth-notice" style={{ marginBottom: '1.25rem' }}>
                {statusNotice}
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {isRegister && (
                <div className="auth-field">
                  <label htmlFor="auth-name" className="auth-label">Full Name</label>
                  <input
                    type="text"
                    id="auth-name"
                    name="name"
                    className={`auth-input ${errors.name ? 'auth-input-error' : ''}`}
                    placeholder="Aditya Sharma"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                  {errors.name && <span className="field-error-text">{errors.name}</span>}
                </div>
              )}

              <div className="auth-field">
                <label htmlFor="auth-email" className="auth-label">Email Address</label>
                <input
                  type="email"
                  id="auth-email"
                  name="email"
                  className={`auth-input ${errors.email ? 'auth-input-error' : ''}`}
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {errors.email && <span className="field-error-text">{errors.email}</span>}
              </div>

              <div className="auth-field">
                <label htmlFor="auth-password" className="auth-label">Password</label>
                <div className="auth-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="auth-password"
                    name="password"
                    className={`auth-input ${errors.password ? 'auth-input-error' : ''}`}
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="auth-toggle-pwd"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.password && <span className="field-error-text">{errors.password}</span>}
              </div>

              {isRegister && (
                <div className="auth-field">
                  <label htmlFor="auth-confirm-password" className="auth-label">Confirm Password</label>
                  <div className="auth-input-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="auth-confirm-password"
                      name="confirmPassword"
                      className={`auth-input ${errors.confirmPassword ? 'auth-input-error' : ''}`}
                      placeholder="Repeat password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="auth-toggle-pwd"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <span className="field-error-text">{errors.confirmPassword}</span>
                  )}
                </div>
              )}

              {!isRegister && (
                <div className="auth-options-row">
                  <label className="auth-checkbox-label">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      className="auth-checkbox"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                    />
                    <span>Remember me</span>
                  </label>
                  <a
                    href="#forgot"
                    className="auth-forgot-link"
                    onClick={(e) => e.preventDefault()}
                  >
                    Forgot password?
                  </a>
                </div>
              )}

              <button
                type="submit"
                className="btn-primary auth-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? (isRegister ? 'Creating Account...' : 'Logging in...')
                  : (isRegister ? 'Create Account' : 'Login')}
              </button>
            </form>

            <div className="auth-switch">
              {isRegister ? (
                <>
                  <span>Already have an account?</span>
                  <button
                    type="button"
                    className="auth-switch-btn"
                    onClick={() => switchMode(false)}
                  >
                    Login
                  </button>
                </>
              ) : (
                <>
                  <span>Don't have an account?</span>
                  <button
                    type="button"
                    className="auth-switch-btn"
                    onClick={() => switchMode(true)}
                  >
                    Create Account
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div className="footer-brand">
              <p className="footer-brand-name">Cocora</p>
              <p className="footer-brand-desc">
                A small chocolate kitchen in Bandra West. We make twelve things and we
                make them well.
              </p>
            </div>
            <div>
              <p className="footer-heading">Shop</p>
              <ul className="footer-links">
                <li><Link to="/collection">The collection</Link></li>
                <li><Link to="/build">Build a box</Link></li>
                <li><Link to="/#trays">Tray sizes</Link></li>
              </ul>
            </div>
            <div>
              <p className="footer-heading">Kitchen</p>
              <ul className="footer-links">
                <li>Perry Cross Rd, Bandra West</li>
                <li>Tue to Sun, 11am to 8pm</li>
                <li>kitchen@cocora.in</li>
              </ul>
            </div>
          </div>
          <p className="footer-bottom">
            © 2026 Cocora Chocolate Co. — Mumbai
          </p>
        </div>
      </footer>
    </div>
  );
}
