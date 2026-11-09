import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PrimaryButton from '../components/ui/PrimaryButton';
import SecondaryButton from '../components/ui/SecondaryButton';
import BrandWatermark from '../components/ui/BrandWatermark';
import { api, setToken, setUser, setFirm, isAuthenticated } from '../lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Show session-expired message if redirected with reason
  useEffect(() => {
    if (searchParams.get('reason') === 'session_expired') {
      setAuthError('Session expired, please sign in again.');
    }
    // If already authenticated, redirect to dashboard
    if (isAuthenticated()) {
      navigate('/app/dashboard', { replace: true });
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const result = await api.auth.login(email, password);
      setToken(result.access_token);
      setUser(result.user);
      setFirm(result.firm);
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setAuthError(String(err.message || err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (password.length < 8) {
      setAuthError('Password must be at least 8 characters.');
      return;
    }
    setAuthLoading(true);
    try {
      const result = await api.auth.register(name, email, password, firmName);
      setToken(result.access_token);
      setUser(result.user);
      setFirm(result.firm);
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setAuthError(String(err.message || err));
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-paper font-sans text-ink relative overflow-hidden z-0">
      <BrandWatermark opacity={0.06} position="bottom-right" />

      {/* LEFT COLUMN - Brand & Context */}
      <div className="w-full md:w-[55%] bg-taupe border-b md:border-b-0 md:border-r border-hairline relative flex flex-col justify-center p-8 md:p-16 lg:p-24 overflow-hidden z-10">
        <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
          <svg width="120%" height="120%" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="var(--brass)" strokeWidth="0.5">
            <g opacity="0.4">
              <path d="M0 100 L800 100 M0 200 L800 200 M0 300 L800 300 M0 400 L800 400 M0 500 L800 500" strokeDasharray="4 4" />
              <path d="M150 0 L150 600 M300 0 L300 600 M450 0 L450 600 M600 0 L600 600 M750 0 L750 600" />
            </g>
            <path d="M 0 450 Q 150 450, 300 350 T 600 200 L 800 150" stroke="var(--brass)" strokeWidth="2" fill="none" />
            <circle cx="300" cy="350" r="4" fill="var(--brass)" />
            <circle cx="600" cy="200" r="4" fill="var(--brass)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-3xl md:text-5xl font-serif text-ink font-medium leading-tight mb-8">
            Pre-accounting, reconciliation, and tax advisory — handled before your first coffee.
          </h1>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={16} className="text-ink-muted mt-0.5 shrink-0" strokeWidth={1.5} />
              <p className="text-sm text-ink-muted leading-relaxed">
                <span className="font-mono font-medium text-ink mr-2">12,400+</span>
                vouchers reconciled this quarter across 45 active engagements.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 size={16} className="text-ink-muted mt-0.5 shrink-0" strokeWidth={1.5} />
              <p className="text-sm text-ink-muted leading-relaxed">
                <span className="font-mono font-medium text-ink mr-2">98.2%</span>
                average OCR extraction confidence on Indian tax invoices.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 size={16} className="text-ink-muted mt-0.5 shrink-0" strokeWidth={1.5} />
              <p className="text-sm text-ink-muted leading-relaxed">
                <span className="font-mono font-medium text-ink mr-2">Secured</span>
                end-to-end data pipeline with localized compute nodes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN - Login / Register Form */}
      <div className="w-full md:w-[45%] bg-paper flex items-center justify-center p-8 lg:p-12 z-10 relative">
        <div className="w-full max-w-[380px]">

          {/* Logo Mark */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-ink text-paper flex items-center justify-center font-serif font-bold text-2xl rounded-[2px]">
              CA
            </div>
            <span className="text-2xl font-serif font-medium text-ink">TaxSaathi</span>
          </div>

          {/* Mode Toggle */}
          <div className="flex border border-hairline rounded-[2px] mb-8 overflow-hidden">
            <button
              type="button"
              onClick={() => { setMode('login'); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-mono uppercase tracking-widest transition-colors ${mode === 'login' ? 'bg-ink text-paper' : 'bg-paper text-ink-muted hover:bg-paper-raised'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-mono uppercase tracking-widest transition-colors ${mode === 'register' ? 'bg-ink text-paper' : 'bg-paper text-ink-muted hover:bg-paper-raised'}`}
            >
              Create Account
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-serif text-ink tracking-tight mb-1">
              {mode === 'login' ? 'Sign in to your practice' : 'Create a new firm account'}
            </h2>
            <p className="text-sm text-ink-muted">
              {mode === 'login' ? 'Enter your credentials below.' : 'Register your firm and get started.'}
            </p>
          </div>

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-widest text-ink-muted font-sans font-medium" htmlFor="email">
                  Work Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  data-cursor="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourfirm.in"
                  className="w-full bg-paper-raised border border-hairline rounded-[2px] px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:border-brass/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-widest text-ink-muted font-sans font-medium" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    data-cursor="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-paper-raised border border-hairline rounded-[2px] px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:border-brass/50 transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="w-full text-xs font-sans text-red-600 bg-red-50 border border-red-200 rounded-[2px] px-3 py-2">
                  {authError}
                </div>
              )}

              <PrimaryButton type="submit" className="w-full py-2.5" disabled={authLoading}>
                {authLoading ? 'Signing in…' : 'Sign In'}
              </PrimaryButton>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-widest text-ink-muted font-sans font-medium" htmlFor="reg-name">
                  Your Name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  data-cursor="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="CA Priya Sharma"
                  className="w-full bg-paper-raised border border-hairline rounded-[2px] px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:border-brass/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-widest text-ink-muted font-sans font-medium" htmlFor="reg-firm">
                  Firm Name
                </label>
                <input
                  id="reg-firm"
                  type="text"
                  required
                  data-cursor="text"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  placeholder="Sharma & Associates LLP"
                  className="w-full bg-paper-raised border border-hairline rounded-[2px] px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:border-brass/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-widest text-ink-muted font-sans font-medium" htmlFor="reg-email">
                  Work Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  data-cursor="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourfirm.in"
                  className="w-full bg-paper-raised border border-hairline rounded-[2px] px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:border-brass/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-widest text-ink-muted font-sans font-medium" htmlFor="reg-password">
                  Password <span className="text-ink-muted normal-case">(min. 8 characters)</span>
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    data-cursor="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-paper-raised border border-hairline rounded-[2px] px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:border-brass/50 transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="w-full text-xs font-sans text-red-600 bg-red-50 border border-red-200 rounded-[2px] px-3 py-2">
                  {authError}
                </div>
              )}

              <PrimaryButton type="submit" className="w-full py-2.5" disabled={authLoading}>
                {authLoading ? 'Creating account…' : 'Create Account & Sign In'}
              </PrimaryButton>
            </form>
          )}

          <div className="mt-10 text-center">
            <p className="text-[10px] text-ink-muted font-mono uppercase tracking-widest">
              Secured Connection &bull; Engine v2.4.1
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
