'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister() {
    const optionsResponse = await fetch('/api/auth/register-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const options = await optionsResponse.json();
    if (!optionsResponse.ok) {
      throw new Error(options.error ?? 'Failed to start registration');
    }

    const attestationResponse = await startRegistration({ optionsJSON: options });

    const verifyResponse = await fetch('/api/auth/register-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: attestationResponse }),
    });
    const verifyResult = await verifyResponse.json();
    if (!verifyResponse.ok || !verifyResult.verified) {
      throw new Error(verifyResult.error ?? 'Registration could not be verified');
    }
  }

  async function handleLogin() {
    const optionsResponse = await fetch('/api/auth/login-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const options = await optionsResponse.json();
    if (!optionsResponse.ok) {
      throw new Error(options.error ?? 'Failed to start login');
    }

    const assertionResponse = await startAuthentication({ optionsJSON: options });

    const verifyResponse = await fetch('/api/auth/login-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: assertionResponse }),
    });
    const verifyResult = await verifyResponse.json();
    if (!verifyResponse.ok || !verifyResult.verified) {
      throw new Error(verifyResult.error ?? 'Login could not be verified');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Please enter a username');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'register') {
        await handleRegister();
      } else {
        await handleLogin();
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 p-8 shadow-sm dark:border-gray-800">
        <h1 className="mb-6 text-center text-2xl font-semibold">Todo App</h1>

        <div className="mb-6 flex rounded-md border border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 rounded-l-md px-4 py-2 text-sm font-medium ${
              mode === 'login'
                ? 'bg-blue-600 text-white'
                : 'bg-transparent text-gray-600 dark:text-gray-300'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 rounded-r-md px-4 py-2 text-sm font-medium ${
              mode === 'register'
                ? 'bg-blue-600 text-white'
                : 'bg-transparent text-gray-600 dark:text-gray-300'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username webauthn"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              placeholder="yourname"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSubmitting
              ? 'Please wait...'
              : mode === 'register'
                ? 'Register with Passkey'
                : 'Log In with Passkey'}
          </button>
        </form>
      </div>
    </main>
  );
}
