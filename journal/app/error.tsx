"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="max-w-md rounded-lg border border-red-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
        <p className="mt-3 text-sm text-gray-600">
          We hit an unexpected issue while loading this page. Please try again or go back home.
        </p>
        <p className="mt-4 text-sm text-red-600">{error.message}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => reset()}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
