# Lyrics fetch — what can go wrong

Flow: **LessonCard** → `fetchLyricsPreferApiFirst(song, artist)` → **`POST /api/lyrics`** (Vercel) → `fetchLyricsFromSong` → lyrics.ovh + LRCLIB.

## Browser console (always useful)

| Message | Meaning |
|--------|---------|
| `[lyrics] FAILED: POST /api/lyrics non-OK` | `/api/lyrics` returned 4xx/5xx. Check `status`, `json` (e.g. `{ error: 'Song required' }`). |
| `[lyrics] FAILED: POST /api/lyrics non-JSON` | Proxy returned HTML (wrong URL, 500 page). |
| `[lyrics] FAILED: POST /api/lyrics returned no usable sections` | API returned 200 but `error: 'Lyrics not found'` or empty sections. |
| `[lyrics] FAILED: POST /api/lyrics fetch threw` | Network/CORS — e.g. `npm run dev` **without** `/api` (use `npm run dev:full` / `vercel dev`). |
| `[lyrics] FAILED: empty song after trim` | `song` was empty after trim (should be rare after LessonCard fallback). |
| `[lyrics] FAILED: all strategies exhausted` | Browser fallback: lyrics.ovh + LRCLIB all failed. |
| `[lyrics] Create lesson fetch failed` | thrown exception (see stack in console). |

**Verbose:** `localStorage.setItem('DEBUG_LYRICS', '1')` → reload → see `[lyrics]` attempt logs.

## Server / Vercel logs (`/api/lyrics`)

- `[api/lyrics] 400 missing song` — body missing `song` (often empty after parse).
- `[api/lyrics] no lyrics` — all backends failed.
- `[api/lyrics] exception` — thrown error in handler.

## Common causes

1. **Wrong dev server** — Only `vite` → no `/api/lyrics`. Use **`npm run dev:full`** (or `vercel dev`).
2. **Empty song after Haiku** — If `source: "haiku"` but song/artist are empty, LessonCard does **not** apply regex; try another video or check Haiku output in logs. Regex fallbacks apply only when `source: "regex"` (no key or Haiku error).
3. **Lyrics APIs** — lyrics.ovh down/slow; LRCLIB has no match; instrumental tracks.
4. **Browser-only LRCLIB** — If `/api/lyrics` fails, fallback uses LRCLIB from the browser; **CORS** can block LRCLIB (lyrics.ovh usually works).

## Quick checks

```bash
# API should return JSON with sections or error
curl -s -X POST http://localhost:3000/api/lyrics \
  -H 'Content-Type: application/json' \
  -d '{"song":"Wonderwall","artist":"Oasis"}' | head -c 800
```

(Adjust port to whatever `vercel dev` prints.)
