import React from 'react';
import { useLang } from '../i18n/LanguageContext';

export default function Footer() {
  const { t } = useLang();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <div className="logo small">
            <span className="logo-pulse">Puls</span><span className="logo-track">Track</span>
          </div>
          <p>{t.footerTagline}</p>
          <div className="social-links">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <i className="fa-brands fa-facebook"></i>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter">
              <i className="fa-brands fa-x-twitter"></i>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <i className="fa-brands fa-instagram"></i>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <i className="fa-brands fa-linkedin"></i>
            </a>
          </div>
        </div>

        <div className="footer-links">
          <h5>{t.footerTracking}</h5>
          <a href="/">{t.footerTrackPkg}</a>
          <a href="/">{t.footerProof}</a>
          <a href="/">{t.footerNotif}</a>
        </div>

        <div className="footer-links">
          <h5>{t.footerServices}</h5>
          <a href="/">PulsTrack Express</a>
          <a href="/">PulsTrack Ground</a>
          <a href="/">PulsTrack International</a>
        </div>

        <div className="footer-links">
          <h5>{t.footerSupport}</h5>
          <a href="mailto:support@pulstrack.com">{t.footerContact}</a>
          <a href="/">{t.footerFaq}</a>
          <a href="/">{t.footerAlerts}</a>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p>© {new Date().getFullYear()} {t.footerCopy}</p>
          <div className="footer-bottom-links">
            <a href="/">{t.footerPrivacy}</a>
            <a href="/">{t.footerTerms}</a>
            <a href="/">{t.footerAccess}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
