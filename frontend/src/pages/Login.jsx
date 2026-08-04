import { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../services/api';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const typingTimerRef = useRef(null);

  // Clear timers on component unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
        }),
      });

      onLogin(data);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  // Cancel typing simulation if the user interacts manually
  const handleEmailChange = (event) => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setIsTyping(false);
    setEmail(event.target.value);
  };

  const handlePasswordChange = (event) => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setIsTyping(false);
    setPassword(event.target.value);
  };

  // Simulates an elegant typing effect for the demo credentials
  const simulateTyping = (targetEmail, targetPassword) => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
    }

    setIsTyping(true);
    setEmail('');
    setPassword('');
    setError('');

    let currentEmail = '';
    let currentPassword = '';
    let emailIdx = 0;
    let passwordIdx = 0;

    const emailInterval = setInterval(() => {
      if (emailIdx < targetEmail.length) {
        currentEmail += targetEmail[emailIdx];
        setEmail(currentEmail);
        emailIdx++;
      } else {
        clearInterval(emailInterval);
        
        const passwordInterval = setInterval(() => {
          if (passwordIdx < targetPassword.length) {
            currentPassword += targetPassword[passwordIdx];
            setPassword(currentPassword);
            passwordIdx++;
          } else {
            clearInterval(passwordInterval);
            setIsTyping(false);
            typingTimerRef.current = null;
          }
        }, 30);
        
        typingTimerRef.current = passwordInterval;
      }
    }, 20);

    typingTimerRef.current = emailInterval;
  };

  return (
    <div className="login-page">
      {/* Premium animated glowing background elements */}
      <div className="login-bg-glow blob-teal"></div>
      <div className="login-bg-glow blob-soft-green"></div>
      <div className="login-bg-glow blob-emerald"></div>
      <div className="login-bg-glow blob-warm-white"></div>
      <div className="login-grid-overlay"></div>

      <div className={`login-card ${error ? 'login-card-shake' : ''}`}>
        <div className="login-card-header animate-fade-in" style={{ '--item-index': 0 }}>
          <div className="brand-icon-large brand-icon-float">
            <img className="brand-image" src="/icons.png" alt="EasyInsure logo" />
          </div>
          <div>
            <h1>EasyInsure</h1>
            <p>Secure insurance claim management.</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group animate-fade-in" style={{ '--item-index': 1 }}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="Enter your email"
              className={isTyping ? 'input-autofilling' : ''}
              required
            />
          </div>

          <div className="form-group animate-fade-in" style={{ '--item-index': 2 }}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Enter your password"
              className={isTyping ? 'input-autofilling' : ''}
              required
            />
          </div>

          {error && (
            <div className="error-message animate-shake animate-fade-in" style={{ '--item-index': 3 }}>
              {error}
            </div>
          )}

          <button 
            className="primary-button auth-submit animate-fade-in button-interactive" 
            type="submit" 
            disabled={loading}
            style={{ '--item-index': 4 }}
          >
            {loading ? (
              <span className="button-loading-content">
                <span className="spinner-mini"></span>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="demo-accounts animate-fade-in" style={{ '--item-index': 5 }}>
          <p>
            Demo accounts <span className="demo-hint">(Click to auto-fill)</span>
          </p>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            <li 
              className="demo-account-item"
              onClick={() => simulateTyping('patient@example.com', 'patient123')}
            >
              <div className="demo-badge patient-badge">Patient</div>
              <span className="demo-credentials">patient@example.com / patient123</span>
            </li>
            <li 
              className="demo-account-item"
              onClick={() => simulateTyping('insurer@example.com', 'insurer123')}
            >
              <div className="demo-badge insurer-badge">Insurer</div>
              <span className="demo-credentials">insurer@example.com / insurer123</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Login;
