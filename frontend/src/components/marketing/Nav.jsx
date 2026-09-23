import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PrimaryButton from '../ui/PrimaryButton';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const smoothScrollTo = (id) => (e) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled ? 'bg-[#F7F5F0] border-b border-hairline' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group" data-cursor="interactive">
          <div className="w-8 h-8 bg-ink text-paper flex items-center justify-center font-serif font-bold text-lg rounded-[2px] transition-transform group-hover:scale-105">
            TS
          </div>
          <span className="text-ink font-serif text-lg tracking-wide">CA Tax Copilot</span>
        </Link>

        {/* Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#pipelines" onClick={smoothScrollTo('pipelines')} className="text-base font-sans font-medium text-ink-muted hover:text-ink transition-colors" data-cursor="interactive">Product</a>
          <a href="#how-it-works" onClick={smoothScrollTo('how-it-works')} className="text-base font-sans font-medium text-ink-muted hover:text-ink transition-colors" data-cursor="interactive">How it works</a>
          <a href="#trust" onClick={smoothScrollTo('trust')} className="text-base font-sans font-medium text-ink-muted hover:text-ink transition-colors" data-cursor="interactive">Security</a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-6">
          <Link to="/login" className="text-sm font-sans text-ink hover:text-brass transition-colors" data-cursor="interactive">Sign in</Link>
          <PrimaryButton onClick={() => navigate('/login')} className="hidden sm:block">Request a demo</PrimaryButton>
        </div>
      </div>
    </header>
  );
}
