import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../services/api';
import '../css/login.css';

const STORAGE_KEY = 'cocora_reset_session';

export default function ForgotPassword() {
  const [step, setStep] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.step && parsed.step >= 1 && parsed.step <= 3) {
          return parsed.step;
        }
      }
    } catch {}
    return 1;
  });

  const [email, setEmail] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved).email || '';
      }
    } catch {}
    return '';
  });

  const [resetToken, setResetToken] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved).resetToken || '';
      }
    } catch {}
    return '';
  });

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    try {
      if (step === 4) {
        sessionStorage.removeItem(STORAGE_KEY);
      } else {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, email, resetToken }));
      }
    } catch {}
  }, [step, email, resetToken]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address');
      return;
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please provide a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authApi.forgotPassword(trimmedEmail);
      setInfoMessage(res?.message || 'If an account exists with this email, a verification code has been sent.');
      setCooldown(60);
      setStep(2);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to request verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || isSubmitting) return;
    setErrorMessage('');
    setInfoMessage('');
    setIsSubmitting(true);

    try {
      const res = await authApi.forgotPassword(email.trim());
      setInfoMessage(res?.message || 'A new verification code has been sent.');
      setCooldown(60);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    const trimmedOtp = otp.trim();
    if (!trimmedOtp || !/^\d{6}$/.test(trimmedOtp)) {
      setErrorMessage('Please enter a valid 6-digit verification code');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authApi.verifyResetOtp(email.trim(), trimmedOtp);
      if (res && res.resetToken) {
        setResetToken(res.resetToken);
        setInfoMessage('Code verified successfully. Please enter your new password.');
        setStep(3);
      } else {
        setErrorMessage('Verification failed. Please try requesting a new code.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (!newPassword) {
      setErrorMessage('Password is required');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (!resetToken) {
      setErrorMessage('Verification session has expired. Please restart the reset process.');
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authApi.resetPassword(email.trim(), resetToken, newPassword);
      setInfoMessage(res?.message || 'Password reset successfully.');
      setStep(4);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reset password. Please start over.');
      if (err.status === 400 && err.message && err.message.toLowerCase().includes('expired')) {
        setStep(1);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestart = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    setStep(1);
    setEmail('');
    setOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setInfoMessage('');
    setCooldown(0);
  };

  return (
    <main className="auth-main">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">
              {step === 4 ? 'Password Reset' : 'Reset Password'}
            </h1>
            <p className="auth-subtitle">
              {step === 1 && 'Enter your registered email address to receive a verification code.'}
              {step === 2 && 'Enter the 6-digit code sent to your email address.'}
              {step === 3 && 'Create a strong new password for your account.'}
              {step === 4 && 'Your password has been updated successfully.'}
            </p>
          </div>

          {infoMessage && (
            <div className="auth-notice" style={{ marginBottom: '1.5rem' }}>
              {infoMessage}
            </div>
          )}

          {errorMessage && (
            <div
              className="auth-notice"
              style={{
                marginBottom: '1.5rem',
                backgroundColor: 'rgba(224, 108, 117, 0.15)',
                borderColor: '#E06C75',
                color: '#E06C75'
              }}
            >
              {errorMessage}
            </div>
          )}

          {step === 1 && (
            <form className="auth-form" onSubmit={handleRequestOtp}>
              <div className="auth-field">
                <label htmlFor="forgot-email" className="auth-label">Registered Email</label>
                <input
                  type="email"
                  id="forgot-email"
                  name="email"
                  className="auth-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="email"
                  required
                />
              </div>

              <button
                type="submit"
                id="request-otp-btn"
                className="btn-primary auth-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending Code...' : 'Send Verification Code'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form className="auth-form" onSubmit={handleVerifyOtp}>
              <div className="auth-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="forgot-otp" className="auth-label">6-Digit Code</label>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(245, 237, 224, 0.6)' }}>
                    Sent to {email}
                  </span>
                </div>
                <input
                  type="text"
                  id="forgot-otp"
                  name="otp"
                  className="auth-input"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={isSubmitting}
                  style={{
                    textAlign: 'center',
                    letterSpacing: '0.5rem',
                    fontSize: '1.5rem',
                    fontWeight: '700'
                  }}
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                id="verify-otp-btn"
                className="btn-primary auth-submit-btn"
                disabled={isSubmitting || otp.trim().length !== 6}
              >
                {isSubmitting ? 'Verifying...' : 'Verify Code'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  id="resend-otp-btn"
                  className="auth-switch-btn"
                  style={{ background: 'none', border: 'none', padding: 0 }}
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || isSubmitting}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
                </button>
                <button
                  type="button"
                  className="auth-forgot-link"
                  style={{ background: 'none', border: 'none', padding: 0 }}
                  onClick={handleRestart}
                >
                  Change Email
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form className="auth-form" onSubmit={handleResetPassword}>
              <div className="auth-field">
                <label htmlFor="new-password" className="auth-label">New Password</label>
                <div className="auth-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="new-password"
                    name="newPassword"
                    className="auth-input"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                  <button
                    type="button"
                    className="auth-toggle-pwd"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="confirm-password" className="auth-label">Confirm New Password</label>
                <div className="auth-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirm-password"
                    name="confirmPassword"
                    className="auth-input"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                  <button
                    type="button"
                    className="auth-toggle-pwd"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="reset-password-btn"
                className="btn-primary auth-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating Password...' : 'Reset Password'}
              </button>
            </form>
          )}

          {step === 4 && (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(212, 175, 55, 0.15)',
                  border: '2px solid #D4AF37',
                  color: '#D4AF37',
                  fontSize: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto'
                }}
              >
                ✓
              </div>
              <p style={{ color: '#F5EDE0', fontSize: '1rem', lineHeight: '1.6' }}>
                Your password has been securely updated. You can now log in to your account with your new credentials.
              </p>
              <Link to="/login" id="login-after-reset-link" className="btn-primary auth-submit-btn" style={{ textDecoration: 'none' }}>
                Proceed to Login
              </Link>
            </div>
          )}

          {step !== 4 && (
            <div className="auth-switch">
              <span>Remember your password?</span>
              <Link to="/login" className="auth-switch-btn">
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
