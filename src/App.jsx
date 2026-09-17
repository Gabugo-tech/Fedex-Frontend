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
  const [sessionChecked, setSessionChecked] = useState(false);
  // Fix #7: track whether admin chose "back to site" without logging out
  const [backedToSite, setBackedToSite] = useState(false);

  // On mount: restore existing session
  useEffect(() => {
    getSession().then(session => {
      if (session && session.user.email === ADMIN_EMAIL) {
        // Fix #7: only auto-restore dashboard if admin hasn't explicitly backed to site
        if (!backedToSite) setAdminSession(session);
      }
      setSessionChecked(true);
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
    setBackedToSite(false);
    setShowSignIn(false);
  }

  async function handleSignOut() {
    await signOut();
    setAdminSession(null);
    setBackedToSite(false);
    setResults([]);
    setHasSearched(false);
  }

  // Fix #7: back to site keeps Supabase session alive, just hides dashboard
  function handleBackToSite() {
    setAdminSession(null);
    setBackedToSite(true);
  }

  // Show spinner until session check completes
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
        onBackToSite={handleBackToSite}
      />
    );
  }

  // Public site — Fix #1: pass real user when backed-to-site session still alive
  return (
    <>
      <Header
        user={backedToSite ? { email: ADMIN_EMAIL } : null}
        onSignInClick={() => {
          // Fix #7: if session still alive, go straight back to dashboard
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
        // Fix #7: show "Go to Dashboard" button when backed-to-site
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
