'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProductCard from '@/components/store/ProductCard';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(Boolean(initialQuery));

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
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

  const popularSearches = ['Garnet', 'Turquoise', 'Emerald', 'Sapphire', 'Signet', 'Solitaire', 'Bracelet', 'Gemstone'];

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-12 md:py-16">
      <div className="max-w-2xl mx-auto text-center mb-10">
        <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-ink-2 block mb-2">
          Store Search
        </span>
        <h1 className="font-display text-3xl md:text-4xl text-ink font-normal mb-6">
          Find your piece
        </h1>

        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by gemstone, ring style, metal..."
            className="w-full px-5 py-3.5 pr-14 text-sm bg-white border border-line focus:outline-none focus:border-ink transition placeholder:text-neutral-400"
            autoFocus
          />
          <button
            type="submit"
            aria-label="Submit search"
            className="absolute right-0 top-0 bottom-0 px-4 flex items-center justify-center text-ink hover:text-ink-2 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs text-ink-3">
          <span className="font-medium text-ink-2">Popular:</span>
          {popularSearches.map((term) => (
            <button
              key={term}
              onClick={() => {
                setQuery(term);
                router.push(`/search?q=${encodeURIComponent(term)}`);
                performSearch(term);
              }}
              className="hover:text-ink hover:underline transition"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <div className="w-6 h-6 border-2 border-line border-t-ink rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs uppercase tracking-wider text-ink-3">Searching collection...</span>
        </div>
      ) : searched ? (
        <div>
          <div className="flex items-baseline justify-between border-b border-line pb-4 mb-8">
            <span className="text-xs uppercase tracking-wider text-ink-2">
              Results for &ldquo;{query}&rdquo;
            </span>
            <span className="text-xs text-ink-3">
              {results.length} piece{results.length === 1 ? '' : 's'} found
            </span>
          </div>

          {results.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {results.map((product) => (
                <ProductCard key={product.id || product.handle} product={product} />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center max-w-md mx-auto">
              <p className="text-base font-display text-ink mb-2">No matching jewellery found</p>
              <p className="text-xs text-ink-3 leading-relaxed mb-6">
                Try searching for a different gemstone name, style like solitaire or signet, or browse our full collection.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
