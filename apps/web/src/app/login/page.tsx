'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { BrandLogo } from '@/components/brand/brand-logo';
import { useAuth } from '@/hooks/use-auth';

export default function LoginPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to customers
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && user) {
      router.replace('/customers');
    }
  }, [isAuthLoading, isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }

    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success('Signed in successfully');
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPw: string) => {
    setEmail(demoEmail);
    setPassword(demoPw);
    setError(null);
  };

  return (
    <div className="login">
      {/* ── Left Branded Art Panel ── */}
      <section className="login-art" aria-hidden="false">
        <a className="brand flex items-center gap-2.5" href="/login">
          <BrandLogo className="w-[26px] h-[26px]" />
          <span className="brand-name">FinPilot</span>
        </a>

        <div>
          <h1>Know where a customer&apos;s money stands.</h1>
          <p>
            Portfolio value, goals, risk profile and recent activity for every
            customer, in one place for the service team.
          </p>
        </div>

        <div>
          {/* Sample allocation visual strip */}
          <div
            className="strip"
            role="img"
            aria-label="Sample asset allocation indicator"
          >
            <i
              className="inline-block h-full transition-all"
              style={{ flex: 42, background: '#7f93e6' }}
            />
            <i
              className="inline-block h-full transition-all"
              style={{ flex: 23, background: '#5b86c4' }}
            />
            <i
              className="inline-block h-full transition-all"
              style={{ flex: 18, background: '#4fb3a5' }}
            />
            <i
              className="inline-block h-full transition-all"
              style={{ flex: 11, background: '#b79ad0' }}
            />
            <i
              className="inline-block h-full transition-all"
              style={{ flex: 6, background: '#e3a008' }}
            />
          </div>
          <small>Synthetic assessment data only. No real customer or market data.</small>
        </div>
      </section>

      {/* ── Right Form Panel ── */}
      <section className="login-form">
        <div className="inner">
          <div>
            <h2 className="h2" style={{ fontSize: '34px' }}>
              Sign in
            </h2>
            <p className="muted" style={{ marginTop: '6px' }}>
              Use your FinPilot work account.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="grid" style={{ gap: '16px' }}>
            {error && (
              <div className="banner bad" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                className="input"
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@finpilot.test"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                className="input"
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isSubmitting}
                required
              />
            </div>

            <button
              className="btn justify-center w-full"
              id="login-btn"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div>
            <p className="lbl" style={{ marginBottom: '8px' }}>
              Demo accounts
            </p>
            <div className="demo">
              <div>
                <div>
                  <span className="em">Viewer</span>
                  <br />
                  <span className="hint">viewer@finpilot.test · Viewer#2026</span>
                </div>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => handleFillDemo('viewer@finpilot.test', 'Viewer#2026')}
                >
                  Use
                </button>
              </div>

              <div>
                <div>
                  <span className="em">Admin</span>
                  <br />
                  <span className="hint">admin@finpilot.test · Admin#2026</span>
                </div>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => handleFillDemo('admin@finpilot.test', 'Admin#2026')}
                >
                  Use
                </button>
              </div>
            </div>

            <p className="hint" style={{ marginTop: '10px' }}>
              Viewers can browse and edit goals. Admins can also import data.
              Authentication uses a secure httpOnly cookie session.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

