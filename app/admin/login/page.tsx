'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin';
  const urlError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(
    urlError === 'AccessDenied' ? 'Administrator permissions are required for that route.' : ''
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please verify credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ground px-4 py-12">
      <div className="max-w-md w-full bg-white border border-line p-6 sm:p-10 shadow-sm">
        <div className="text-center mb-8">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-ink-2 block mb-2">
            GSS Collection
          </span>
          <h1 className="font-display text-3xl font-medium text-ink">
            Admin Authentication
          </h1>
          <p className="text-xs text-ink-2 mt-2">
            Restricted access portal for authorized store managers only.
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-6 p-3.5 bg-red-50 border border-red-200 text-error text-xs font-medium rounded-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="admin-email" className="block text-xs uppercase tracking-wider font-semibold text-ink mb-2">
              Administrator Email
            </label>
            <input
              id="admin-email"
              type="email"
              inputMode="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@gsscollection.com"
              className="w-full px-3.5 min-h-[48px] border border-line text-base focus:outline-none focus:border-ink transition"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-xs uppercase tracking-wider font-semibold text-ink mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full px-3.5 pr-16 min-h-[48px] border border-line text-base focus:outline-none focus:border-ink transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-0 top-0 bottom-0 px-3 min-w-[44px] flex items-center justify-center text-xs font-semibold uppercase tracking-wider text-ink-2 hover:text-ink"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-white min-h-[48px] text-xs uppercase tracking-[0.2em] font-semibold hover:bg-neutral-800 transition disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-line text-center">
          <span className="text-xs text-ink-2">
            Protected with bcrypt hashing, lockout, and signed sessions.
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-ground text-xs text-ink-2">
          Loading login...
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
