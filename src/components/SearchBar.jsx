import { forwardRef } from 'react';

const SearchBar = forwardRef(function SearchBar(
  {
    containerRef,
    listId,
    query,
    onQueryChange,
    showDropdown,
    onInputFocus,
    onKeyDown,
    highlightIndex,
    suggestions,
    onSelectSuggestion,
    onSubmit,
  },
  ref
) {
  return (
    <form onSubmit={onSubmit} className="mb-4">
      <label htmlFor="fretboard-search" className="sr-only">
        Search a song or artist
      </label>
      <div ref={containerRef} className="relative">
        <input
          ref={ref}
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
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={onInputFocus}
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
                onClick={() => onSelectSuggestion(text)}
              >
                {text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;
