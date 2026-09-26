import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import ResultsSection from './components/ResultsSection';
import Footer from './components/Footer';
import AdminDashboard from './pages/AdminDashboard';
import SignInModal from './components/SignInModal';
import { fetchTracking } from './api/tracking';
import { getSession, onAuthChange } from './api/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Fire-and-forget health ping to pre-warm the Render free-tier server
function pingServer() {
  fetch(`${API_BASE}/health`, { method: 'GET' }).catch(() => {/* silent */});
}

export default function App() {
  const [results, setResults]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [hasSearched, setHasSearched]   = useState(false);
  const [adminSession, setAdminSession] = useState(null);
  const [showSignIn, setShowSignIn]     = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [backedToSite, setBackedToSite] = useState(
    () => sessionStorage.getItem('plt-backed') === 'true'
  );

  useEffect(() => {
    // Pre-warm the Render backend immediately on page load
    pingServer();

    // Restore session on mount
    getSession().then(session => {
      if (session && !backedToSite) setAdminSession(session);
      setSessionChecked(true);
    }).catch(() => setSessionChecked(true));

    // Subscribe to auth changes (token refresh, expiry, sign-out)
    const unsubscribe = onAuthChange(session => {
      if (!session) {
        // Signed out or token expired — clear admin state
        setAdminSession(null);
        setBackedToSite(false);
        sessionStorage.removeItem('plt-backed');
      } else {
        // Token refreshed — update session silently
        setAdminSession(prev => prev ? session : prev);
      }
    });

    // Auto-track if /track/XXXX or ?track=XXXX is in the URL
    const pathMatch = window.location.pathname.match(/^\/track\/([A-Z0-9\-]+)$/i);
    const params     = new URLSearchParams(window.location.search);
    const trackParam = pathMatch ? pathMatch[1] : params.get('track');
    if (trackParam) {
      window.history.replaceState({}, '', '/');
      setHasSearched(true);
      setLoading(true);
      fetchTracking(trackParam)
        .then(data => setResults(data))
        .catch(err => setError(err.message || 'Something went wrong.'))
        .finally(() => setLoading(false));
    }

    return unsubscribe;
  }, []);

  async function handleTrack(numbersRaw) {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const data = await fetchTracking(numbersRaw);
      setResults(data);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setResults([]);
    setHasSearched(false);
    setError(null);
  }

  function handleLoginSuccess(session) {
    setAdminSession(session);
    setBackedToSite(false);
    sessionStorage.removeItem('plt-backed');
    setShowSignIn(false);
  }

  async function handleSignOut() {
    try { await import('./api/auth').then(m => m.signOut()); } catch (_) {}
    setAdminSession(null);
    setBackedToSite(false);
    sessionStorage.removeItem('plt-backed');
    setResults([]);
    setHasSearched(false);
  }

  function handleBackToSite() {
    setAdminSession(null);
    setBackedToSite(true);
    sessionStorage.setItem('plt-backed', 'true');
  }

  if (!sessionChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (adminSession) {
    return (
      <AdminDashboard
        session={adminSession}
        onLogout={handleSignOut}
        onBackToSite={handleBackToSite}
      />
    );
  }

  // backedToSite: session exists but user chose to browse the public site
  const headerUser = backedToSite ? { email: '···' } : null;

  return (
    <>
      <Header
        user={headerUser}
        onSignInClick={() => {
          if (backedToSite) {
            getSession().then(session => {
              if (session) { setAdminSession(session); setBackedToSite(false); }
              else setShowSignIn(true);
            }).catch(() => setShowSignIn(true));
          } else {
            setShowSignIn(true);
          }
        }}
        onSignOut={handleSignOut}
        onGoToDashboard={backedToSite ? () => {
          getSession().then(session => {
            if (session) { setAdminSession(session); setBackedToSite(false); }
          }).catch(() => {});
        } : null}
      />
      <Hero onTrack={handleTrack} loading={loading} error={error} />
      {hasSearched && (
        <ResultsSection results={results} loading={loading} onClear={handleClear} />
      )}
      <Footer />

      {showSignIn && (
        <SignInModal
          onSuccess={handleLoginSuccess}
          onClose={() => setShowSignIn(false)}
        />
      )}
    </>
  );
}
