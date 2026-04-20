import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';

const stats = [
  { label: 'Verified Suppliers', value: '1,200+' },
  { label: 'Industrial Buyers', value: '450+' },
  { label: 'Tonnes Traded', value: '8,500+' },
  { label: 'States Covered', value: '18' },
];

const steps = [
  { icon: '📋', title: 'Supplier Lists Biomass', desc: 'Upload quantity, quality specs (moisture, calorific value), location, and minimum price.' },
  { icon: '🔨', title: 'Buyers Place Bids', desc: 'Industrial buyers browse listings and place real-time fractional bids on available lots.' },
  { icon: '🤝', title: 'Supplier Accepts Bid', desc: 'Supplier reviews all bids and accepts the best offer. Payment goes into secure escrow.' },
  { icon: '🚚', title: 'Delivery & Release', desc: 'Supplier dispatches biomass. On buyer confirmation, payment is released from escrow.' },
];

const biomassTypes = ['Rice Husk', 'Sugarcane Bagasse', 'Wood Chips', 'Cotton Stalks', 'Wheat Straw', 'Corn Cobs', 'Bamboo'];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-dark via-primary to-primary-light text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            India's Biomass B2B<br />Trading Platform
          </h1>
          <p className="text-xl text-green-100 mb-10 max-w-2xl mx-auto">
            Connect directly with biomass suppliers and industrial buyers. Real-time bidding, quality-verified listings, and secure escrow payments.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/listings" className="bg-white text-primary font-bold px-8 py-3 rounded-xl hover:bg-green-50 transition-colors text-lg">Browse Listings</Link>
            <Link to="/register" className="bg-accent font-bold px-8 py-3 rounded-xl hover:bg-accent-dark transition-colors text-lg">Get Started Free</Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white py-12 border-b">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-primary">{s.value}</p>
              <p className="text-gray-600 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">How BioBids Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl mb-4">{s.icon}</div>
                <h3 className="font-bold text-gray-800 mb-2">{s.title}</h3>
                <p className="text-gray-600 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Biomass Types */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Biomass Types Available</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {biomassTypes.map((t) => (
              <span key={t} className="bg-primary-50 text-primary font-medium px-4 py-2 rounded-full border border-primary-100">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16 px-4 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Trade Smarter?</h2>
        <p className="text-green-100 mb-8 max-w-xl mx-auto">Join 1,600+ suppliers and buyers on India's most transparent biomass marketplace.</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link to="/register?role=supplier" className="bg-white text-primary font-bold px-6 py-3 rounded-xl hover:bg-green-50 transition-colors">Register as Supplier</Link>
          <Link to="/register?role=buyer" className="bg-accent font-bold px-6 py-3 rounded-xl hover:bg-accent-dark transition-colors">Register as Buyer</Link>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-8 text-center text-sm">
        <p>© 2026 BioBids — Biomass Supply Chain Optimization Platform</p>
        <p className="mt-1">A project by Tarun Seth, Utsav Sethiya, Vasudev Sharma & Ved Vyas · AITR Indore</p>
      </footer>
    </div>
  );
}
