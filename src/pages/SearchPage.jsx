import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  getCachedSearch,
  setSearchCache,
  clearSearchCacheForQuery,
  getRecentSearches,
  addRecentSearch,
} from '../hooks/useSearch';
import LessonCard from '../components/LessonCard';
import GuitarFretboard from '../components/GuitarFretboard';
import LessonRecommender from '../components/LessonRecommender';
import SearchBar from '../components/SearchBar';
import SkeletonCard from '../components/SkeletonCard';

function buildSuggestions(query, recentSearches, remoteSuggestions) {
  const q = query.trim().toLowerCase();
  if (q.length === 0) {
    return recentSearches.slice(0, 8);
  }
  if (q.length === 1) {
    return recentSearches
      .filter((r) => r.toLowerCase().includes(q))
      .slice(0, 8);
  }
  const merged = [];
  const seen = new Set();
  for (const r of recentSearches) {
    if (r.toLowerCase().includes(q) && !seen.has(r.toLowerCase())) {
      seen.add(r.toLowerCase());
      merged.push(r);
    }
  }
  for (const s of remoteSuggestions) {
    const key = s.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(s);
    }
  }
  return merged.slice(0, 12);
}

/** idle: no search yet | loading | results | empty */
export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searchState, setSearchState] = useState('idle');
  const [error, setError] = useState(null);
  /** True when last search came from localStorage (skipped /api/youtube). */
  const [usedCache, setUsedCache] = useState(false);
  /** Query string used for the current result list (passed to Haiku when creating a lesson). */
  const [searchQueryForResults, setSearchQueryForResults] = useState('');

  const [focused, setFocused] = useState(false);
  const [remoteSuggestions, setRemoteSuggestions] = useState([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listId = 'fretboard-search-suggestions';

  const [searchOpen, setSearchOpen] = useState(false);

  const recentSearches = getRecentSearches();

  const suggestions = useMemo(
    () => buildSuggestions(query, recentSearches, remoteSuggestions),
    [query, recentSearches, remoteSuggestions]
  );

  const showDropdown = focused && suggestions.length > 0;

  useEffect(() => {
    setHighlightIndex(-1);
  }, [query, suggestions.length]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setRemoteSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!controller.signal.aborted) {
          setRemoteSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        }
      } catch {
        if (!controller.signal.aborted) {
          setRemoteSuggestions([]);
        }
      }
    }, 280);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleSearch = useCallback(async (explicitQuery, opts = {}) => {
    const { forceRefresh = false } = opts;
    const trimmed = (explicitQuery !== undefined ? explicitQuery : query).trim();
    if (!trimmed) return;

    setFocused(false);
    setError(null);
    if (!forceRefresh) {
      const cached = getCachedSearch(trimmed);
      if (cached) {
        setUsedCache(true);
        setSearchQueryForResults(trimmed);
        setResults(cached);
        setSearchState(cached.length > 0 ? 'results' : 'empty');
        return;
      }
    }

    setUsedCache(false);
    setSearchState('loading');
    setResults(null);
    try {
      const res = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setSearchQueryForResults(trimmed);
        setSearchCache(trimmed, data);
        setResults(data);
        setSearchState(data.length > 0 ? 'results' : 'empty');
      } else if (data?.error) {
        setError(data.error);
        setResults([]);
        setSearchState('empty');
      } else {
        setResults([]);
        setSearchState('empty');
      }
      addRecentSearch(trimmed);
    } catch {
      setError(
        'Search API unavailable. Run "npx vercel dev" for full-stack local development (or deploy to Vercel).'
      );
      setResults([]);
      setSearchState('empty');
    }
  }, [query]);

  const refreshSearch = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    clearSearchCacheForQuery(q);
    handleSearch(q, { forceRefresh: true });
  }, [query, handleSearch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (highlightIndex >= 0 && suggestions[highlightIndex]) {
      const pick = suggestions[highlightIndex];
      setQuery(pick);
      setFocused(false);
      handleSearch(pick);
      return;
    }
    handleSearch();
  };

  const selectSuggestion = useCallback(
    (text) => {
      setQuery(text);
      setFocused(false);
      handleSearch(text);
    },
    [handleSearch]
  );

  const onKeyDown = (e) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(suggestions.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(-1, i - 1));
    } else if (e.key === 'Escape') {
      setFocused(false);
    }
  };

  const handleRecentClick = (q) => {
    setQuery(q);
    handleSearch(q);
  };

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (!prev) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      return !prev;
    });
  }, []);

  const fetchSummarize = async (video) => {
    if (!video.transcript) return null;
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.videoId,
          transcript: video.transcript,
          title: video.title,
        }),
      });
      return res.json();
    } catch {
      return null;
    }
  };

  return (
    <div className="mx-auto max-w-[480px] px-4 py-6">
      <h1 className="mb-4 font-diary text-4xl font-semibold leading-tight text-brand-amber">
        Fretboard Diary
      </h1>

      <div className="-mx-4 mb-1 w-[calc(100%+2rem)] sm:mx-0 sm:mb-1 sm:w-full">
        <GuitarFretboard />
      </div>
      <p className="mb-4 mt-1.5 text-center text-[11px] text-[#6b6560]">
        tap a string to hear the open note
      </p>

      <div className="mb-4 flex flex-col gap-[10px]">
        <LessonRecommender />

        <div>
          <button
            type="button"
            onClick={toggleSearch}
            aria-expanded={searchOpen}
            className="flex w-full items-center justify-between rounded-[10px] border border-[#3d3830] bg-[#221f1a] px-4 py-3 text-left transition-colors hover:border-[#4d4840]"
            style={{ borderWidth: '0.5px' }}
          >
            <span className="text-sm font-medium text-[#EF9F27]">
              🔎 Search yourself
            </span>
            <span
              className={`inline-block text-[#6b6560] transition-transform duration-200 ease-out ${
                searchOpen ? 'rotate-90' : ''
              }`}
              aria-hidden
            >
              ›
            </span>
          </button>

          <div
            className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
            style={{ maxHeight: searchOpen ? 2000 : 0 }}
          >
            <div className="pt-2.5">
              <SearchBar
                ref={searchInputRef}
                containerRef={containerRef}
                listId={listId}
                query={query}
                onQueryChange={setQuery}
                showDropdown={showDropdown}
                onInputFocus={() => setFocused(true)}
                onKeyDown={onKeyDown}
                highlightIndex={highlightIndex}
                suggestions={suggestions}
                onSelectSuggestion={selectSuggestion}
                onSubmit={handleSubmit}
              />

              {recentSearches.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-brand-muted">
                    Recent searches
                  </p>
                  <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide">
                    {recentSearches.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleRecentClick(q)}
                        className="shrink-0 rounded-full border border-brand-border bg-brand-surface px-3 py-1.5 text-sm text-brand-muted hover:border-brand-amber hover:text-white"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {searchState === 'loading' && (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              )}

              {searchState === 'results' && results && results.length > 0 && (
                <div className="space-y-3">
                  {usedCache && (
                    <div
                      role="status"
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-border bg-brand-bg/60 px-3 py-2 text-xs text-brand-muted"
                    >
                      <span>
                        Showing cached results — no new YouTube search.
                      </span>
                      <button
                        type="button"
                        onClick={refreshSearch}
                        className="shrink-0 rounded-md border border-brand-amber/50 bg-brand-surface px-2 py-1 text-xs font-medium text-brand-amber hover:bg-brand-bg"
                      >
                        Refresh search
                      </button>
                    </div>
                  )}
                  {results.map((video) => (
                    <LessonCard
                      key={video.videoId}
                      video={video}
                      searchQuery={searchQueryForResults}
                      onFetchSummarize={fetchSummarize}
                    />
                  ))}
                </div>
              )}

              {searchState === 'empty' && (
                <div className="py-12 text-center">
                  {usedCache && !error && (
                    <div
                      role="status"
                      className="mx-auto mb-4 flex max-w-sm flex-wrap items-center justify-center gap-2 rounded-lg border border-brand-border bg-brand-bg/60 px-3 py-2 text-xs text-brand-muted"
                    >
                      <span>Cached empty result — no new API call.</span>
                      <button
                        type="button"
                        onClick={refreshSearch}
                        className="shrink-0 rounded-md border border-brand-amber/50 bg-brand-surface px-2 py-1 text-xs font-medium text-brand-amber hover:bg-brand-bg"
                      >
                        Refresh search
                      </button>
                    </div>
                  )}
                  {error ? (
                    <p className="mx-auto max-w-sm text-sm text-brand-amber/90">
                      {error}
                    </p>
                  ) : (
                    <p className="text-brand-muted">
                      No lessons found for this search — try a different song or
                      artist
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
