import React from 'react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <div className="logo small">
            <span className="logo-fed">Fed</span><span className="logo-ex">Ex</span>
          </div>
          <p>Delivering possibilities around the world.</p>
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
          <h5>Tracking</h5>
          <a href="/">Track a Package</a>
          <a href="/">Proof of Delivery</a>
          <a href="/">Notifications</a>
        </div>

        <div className="footer-links">
          <h5>Services</h5>
          <a href="/">FedEx Express</a>
          <a href="/">FedEx Ground</a>
          <a href="/">FedEx International</a>
        </div>

        <div className="footer-links">
          <h5>Support</h5>
          <a href="mailto:support@fedex.com">Contact Us</a>
          <a href="/">FAQs</a>
          <a href="/">Service Alerts</a>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p>© {new Date().getFullYear()} FedEx Tracker. All rights reserved.</p>
          <div className="footer-bottom-links">
            <a href="/">Privacy Policy</a>
            <a href="/">Terms of Use</a>
            <a href="/">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
