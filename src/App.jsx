import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import ResultsSection from './components/ResultsSection';
import Footer from './components/Footer';
import AdminDashboard from './pages/AdminDashboard';
import SignInModal from './components/SignInModal';
import { fetchTracking } from './api/tracking';
import { getSession, signOut } from './api/auth';

const ADMIN_EMAIL = 'nnanwubagabriel@gmail.com';

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
    getSession().then(session => {
      if (session && session.user.email === ADMIN_EMAIL) {
        if (!backedToSite) setAdminSession(session);
      }
      setSessionChecked(true);
    }).catch(() => setSessionChecked(true));

    // Auto-track if ?track=XXXX is in the URL
    const params = new URLSearchParams(window.location.search);
    const trackParam = params.get('track');
    if (trackParam) {
      // Fix: clean URL immediately so refresh doesn't re-fire
      window.history.replaceState({}, '', window.location.pathname);
      setHasSearched(true);
      setLoading(true);
      fetchTracking(trackParam).then(data => {
        setResults(data);
      }).catch(err => {
        setError(err.message || 'Something went wrong.');
      }).finally(() => setLoading(false));
    }
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
    await signOut();
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

  return (
    <>
      <Header
        user={backedToSite ? { email: ADMIN_EMAIL } : null}
        onSignInClick={() => {
          if (backedToSite) {
            getSession().then(session => {
              if (session) { setAdminSession(session); setBackedToSite(false); }
              else setShowSignIn(true);
            });
          } else {
            setShowSignIn(true);
          }
        }}
        onSignOut={handleSignOut}
        onGoToDashboard={backedToSite ? () => {
          getSession().then(session => {
            if (session) { setAdminSession(session); setBackedToSite(false); }
          });
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
