'use client';

import Link from 'next/link';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 p-8 text-center shadow-sm dark:border-gray-800">
        <h1 className="mb-2 text-2xl font-semibold">Something went wrong</h1>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
          An unexpected error occurred. You can try again, or head back to the home page.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            Try again
          </button>
          <Link
            href="/"
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium dark:border-gray-700"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
