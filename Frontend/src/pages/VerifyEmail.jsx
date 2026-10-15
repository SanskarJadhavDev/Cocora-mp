import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../services/api';
import '../css/login.css';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(Boolean(token));
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const performVerification = async () => {
      try {
        const response = await authApi.verifyEmail(token);
        if (isMounted) {
          setSuccess(true);
          setErrorMessage('');
        }
      } catch (err) {
        if (isMounted) {
          setSuccess(false);
          setErrorMessage(err.message || 'Invalid or expired verification link.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    performVerification();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      setResendStatus('Please enter your email address.');
      return;
    }

    setIsResending(true);
    setResendStatus('');

    try {
      const response = await authApi.resendVerification(resendEmail.trim());
      setResendStatus(response?.message || 'Verification email resent successfully. Please check your inbox.');
    } catch (err) {
      setResendStatus(err.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div>
      <main className="auth-main">
        <div className="auth-container">
          <div className="auth-card" style={{ textAlign: 'center' }}>
            <div className="auth-header">
              <p className="section-tag">ACCOUNT VERIFICATION</p>
              <h1 className="auth-title">
                {loading
                  ? 'Verifying Email...'
                  : success
                  ? 'Email Verified'
                  : 'Email Verification'}
              </h1>
              <p className="auth-subtitle">
                {loading
                  ? 'Please wait while we verify your Cocora account.'
                  : success
                  ? 'Your account has been successfully verified. You can now sign in.'
                  : token
                  ? 'We could not verify your email address.'
                  : 'Enter your email below to receive a verification link.'}
              </p>
            </div>

            {loading && (
              <div style={{ padding: '2rem 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
                <p className="build-text">Activating your Cocora membership...</p>
              </div>
            )}

            {!loading && success && (
              <div style={{ padding: '1rem 0' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem' }}>✨</div>
                <div className="auth-notice" style={{ marginBottom: '1.5rem', borderColor: '#D4AF37' }}>
                  Your email address is verified. Welcome to Cocora Chocolates!
                </div>
                <Link to="/login" className="btn-primary auth-submit-btn" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
                  Proceed to Login
                </Link>
              </div>
            )}

            {!loading && !success && (
              <div style={{ textAlign: 'left' }}>
                {errorMessage && (
                  <div className="auth-notice" style={{ marginBottom: '1.5rem', color: '#E06C75' }}>
                    {errorMessage}
                  </div>
                )}

                <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: '#1A0F2E', borderRadius: '0.75rem', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                  <h3 style={{ color: '#D4AF37', margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
                    Need a new verification link?
                  </h3>
                  <p style={{ color: 'rgba(245, 237, 224, 0.7)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Enter the email address you registered with to receive a new link.
                  </p>

                  {resendStatus && (
                    <div className="auth-notice" style={{ marginBottom: '1rem' }}>
                      {resendStatus}
                    </div>
                  )}

                  <form onSubmit={handleResend}>
                    <div className="auth-field">
                      <label htmlFor="resend-email" className="auth-label">Email Address</label>
                      <input
                        type="email"
                        id="resend-email"
                        className="auth-input"
                        placeholder="name@example.com"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        disabled={isResending}
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn-primary auth-submit-btn"
                      style={{ marginTop: '0.75rem' }}
                      disabled={isResending}
                    >
                      {isResending ? 'Sending...' : 'Send Verification Link'}
                    </button>
                  </form>
                </div>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                  <Link to="/login" className="auth-switch-btn">
                    Return to Login
                  </Link>
                </div>
              </div>
            )}
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
