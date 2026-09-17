import React from 'react';
import ResultCard from './ResultCard';
import { useLang } from '../i18n/LanguageContext';

const PROGRESS_STEPS_KEYS = [
  { key: 'stepLabelCreated', icon: 'fa-tag' },
  { key: 'stepPickedUp',     icon: 'fa-box' },
  { key: 'stepInTransit',    icon: 'fa-plane' },
  { key: 'stepOutDelivery',  icon: 'fa-truck' },
  { key: 'stepDelivered',    icon: 'fa-house' },
];

export default function ResultsSection({ results, loading, onClear }) {
  const { t } = useLang();

  // Build steps with translated labels
  const steps = PROGRESS_STEPS_KEYS.map(s => ({ label: t[s.key], icon: s.icon }));

  return (
    <section className="results-section" id="results-anchor">
      <div className="container">

        {!loading && (
          <div className="results-header">
            <h2>{t.trackingResults}</h2>
            <button className="btn-outline" onClick={onClear}>
              <i className="fa-solid fa-xmark"></i> {t.clear}
            </button>
          </div>
        )}

        {loading ? (
          <div className="spinner-wrap">
            <div className="spinner"></div>
            <p style={{ color: '#aaa', fontSize: '14px' }}>{t.lookingUp}</p>
            <p style={{ color: '#bbb', fontSize: '12px', marginTop: '6px' }}>{t.serverWaking}</p>
          </div>
        ) : (
          results.map(result =>
            result.found
              ? <ResultCard key={result.tracking_number} result={result} steps={steps} />
              : <NotFound key={result.tracking_number} trackingNumber={result.tracking_number} t={t} />
          )
        )}
      </div>
    </section>
  );
}

function NotFound({ trackingNumber, t }) {
  return (
    <div className="not-found-card">
      <i className="fa-solid fa-circle-exclamation"></i>
      <h3>{t.noResults}</h3>
      <p>
        {trackingNumber && <><strong>{trackingNumber}</strong> — </>}
        {t.noResultsSub}
      </p>
    </div>
  );
}
