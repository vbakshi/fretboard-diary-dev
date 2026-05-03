import { useState, useEffect, useCallback, useRef } from 'react';
import { useCreateLesson } from '../hooks/useCreateLesson';
import { useAuth } from '../context/AuthContext';
import CreateLessonAuthModal from './CreateLessonAuthModal';

const BEGINNER_ARTISTS = [
  'Ed Sheeran', 'Taylor Swift', 'Oasis', 'The Beatles', 'Bob Dylan',
  'Johnny Cash', 'Jack Johnson', 'Jason Mraz', 'Passenger', 'James Bay',
  'Tom Petty', 'John Denver', 'The Lumineers', 'Vance Joy', 'Hozier',
  'Nirvana', 'Green Day', 'Arctic Monkeys', 'Twenty One Pilots', 'Coldplay',
  'Elvis Presley', 'Neil Young', 'Cat Stevens', 'Ben Harper', 'Iron & Wine',
];

const INTERMEDIATE_ARTISTS = [
  'Eric Clapton', 'John Mayer', 'Red Hot Chili Peppers', 'Radiohead', 'Pearl Jam',
  'Dave Matthews Band', 'Foo Fighters', 'The Eagles', 'Fleetwood Mac', 'U2',
  'Bruce Springsteen', 'Bob Marley', 'Simon & Garfunkel', 'Creedence Clearwater Revival',
  'The Strokes', 'Kings of Leon', 'Tame Impala', 'Vampire Weekend', 'R.E.M.',
  'Pixies', 'The Cure', 'Talking Heads', 'Paul Simon', 'James Taylor', 'Sting',
];

const EXPERT_ARTISTS = [
  'Jimi Hendrix', 'Stevie Ray Vaughan', 'Carlos Santana', 'B.B. King', 'Joe Satriani',
  'Steve Vai', 'Slash', 'Angus Young', 'Jimmy Page', 'David Gilmour',
  'Mark Knopfler', 'Chet Atkins', 'Tommy Emmanuel', 'Andy McKee', 'Buckethead',
  'Guthrie Govan', 'John Petrucci', 'Dimebag Darrell', 'Eddie Van Halen', 'Randy Rhoads',
  'Robert Johnson', 'Django Reinhardt', 'Pat Metheny', 'John Scofield', 'Wes Montgomery',
];

const DIFFICULTY_CARDS = [
  {
    key: 'beginner',
    icon: '🌱',
    label: 'Beginner',
    blurb: 'Open chords, simple strums',
  },
  {
    key: 'intermediate',
    icon: '🔥',
    label: 'Intermediate',
    blurb: 'Barre chords, fingerpicking',
  },
  {
    key: 'expert',
    icon: '⚡',
    label: 'Expert',
    blurb: 'Lead, theory, complex riffs',
  },
];

function selectRecommendation(difficulty, selectedArtists) {
  let artist;
  if (selectedArtists.length > 0) {
    artist =
      selectedArtists[Math.floor(Math.random() * selectedArtists.length)];
  } else {
    const list =
      difficulty === 'beginner'
        ? BEGINNER_ARTISTS
        : difficulty === 'intermediate'
          ? INTERMEDIATE_ARTISTS
          : EXPERT_ARTISTS;
    artist = list[Math.floor(Math.random() * list.length)];
  }
  return artist;
}

function artistListForDifficulty(d) {
  if (d === 'beginner') return BEGINNER_ARTISTS;
  if (d === 'intermediate') return INTERMEDIATE_ARTISTS;
  return EXPERT_ARTISTS;
}

const DIFF_STYLES = {
  Beginner: 'bg-green-600/30 text-green-400 border-green-500/50',
  Intermediate: 'bg-yellow-600/30 text-yellow-400 border-yellow-500/50',
  Advanced: 'bg-red-600/30 text-red-400 border-red-500/50',
};

