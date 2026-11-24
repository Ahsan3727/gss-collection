import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[65vh] flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full text-center">
        <span className="font-display text-6xl text-ink-3 font-light block mb-2">
          404
        </span>
        <h1 className="font-display text-3xl text-ink font-normal mb-4">
          Page Not Found
        </h1>
        <p className="text-ink-2 text-sm leading-relaxed mb-8">
          The item or page you are looking for may have been retired, moved, or is temporarily unavailable.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/collections/all"
            className="bg-ink text-white text-xs uppercase tracking-[0.18em] px-6 py-3.5 font-medium hover:bg-neutral-800 transition text-center"
          >
            Browse Jewellery
          </Link>
          <Link
            href="/"
            className="border border-line text-ink text-xs uppercase tracking-[0.18em] px-6 py-3.5 font-medium hover:border-ink transition text-center"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
