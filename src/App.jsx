import React, { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import ResultsSection from './components/ResultsSection';
import Features from './components/Features';
import Services from './components/Services';
import Footer from './components/Footer';
import { fetchTracking } from './api/tracking';

export default function App() {
  const [results, setResults]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

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

  return (
    <>
      <Header />
      <Hero onTrack={handleTrack} loading={loading} error={error} />
      {hasSearched && (
        <ResultsSection
          results={results}
          loading={loading}
          onClear={handleClear}
        />
      )}
      <Features />
      <Services />
      <Footer />
    </>
  );
}