export default function LessonRecommender() {
  const { user } = useAuth();
  const { createLessonFromVideo, creating } = useCreateLesson('');
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [step, setStep] = useState(1);
  const [difficulty, setDifficulty] = useState(null);
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [bubblesVisible, setBubblesVisible] = useState(false);
  const [recommended, setRecommended] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [tryAnotherLoading, setTryAnotherLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const lastQueryRef = useRef('');

  useEffect(() => {
    if (step === 2) {
      setBubblesVisible(false);
      const t = requestAnimationFrame(() => {
        setBubblesVisible(true);
      });
      return () => cancelAnimationFrame(t);
    }
    setBubblesVisible(false);
  }, [step]);

  const runFetch = useCallback(
    async ({ isRetry = false } = {}) => {
      if (!difficulty) return;
      const artist = selectRecommendation(difficulty, selectedArtists);
      const query = `${artist} guitar lesson ${difficulty}`;
      lastQueryRef.current = query;
      setFetchError(false);
      if (isRetry) {
        setTryAnotherLoading(true);
      } else {
        setFetchLoading(true);
        setRecommended(null);
      }
      try {
        const res = await fetch('/api/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        const videos = await res.json();
        if (!Array.isArray(videos) || videos.length === 0) {
          if (!isRetry) setRecommended(null);
          setFetchError(true);
          return;
        }
        setFetchError(false);
        setRecommended(videos[0]);
      } catch {
        if (!isRetry) setRecommended(null);
        setFetchError(true);
      } finally {
        setFetchLoading(false);
        setTryAnotherLoading(false);
      }
    },
    [difficulty, selectedArtists]
  );

  const goStep2 = () => {
    if (!difficulty) return;
    setStep(2);
  };

  const finishStep2 = () => {
    setStep(3);
    runFetch({ isRetry: false });
  };

  const toggleArtist = (name) => {
    setSelectedArtists((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  };

  const handleBack = () => {
    if (step === 1) {
      setExpanded(false);
      setStep(1);
      setDifficulty(null);
      setSelectedArtists([]);
      setRecommended(null);
      setFetchError(false);
      setTryAnotherLoading(false);
      setFetchLoading(false);
      return;
    }
    if (step === 2) {
      setStep(1);
      return;
    }
    if (step === 3) {
      setStep(2);
      setRecommended(null);
      setFetchError(false);
      setTryAnotherLoading(false);
    }
  };

  const handleTryAnother = () => {
    runFetch({ isRetry: true });
  };

  const handleCreateLesson = () => {
    if (!recommended) return;
    if (!user) {
      setAuthGateOpen(true);
      return;
    }
    createLessonFromVideo(recommended, {
      searchQuery: lastQueryRef.current,
    });
  };

  const artists = difficulty ? artistListForDifficulty(difficulty) : [];

  return (
    <div className="mb-0">
      <CreateLessonAuthModal
        open={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        onContinueGuest={() => {
          setAuthGateOpen(false);
          if (!recommended) return;
          createLessonFromVideo(recommended, {
            searchQuery: lastQueryRef.current,
            guestMode: true,
          });
        }}
        videoTitle={recommended?.title}
      />
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between rounded-[10px] border border-[#3d3830] bg-[#221f1a] px-4 py-3 text-left transition-colors hover:border-[#4d4840]"
        style={{ borderWidth: '0.5px' }}
      >
        <span className="text-sm font-medium text-[#EF9F27]">
          ✦ Find me a lesson
        </span>
        <span
          className={`inline-block text-[#6b6560] transition-transform duration-300 ${
            expanded ? 'rotate-90' : ''
          }`}
          aria-hidden
        >
          ›
        </span>
      </button>

      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: expanded ? 2200 : 0 }}
      >
        <div className="pt-3">
          <div className="relative mb-3 flex items-center justify-center">
            <button
              type="button"
              onClick={handleBack}
              className="absolute left-0 top-1/2 -translate-y-1/2 text-lg text-[#6b6560] hover:text-[#EF9F27]"
              aria-label={step === 1 ? 'Close recommender' : 'Back'}
            >
              ←
            </button>
            <div className="flex gap-2">
              {[1, 2, 3].map((d) => (
                <span
                  key={d}
                  className="rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    background: step === d ? '#EF9F27' : '#3d3830',
                  }}
                  aria-hidden
                />
              ))}
            </div>
          </div>

          <div className="overflow-hidden">
            <div
              className="flex w-[300%] transition-transform duration-[250ms] ease-out"
              style={{
                transform: `translateX(-${(step - 1) * (100 / 3)}%)`,
              }}
            >
              {/* Step 1 */}
              <div className="w-1/3 min-w-[33.333%] shrink-0 px-0.5">
                <h2 className="text-base font-medium text-white">
                  What&apos;s your level?
                </h2>
                <p className="mt-1 text-xs text-[#6b6560]">
                  We&apos;ll tailor the lesson to match
                </p>
                <div className="mt-4 flex gap-2">
                  {DIFFICULTY_CARDS.map((c) => {
                    const sel = difficulty === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setDifficulty(c.key)}
                        className="flex flex-1 flex-col items-center rounded-[10px] border px-2 py-4 text-center transition-colors"
                        style={{
                          borderWidth: '0.5px',
                          borderColor: sel ? '#EF9F27' : '#3d3830',
                          background: sel ? '#2e2510' : '#221f1a',
                        }}
                      >
                        <span className="text-xl" aria-hidden>
                          {c.icon}
                        </span>
                        <span
                          className="mt-2 text-xs font-medium"
                          style={{ color: sel ? '#EF9F27' : '#888780' }}
                        >
                          {c.label}
                        </span>
                        <span className="mt-1 text-[10px] text-[#4d4840]">
                          {c.blurb}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {difficulty && (
                  <button
                    type="button"
                    onClick={goStep2}
                    className="mt-4 w-full rounded-[10px] py-2.5 text-center text-sm font-semibold text-[#1a1510]"
                    style={{ background: '#EF9F27', padding: '10px' }}
                  >
                    Next →
                  </button>
                )}
              </div>

              {/* Step 2 */}
              <div className="w-1/3 min-w-[33.333%] shrink-0 px-0.5">
                <h2 className="text-base font-medium text-white">
                  Pick artists you like
                </h2>
                <p className="mt-1 text-xs text-[#6b6560]">
                  Select one or more, or skip
                </p>
                <div
                  className="mt-4 flex flex-wrap gap-2"
                  style={{ gap: 8 }}
                >
                  {artists.map((name, i) => {
                    const sel = selectedArtists.includes(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleArtist(name)}
                        className="rounded-[20px] border text-xs transition-[opacity,background-color,border-color,color] duration-300 ease-out"
                        style={{
                          borderWidth: '0.5px',
                          borderColor: sel ? '#EF9F27' : '#3d3830',
                          background: sel ? '#2e2510' : '#221f1a',
                          color: sel ? '#EF9F27' : '#888780',
                          padding: '7px 14px',
                          opacity: bubblesVisible ? 1 : 0,
                          transitionDelay: bubblesVisible
                            ? `${Math.min(i * 50, 400)}ms`
                            : '0ms',
                        }}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={finishStep2}
                    className="flex-1 rounded-[10px] border border-[#3d3830] bg-transparent py-2.5 text-sm text-[#6b6560]"
                    style={{ borderWidth: '0.5px', padding: '10px' }}
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={finishStep2}
                    className="flex-[2] rounded-[10px] py-2.5 text-sm font-semibold text-[#1a1510]"
                    style={{ background: '#EF9F27', padding: '10px' }}
                  >
                    Find my lesson →
                  </button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="w-1/3 min-w-[33.333%] shrink-0 px-0.5">
                <div
                  className="rounded-xl border border-[#EF9F27] bg-[#221f1a] p-4"
                  style={{ borderWidth: '0.5px', borderRadius: 12 }}
                >
                  <p
                    className="mb-3 text-[10px] font-medium uppercase tracking-[0.1em] text-[#EF9F27]"
                    style={{ letterSpacing: '0.1em' }}
                  >
                    Recommended for you
                  </p>

                  {fetchLoading && (
                    <div className="text-center">
                      <div className="flex gap-3">
                        <div
                          className="h-20 w-[120px] shrink-0 animate-pulse rounded-lg bg-[#2e2b25]"
                          style={{ width: 120, height: 80, borderRadius: 8 }}
                        />
                        <div className="min-w-0 flex-1 space-y-2 pt-1 text-left">
                          <div className="h-4 animate-pulse rounded bg-[#2e2b25]" />
                          <div className="h-3 w-2/3 animate-pulse rounded bg-[#2e2b25]" />
                          <div className="h-3 w-1/2 animate-pulse rounded bg-[#2e2b25]" />
                        </div>
                      </div>
                      <p className="mt-4 text-center text-xs text-[#6b6560]">
                        Finding your lesson...
                      </p>
                    </div>
                  )}

                  {!fetchLoading && fetchError && !recommended && (
                    <div className="py-4 text-center">
                      <p className="text-sm text-[#6b6560]">
                        Couldn&apos;t find a lesson right now
                      </p>
                      <button
                        type="button"
                        onClick={() => runFetch({ isRetry: false })}
                        className="mt-3 text-sm text-[#EF9F27] underline"
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  {!fetchLoading && recommended && (
                    <>
                      {fetchError && (
                        <p className="mb-2 text-center text-xs text-amber-500/90">
                          Couldn&apos;t find another match — try again.
                        </p>
                      )}
                      <div className="flex gap-3">
                        <a
                          href={recommended.watchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0"
                        >
                          <img
                            src={recommended.thumbnail}
                            alt=""
                            className="object-cover"
                            style={{
                              width: 120,
                              height: 80,
                              borderRadius: 8,
                            }}
                          />
                        </a>
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-2 text-sm font-medium text-white">
                            {recommended.title}
                          </h3>
                          <p className="mt-1 text-xs text-[#6b6560]">
                            {recommended.channel}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#6b6560]">
                            <span
                              className={`rounded border px-2 py-0.5 text-xs ${
                                DIFF_STYLES[recommended.difficultyLabel] ||
                                DIFF_STYLES.Intermediate
                              }`}
                            >
                              {recommended.difficultyLabel}
                            </span>
                            <span>{recommended.views} views</span>
                          </div>
                        </div>
                      </div>
                      {(recommended.chordsUsed || []).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {recommended.chordsUsed.slice(0, 8).map((c) => (
                            <span
                              key={c}
                              className="rounded bg-brand-amber/20 px-1.5 py-0.5 text-xs text-brand-amber"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                      {recommended.tags?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 text-xs text-[#6b6560]">
                          {recommended.tags.map((t) => (
                            <span key={t}>{t}</span>
                          ))}
                        </div>
                      )}
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          disabled={tryAnotherLoading || creating}
                          onClick={handleTryAnother}
                          className="flex flex-1 items-center justify-center gap-2 rounded-[10px] border border-[#EF9F27] py-2.5 text-sm font-medium text-[#EF9F27] disabled:opacity-50"
                          style={{ borderWidth: '0.5px' }}
                        >
                          {tryAnotherLoading ? (
                            <span
                              className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#EF9F27] border-t-transparent"
                              aria-hidden
                            />
                          ) : null}
                          <span>↺ Try another</span>
                        </button>
                        <button
                          type="button"
                          disabled={creating || tryAnotherLoading}
                          onClick={handleCreateLesson}
                          className="flex flex-1 rounded-[10px] bg-[#EF9F27] py-2.5 text-sm font-semibold text-[#1a1510] disabled:opacity-60"
                        >
                          {creating ? 'Fetching lyrics…' : '+ Create Lesson'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
