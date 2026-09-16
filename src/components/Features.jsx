import React from 'react';

const FEATURES = [
  {
    icon: 'fa-location-dot',
    title: 'Real-Time Location',
    desc: 'See exactly which facility, airport, or delivery vehicle your package is in at any moment.',
  },
  {
    icon: 'fa-bell',
    title: 'Instant Notifications',
    desc: 'Get email or SMS alerts at every milestone — from pickup all the way to delivery.',
  },
  {
    icon: 'fa-calendar-check',
    title: 'Delivery Estimates',
    desc: 'Know exactly when to expect your package with accurate date and time windows.',
  },
  {
    icon: 'fa-file-signature',
    title: 'Proof of Delivery',
    desc: 'Access signed delivery confirmations and timestamps for all your shipments.',
  },
];

export default function Features() {
  return (
    <section className="features">
      <div className="container">
        <h2 className="section-title">Why Track With Us?</h2>
        <div className="features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">
                <i className={`fa-solid ${f.icon}`}></i>
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
