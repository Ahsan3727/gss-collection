'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ground px-4 py-12">
      <div className="max-w-md w-full bg-white border border-line p-8 md:p-10 shadow-sm">
        <div className="text-center mb-8">
          <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-ink-2 block mb-2">
            GSS Collection
          </span>
          <h1 className="font-display text-3xl font-medium text-ink">
            Admin Authentication
          </h1>
          <p className="text-xs text-ink-3 mt-2">
            Restricted access portal for authorized store managers only.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-wider font-medium text-ink mb-2">
              Administrator Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@gsscollection.com"
              className="w-full px-3.5 py-2.5 border border-line text-sm focus:outline-none focus:border-ink transition"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-medium text-ink mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 border border-line text-sm focus:outline-none focus:border-ink transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-white py-3 text-xs uppercase tracking-[0.2em] font-medium hover:bg-neutral-800 transition disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-line text-center">
          <span className="text-[11px] text-ink-3">
            Protected with bcrypt cost 12, brute-force lockout & secure JWT sessions.
          </span>
        </div>
      </div>
    </div>
  );
}
