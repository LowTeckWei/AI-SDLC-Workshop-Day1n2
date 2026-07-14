import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 p-8 text-center shadow-sm dark:border-gray-800">
        <h1 className="mb-2 text-2xl font-semibold">Page not found</h1>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Back to Todos
        </Link>
      </div>
    </main>
  );
}
