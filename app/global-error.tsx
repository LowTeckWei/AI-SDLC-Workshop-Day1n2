'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <main className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-lg border border-gray-200 p-8 text-center shadow-sm dark:border-gray-800">
            <h1 className="mb-2 text-2xl font-semibold">Something went wrong</h1>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
              A critical error occurred. Please try again.
            </p>
            <button
              type="button"
              onClick={reset}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
