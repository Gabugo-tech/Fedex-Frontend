import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import ResultsSection from './components/ResultsSection';
import Features from './components/Features';
import Services from './components/Services';
import Footer from './components/Footer';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { fetchTracking } from './api/tracking';
import { getSession } from './api/auth';

export default function App() {
  const [results, setResults]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [hasSearched, setHasSearched]   = useState(false);
  const [page, setPage]                 = useState('home'); // 'home' | 'admin-login' | 'admin'
  const [adminSession, setAdminSession] = useState(null);

  // On mount: check for an existing valid session only — no hash routing
  useEffect(() => {
    // Clear any leftover #/admin hash from the URL bar so it's never visible
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname);
    }

    getSession().then(session => {
      if (session) {
        setAdminSession(session);
        setPage('admin');
      }
    });
  }, []);

  // Secret keyboard shortcut: Ctrl + Shift + A  →  opens admin login
  useEffect(() => {
    function onKeyDown(e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setPage(p => p === 'home' ? 'admin-login' : p);
      }
      // Escape from login page back to home
      if (e.key === 'Escape' && page === 'admin-login') {
        setPage('home');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [page]);

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
    setPage('admin');
  }

  function handleAdminLogout() {
    setAdminSession(null);
    setPage('home');
  }

  if (page === 'admin-login') return <AdminLogin onSuccess={handleLoginSuccess} onCancel={() => setPage('home')} />;
  if (page === 'admin')       return <AdminDashboard session={adminSession} onLogout={handleAdminLogout} />;

  return (
    <>
      <Header />
      <Hero onTrack={handleTrack} loading={loading} error={error} />
      {hasSearched && (
        <ResultsSection results={results} loading={loading} onClear={handleClear} />
      )}
      <Features />
      <Services />
      <Footer />
    </>
  );
}
