# How artist + song are inferred (Claude Haiku)

## What the LLM does **not** do

- It does **not** fetch or read a **lyrics website URL** (no Genius, AZLyrics, etc.).
- It does **not** see lyrics text from any URL.

## When Haiku runs

| Step | API | LLM |
|------|-----|-----|
| **Search** | `POST /api/youtube` — YouTube Data API only | **No** — titles use **regex** (`parseVideoTitle.js`) for optional `cleanedSong` / `cleanedArtist` on cards |
| **Create lesson** | `POST /api/parseVideoTitle` — body includes **`searchQuery`** (what the user searched), **`title`**, **`channel`** | **Yes** — Haiku uses **q + t + c** to infer artist/song, then `POST /api/lyrics` |

So **one Haiku request per “Create My Lesson”** on the selected video, not per search result row.

If Haiku fails or there is no `ANTHROPIC_API_KEY`, `POST /api/parseVideoTitle` falls back to **regex only** (`parseVideoTitle.js`).

When Haiku **succeeds**, the API returns **`source: "haiku"`** and **artist/song are exactly the model output** (trimmed) — **no** regex merge on the server or client before **`/api/lyrics`**.

## Debug logging

**Haiku runs in `POST /api/parseVideoTitle`** when the user clicks **Create My Lesson**. You will see `[api/parseVideoTitle]` in the server logs, not during search.

**Cached searches** skip YouTube: results are read from `localStorage` (`search_cache:…`). Use **Refresh search** or a different query. Haiku is unrelated to search cache.

By default, the prompt/reply are **logged** unless disabled:

```bash
DEBUG_HAIKU_PROMPT=0
```

Restart `vercel dev` / `npm run dev:full`. When logging is on:

- `[api/parseVideoTitle] Haiku prompt:` — user message  
- `[api/parseVideoTitle] Haiku reply:` — model output  
- `[api/parseVideoTitle] parsed (haiku only, no regex merge)` — artist/song from the model

## Downstream

Parsed **artist** / **song** are used by **`POST /api/lyrics`** (lyrics.ovh + LRCLIB) — **no** LLM at lyrics fetch time.
