import { useEffect, useState } from 'react';
import Login from './pages/Login';
import PatientDashboard from './pages/PatientDashboard';
import InsurerDashboard from './pages/InsurerDashboard';
import { apiRequest } from './services/api';
import './App.css';

function App() {
  const savedUser = (() => {
    try {
      const stored = localStorage.getItem('authUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const [authState, setAuthState] = useState({
    user: savedUser,
    loading: true,
  });

  useEffect(() => {
    let isActive = true;

    function handleAuthExpired() {
      if (!isActive) {
        return;
      }

      localStorage.removeItem('accessToken');
      localStorage.removeItem('authUser');
      setAuthState({ user: null, loading: false });
    }

    async function restoreSession() {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        if (isActive) {
          localStorage.removeItem('authUser');
          setAuthState({ user: null, loading: false });
        }
        return;
      }

      try {
        const response = await apiRequest('/auth/me');
        const verifiedUser = response.user || response;

        if (isActive) {
          localStorage.setItem('authUser', JSON.stringify(verifiedUser));
          setAuthState({ user: verifiedUser, loading: false });
        }
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('authUser');

        if (isActive) {
          setAuthState({ user: null, loading: false });
        }
      }
    }

    restoreSession();
    window.addEventListener('easyinsure:auth-expired', handleAuthExpired);

    return () => {
      isActive = false;
      window.removeEventListener('easyinsure:auth-expired', handleAuthExpired);
    };
  }, []);

  function handleLogin(data) {
    const storedUser = data.user || data;
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('authUser', JSON.stringify(storedUser));
    setAuthState({ user: storedUser, loading: false });
  }

  function handleLogout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('authUser');
    setAuthState({ user: null, loading: false });
  }

  if (authState.loading) {
    return (
      <div className="app-loading">
        <div className="loading-card">
          <div className="loading-spinner" />
          <h1>Restoring your session</h1>
          <p>Please wait while we verify your account.</p>
        </div>
      </div>
    );
  }

  if (!authState.user) {
    return <Login onLogin={handleLogin} />;
  }

  const currentUser = authState.user.user || authState.user;
  const role = currentUser?.role;

  if (role === 'PATIENT') {
    return (
      <PatientDashboard
        user={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  if (role === 'INSURER') {
    return (
      <InsurerDashboard
        user={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="app-error">
      <h1>EasyInsure</h1>
      <p>Unsupported user role.</p>
      <button className="primary-button" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}

export default App;