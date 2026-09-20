import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import PrimaryButton from '../components/ui/PrimaryButton';
import SecondaryButton from '../components/ui/SecondaryButton';
import BrandWatermark from '../components/ui/BrandWatermark';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const loginWithGoogle = useGoogleLogin({
    onSuccess: (codeResponse) => {
      console.log('Google login success:', codeResponse);
      // TODO: send codeResponse.access_token to the backend for verification
      navigate('/dashboard');
    },
    onError: (error) => console.error('Google Login Failed:', error)
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate login
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-paper font-sans text-ink relative overflow-hidden z-0">
      <BrandWatermark opacity={0.06} position="bottom-right" />

      {/* LEFT COLUMN - Brand & Context */}
      <div className="w-full md:w-[55%] bg-taupe border-b md:border-b-0 md:border-r border-hairline relative flex flex-col justify-center p-8 md:p-16 lg:p-24 overflow-hidden z-10">

        {/* Subtle Background Diagram Motif (Ledger Grid / Line Chart) */}
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

      {/* RIGHT COLUMN - Login Form */}
      <div className="w-full md:w-[45%] bg-paper flex items-center justify-center p-8 lg:p-12 z-10 relative">
        <div className="w-full max-w-[380px]">

          {/* Logo Mark */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-ink text-paper flex items-center justify-center font-serif font-bold text-2xl rounded-[2px]">
              TS
            </div>
            <span className="text-2xl font-serif font-medium text-ink">TaxSaathi</span>
          </div>

          <div className="mb-10">
            <h2 className="text-2xl font-serif text-ink tracking-tight mb-2">Sign in to your practice</h2>
            <p className="text-sm text-ink-muted">Boutique & Partners LLP <span className="mx-2 opacity-50">|</span> Partner Access</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-widest text-ink-muted font-sans font-medium" htmlFor="email">Work Email</label>
                <span className="text-[10px] bg-paper-raised border border-hairline px-2 py-0.5 text-ink rounded-sm">Firm Account</span>
              </div>
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
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-widest text-ink-muted font-sans font-medium" htmlFor="password">Password</label>
                <a href="#" className="text-xs text-ink-muted hover:text-ink transition-colors underline decoration-hairline underline-offset-2">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
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

            <PrimaryButton type="submit" className="w-full py-2.5">
              Sign In
            </PrimaryButton>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-hairline"></div>
              <span className="flex-shrink-0 mx-4 text-xs font-serif italic text-ink-muted">or</span>
              <div className="flex-grow border-t border-hairline"></div>
            </div>

            <button
              type="button"
              onClick={() => loginWithGoogle()}
              className="w-full flex items-center justify-center gap-3 bg-white border border-hairline text-ink px-4 py-2.5 text-sm font-sans font-medium rounded-[4px] hover:bg-paper transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google Workspace
            </button>
          </form>

          <div className="mt-12 text-center">
            <p className="text-[10px] text-ink-muted font-mono uppercase tracking-widest">
              Secured Connection &bull; Engine v2.4.1
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
