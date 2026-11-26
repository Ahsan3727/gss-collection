'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductCard from '@/components/store/ProductCard';
import type { ProductRecord } from '@/lib/types';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(Boolean(initialQuery));
  const [error, setError] = useState('');

  const performSearch = async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      setError('');
      return;
    }

    setLoading(true);
    setSearched(true);
    setError('');
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      const data = (await res.json()) as { results?: ProductRecord[]; error?: string };
      if (!res.ok) {
        setError(data.error || 'Search temporarily unavailable.');
        setResults([]);
      } else {
        setResults(data.results || []);
      }
    } catch {
      setError('Connection error while searching. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      performSearch(query.trim());
    }
  };

  const popularSearches = [
    'Garnet',
    'Turquoise',
    'Emerald',
    'Sapphire',
    'Signet',
    'Solitaire',
    'Bracelet',
    'Gemstone',
  ];

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-10 md:py-16">
      <div className="max-w-2xl mx-auto text-center mb-10">
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-ink-2 block mb-2">
          Store Search
        </span>
        <h1 className="font-display text-3xl md:text-4xl text-ink font-normal mb-6">
          Find your piece
        </h1>

        <form onSubmit={handleSearchSubmit} className="relative" role="search">
          <label htmlFor="store-search-input" className="sr-only">
            Search jewellery and gemstones
          </label>
          <input
            id="store-search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by gemstone, ring style, metal..."
            className="w-full px-4 min-h-[48px] pr-14 text-base bg-white border border-line focus:outline-none focus:border-ink transition placeholder:text-neutral-500"
          />
          <button
            type="submit"
            aria-label="Submit search"
            className="absolute right-0 top-0 bottom-0 min-w-[48px] flex items-center justify-center text-ink hover:text-ink-2 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4 text-xs text-ink-2">
          <span className="font-semibold text-ink mr-1">Popular:</span>
          {popularSearches.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => {
                setQuery(term);
                router.push(`/search?q=${encodeURIComponent(term)}`);
                performSearch(term);
              }}
              className="px-3 min-h-[44px] hover:text-ink hover:underline transition inline-flex items-center"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="max-w-xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 text-error text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center">
          <div className="w-6 h-6 border-2 border-line border-t-ink rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs uppercase tracking-wider text-ink-2">
            Searching collection...
          </span>
        </div>
      ) : searched ? (
        <div>
          <div className="flex items-baseline justify-between border-b border-line pb-4 mb-8">
            <span className="text-xs uppercase tracking-wider text-ink-2">
              Results for &ldquo;{query}&rdquo;
            </span>
            <span className="text-xs text-ink-2">
              {results.length} piece{results.length === 1 ? '' : 's'} found
            </span>
          </div>

          {results.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-8">
              {results.map((product) => (
                <ProductCard key={product.id || product.handle} product={product} />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center max-w-md mx-auto">
              <p className="text-xl font-display text-ink mb-2">No matching jewellery found</p>
              <p className="text-sm text-ink-2 leading-relaxed mb-6">
                Try searching for a different gemstone name, style like solitaire or signet, or browse our full collection.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-site mx-auto px-4 py-16 text-center text-xs uppercase tracking-wider text-ink-2">
          Loading search...
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
