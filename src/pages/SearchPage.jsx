import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  getCachedSearch,
  setSearchCache,
  getRecentSearches,
  addRecentSearch,
} from '../hooks/useSearch';
import LessonCard from '../components/LessonCard';
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

  const [focused, setFocused] = useState(false);
  const [remoteSuggestions, setRemoteSuggestions] = useState([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const containerRef = useRef(null);
  const listId = 'fretboard-search-suggestions';

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

  const handleSearch = useCallback(async (explicitQuery) => {
    const trimmed = (explicitQuery !== undefined ? explicitQuery : query).trim();
    if (!trimmed) return;

    setFocused(false);
    setError(null);
    const cached = getCachedSearch(trimmed);
    if (cached) {
      setResults(cached);
      setSearchState(cached.length > 0 ? 'results' : 'empty');
      return;
    }

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
      <h1 className="mb-4 text-2xl font-semibold text-brand-amber">
        Fretboard Diary
      </h1>

      <form onSubmit={handleSubmit} className="mb-4">
        <label htmlFor="fretboard-search" className="sr-only">
          Search a song or artist
        </label>
        <div ref={containerRef} className="relative">
          <input
            id="fretboard-search"
            name="q"
            type="search"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              highlightIndex >= 0 ? `${listId}-opt-${highlightIndex}` : undefined
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={onKeyDown}
            placeholder="Search a song or artist..."
            autoComplete="off"
            enterKeyHint="search"
            className="w-full rounded-lg border border-brand-border bg-brand-surface px-4 py-3 text-white placeholder-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-amber"
          />
          {showDropdown && (
            <ul
              id={listId}
              role="listbox"
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-brand-border bg-brand-surface py-1 shadow-lg"
            >
              {suggestions.map((text, i) => (
                <li
                  key={`${text}-${i}`}
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={i === highlightIndex}
                  className={`flex min-h-[44px] cursor-pointer items-center px-4 py-3 text-left text-sm text-white ${
                    i === highlightIndex ? 'bg-brand-bg' : 'hover:bg-brand-bg/80'
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(text)}
                >
                  {text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </form>

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
          {/* Each video includes cleanedSong + cleanedArtist (Claude Haiku in /api/youtube); LessonCard uses them for /api/lyrics */}
          {results.map((video) => (
            <LessonCard
              key={video.videoId}
              video={video}
              onFetchSummarize={fetchSummarize}
            />
          ))}
        </div>
      )}

      {searchState === 'empty' && (
        <div className="py-12 text-center">
          {error ? (
            <p className="mx-auto max-w-sm text-sm text-brand-amber/90">{error}</p>
          ) : (
            <p className="text-brand-muted">
              No lessons found for this search — try a different song or artist
            </p>
          )}
        </div>
      )}
    </div>
  );
}
