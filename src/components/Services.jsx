import React from 'react';

const SERVICES = [
  {
    icon: 'fa-plane-departure',
    title: 'FedEx Express',
    desc: 'Overnight and time-definite international delivery.',
  },
  {
    icon: 'fa-truck',
    title: 'FedEx Ground',
    desc: 'Cost-effective delivery for packages up to 150 lbs.',
  },
  {
    icon: 'fa-box-open',
    title: 'FedEx Home Delivery',
    desc: 'Residential delivery 7 days a week, including evenings.',
  },
  {
    icon: 'fa-globe',
    title: 'FedEx International',
    desc: 'Reliable shipping to over 220 countries and territories.',
  },
];

export default function Services() {
  return (
    <section className="services">
      <div className="container">
        <h2 className="section-title">Our Services</h2>
        <div className="services-grid">
          {SERVICES.map(s => (
            <div key={s.title} className="service-card">
              <i className={`fa-solid ${s.icon}`} aria-hidden="true"></i>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
              {/* Fix #4: no-op href replaced with button */}
              <button
                className="service-learn-more"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Learn More →
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
