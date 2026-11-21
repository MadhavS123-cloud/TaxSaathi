import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, setToken, setUser, setFirm, isAuthenticated } from '../lib/api';

const cream = '#F3EDE2';
const muted = '#B7AFA3';
const gold = '#C9A96E';

const fieldClass = 'w-full border bg-transparent px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-[#B7AFA3]/40 focus:border-[#C9A96E]';

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
    if (isAuthenticated()) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [navigate, searchParams]);

  useEffect(() => {
    const root = document.documentElement;
    const previousRoot = root.style.backgroundColor;
    const previousBody = document.body.style.backgroundColor;
    const previousColor = document.body.style.color;
    root.style.backgroundColor = '#0C0C0C';
    document.body.style.backgroundColor = '#0C0C0C';
    document.body.style.color = cream;
    return () => {
      root.style.backgroundColor = previousRoot;
      document.body.style.backgroundColor = previousBody;
      document.body.style.color = previousColor;
    };
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

  const inputStyle = { color: cream, borderColor: 'rgba(201,169,110,0.35)', background: '#141414' };
  const labelClass = 'text-[11px] uppercase tracking-[0.22em]';

  return (
    <div className="relative flex min-h-screen w-full flex-col font-sans md:flex-row" style={{ background: '#0C0C0C', color: cream }}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 15% 0%, rgba(201,169,110,0.08), transparent 42%)' }}
      />

      <section className="relative z-10 flex w-full flex-col justify-center border-b px-8 py-16 md:w-[55%] md:border-b-0 md:border-r md:px-16 lg:px-24" style={{ borderColor: 'rgba(201,169,110,0.28)' }}>
        <p className="mb-5 text-[11px] uppercase tracking-[0.28em]" style={{ color: gold }}>For chartered accountants in India</p>
        <h1 className="max-w-lg font-serif text-4xl font-light leading-[1.12] md:text-5xl" style={{ color: cream }}>
          The exceptions, prepared before you sit down.
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed" style={{ color: muted }}>
          TaxSaathi reads the invoice, matches the bank, and keeps the answer inside the statute. A CA reviews every output.
        </p>
        <div className="mt-10 h-px w-24" style={{ background: gold }} />
        <ul className="mt-8 space-y-3 text-sm" style={{ color: muted }}>
          <li>Built for CAs</li>
          <li>Exception-first workflow</li>
          <li>Hindi and English</li>
          <li>Amounts from the ledger</li>
        </ul>
      </section>

      <section className="relative z-10 flex w-full items-center justify-center px-8 py-16 md:w-[45%]">
        <div className="w-full max-w-[380px]">
          <Link to="/" className="mb-10 flex items-center gap-3" data-cursor="interactive">
            <span className="flex h-10 w-10 items-center justify-center border font-serif text-lg" style={{ borderColor: gold, color: cream }}>CA</span>
            <span className="font-serif text-2xl font-light" style={{ color: cream }}>TaxSaathi</span>
          </Link>

          <div className="mb-8 flex border" style={{ borderColor: 'rgba(201,169,110,0.35)' }}>
            <button
              type="button"
              data-cursor="interactive"
              onClick={() => { setMode('login'); setAuthError(''); }}
              className="flex-1 py-2.5 text-[11px] uppercase tracking-[0.22em] transition-colors"
              style={{ background: mode === 'login' ? gold : 'transparent', color: mode === 'login' ? '#0C0C0C' : muted }}
            >
              Sign in
            </button>
            <button
              type="button"
              data-cursor="interactive"
              onClick={() => { setMode('register'); setAuthError(''); }}
              className="flex-1 py-2.5 text-[11px] uppercase tracking-[0.22em] transition-colors"
              style={{ background: mode === 'register' ? gold : 'transparent', color: mode === 'register' ? '#0C0C0C' : muted }}
            >
              Create account
            </button>
          </div>

          <h2 className="font-serif text-3xl font-light" style={{ color: cream }}>
            {mode === 'login' ? 'Sign in to the desk' : 'Open a firm desk'}
          </h2>
          <p className="mb-8 mt-2 text-sm" style={{ color: muted }}>
            {mode === 'login' ? 'Use the email and password for your practice.' : 'The first account becomes the firm’s admin.'}
          </p>

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className={labelClass} style={{ color: muted }} htmlFor="email">Work email</label>
                <input id="email" type="email" required data-cursor="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourfirm.in" className={fieldClass} style={inputStyle} />
              </div>
              <PasswordField id="password" label="Password" value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} labelClass={labelClass} inputStyle={inputStyle} />
              {authError && <ErrorNote message={authError} />}
              <GoldButton disabled={authLoading}>{authLoading ? 'Signing in…' : 'Sign in'}</GoldButton>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="space-y-2">
                <label className={labelClass} style={{ color: muted }} htmlFor="reg-name">Your name</label>
                <input id="reg-name" type="text" required data-cursor="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="CA Priya Sharma" className={fieldClass} style={inputStyle} />
              </div>
              <div className="space-y-2">
                <label className={labelClass} style={{ color: muted }} htmlFor="reg-firm">Firm name</label>
                <input id="reg-firm" type="text" required data-cursor="text" value={firmName} onChange={(e) => setFirmName(e.target.value)} placeholder="Sharma & Associates LLP" className={fieldClass} style={inputStyle} />
              </div>
              <div className="space-y-2">
                <label className={labelClass} style={{ color: muted }} htmlFor="reg-email">Work email</label>
                <input id="reg-email" type="email" required data-cursor="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourfirm.in" className={fieldClass} style={inputStyle} />
              </div>
              <PasswordField id="reg-password" label="Password" hint="At least 8 characters" value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} labelClass={labelClass} inputStyle={inputStyle} />
              {authError && <ErrorNote message={authError} />}
              <GoldButton disabled={authLoading}>{authLoading ? 'Creating the desk…' : 'Create account'}</GoldButton>
            </form>
          )}

          <p className="mt-10 text-center text-xs" style={{ color: muted }}>
            A CA reviews every output before it leaves the desk.
          </p>
        </div>
      </section>
    </div>
  );
}

function PasswordField({ id, label, hint, value, onChange, show, onToggle, labelClass, inputStyle }) {
  return (
    <div className="space-y-2">
      <label className={labelClass} style={{ color: '#B7AFA3' }} htmlFor={id}>
        {label}{hint ? <span className="ml-2 normal-case tracking-normal">{hint}</span> : null}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          required
          data-cursor="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className={`${fieldClass} pr-10`}
          style={inputStyle}
        />
        <button
          type="button"
          onClick={onToggle}
          data-cursor="interactive"
          className="absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: '#B7AFA3' }}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  );
}

function ErrorNote({ message }) {
  return (
    <p className="border px-3 py-2 text-xs" style={{ borderColor: 'rgba(162,59,46,0.6)', color: '#E7C2BC' }}>
      {message}
    </p>
  );
}

function GoldButton({ children, disabled }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      data-cursor="interactive"
      className="w-full border py-3 text-sm transition-transform duration-300 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
      style={{ borderColor: '#C9A96E', background: '#C9A96E', color: '#0C0C0C' }}
    >
      {children}
    </button>
  );
}
