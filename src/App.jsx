import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import ResultsSection from './components/ResultsSection';
import Features from './components/Features';
import Services from './components/Services';
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
  // Fix #5: track session restoration so we don't flash the public site
  const [sessionChecked, setSessionChecked] = useState(false);

  // On mount: restore existing session
  useEffect(() => {
    getSession().then(session => {
      if (session && session.user.email === ADMIN_EMAIL) {
        setAdminSession(session);
      }
      setSessionChecked(true); // always mark as checked
    }).catch(() => setSessionChecked(true));
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
    setShowSignIn(false);
  }

  async function handleSignOut() {
    await signOut();
    setAdminSession(null);
    setResults([]);
    setHasSearched(false);
  }

  // Fix #5: show nothing until session check completes (prevents flash)
  if (!sessionChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // Admin is logged in — show full dashboard
  if (adminSession) {
    return (
      <AdminDashboard
        session={adminSession}
        onLogout={handleSignOut}
        onBackToSite={() => setAdminSession(null)} // Fix #6: separate back from logout
      />
    );
  }

  // Public site
  return (
    <>
      {/* Fix #1: pass real user object instead of null */}
      <Header
        user={adminSession ? adminSession.user : null}
        onSignInClick={() => setShowSignIn(true)}
        onSignOut={handleSignOut}
      />
      <Hero onTrack={handleTrack} loading={loading} error={error} />
      {hasSearched && (
        <ResultsSection results={results} loading={loading} onClear={handleClear} />
      )}
      <Features />
      <Services />
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
