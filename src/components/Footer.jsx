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
            <a href="#" aria-label="Facebook"><i className="fa-brands fa-facebook"></i></a>
            <a href="#" aria-label="X / Twitter"><i className="fa-brands fa-x-twitter"></i></a>
            <a href="#" aria-label="Instagram"><i className="fa-brands fa-instagram"></i></a>
            <a href="#" aria-label="LinkedIn"><i className="fa-brands fa-linkedin"></i></a>
          </div>
        </div>
        <div className="footer-links">
          <h5>Shipping</h5>
          <a href="#">Create Shipment</a>
          <a href="#">Schedule Pickup</a>
          <a href="#">Packaging Guide</a>
          <a href="#">Rates &amp; Fees</a>
        </div>
        <div className="footer-links">
          <h5>Tracking</h5>
          <a href="#">Track a Package</a>
          <a href="#">Manage Delivery</a>
          <a href="#">Proof of Delivery</a>
          <a href="#">Notifications</a>
        </div>
        <div className="footer-links">
          <h5>Support</h5>
          <a href="#">Contact Us</a>
          <a href="#">FAQs</a>
          <a href="#">Claim a Package</a>
          <a href="#">Service Alerts</a>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">
          <p>© 2026 FedEx Tracker Clone. Built for demonstration purposes only.</p>
          <div className="footer-bottom-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Use</a>
            <a href="#">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
