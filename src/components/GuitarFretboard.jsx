import { useRef, useState, useCallback } from 'react';

const NUM_FRETS = 5;

const STRINGS = [
  { note: 'e', displayNote: 'E4', frequency: 329.63, thickness: 1, color: '#e8e0c8' },
  { note: 'B', displayNote: 'B3', frequency: 246.94, thickness: 1.5, color: '#e8e0c8' },
  { note: 'G', displayNote: 'G3', frequency: 196.0, thickness: 2, color: '#e8e0c8' },
  { note: 'D', displayNote: 'D3', frequency: 146.83, thickness: 2.5, color: '#c8b87a' },
  { note: 'A', displayNote: 'A2', frequency: 110.0, thickness: 3, color: '#c8b87a' },
  { note: 'E', displayNote: 'E2', frequency: 82.41, thickness: 3.5, color: '#c8b87a' },
];

function getAudioContext(audioCtxRef) {
  if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtxRef.current.state === 'suspended') {
    audioCtxRef.current.resume();
  }
  return audioCtxRef.current;
}

function playString(frequency, audioCtxRef) {
  const ctx = getAudioContext(audioCtxRef);
  const t0 = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(frequency, t0);

  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(frequency, t0);
  osc2.detune.setValueAtTime(4, t0);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, t0);
  gainNode.gain.linearRampToValueAtTime(0.4, t0 + 0.005);
  gainNode.gain.exponentialRampToValueAtTime(0.001, t0 + 2.0);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, t0);
  filter.frequency.exponentialRampToValueAtTime(800, t0 + 1.0);

  osc.connect(filter);
  osc2.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(t0);
  osc2.start(t0);
  osc.stop(t0 + 2.0);
  osc2.stop(t0 + 2.0);
}

export default function GuitarFretboard() {
  const audioCtxRef = useRef(null);
  const [pluckingString, setPluckingString] = useState(null);
  const [floatingLabel, setFloatingLabel] = useState(null);

  const handleStringClick = useCallback((index) => {
    try {
      playString(STRINGS[index].frequency, audioCtxRef);
    } catch {
      /* visual feedback still runs */
    }
    setPluckingString(index);
    setFloatingLabel({ stringIndex: index, note: STRINGS[index].displayNote });
    window.setTimeout(() => setPluckingString(null), 600);
    window.setTimeout(() => setFloatingLabel(null), 800);
  }, []);

  return (
    <div className="w-full">
      <style>{`
        @keyframes guitar-fretboard-pluck {
          0% { transform: translateY(0); }
          20% { transform: translateY(-3px); }
          40% { transform: translateY(2px); }
          60% { transform: translateY(-1px); }
          100% { transform: translateY(0); }
        }
        @keyframes guitar-fretboard-label {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-18px); }
        }
        .guitar-fretboard-pluck {
          animation: guitar-fretboard-pluck 600ms ease-out;
        }
        .guitar-fretboard-label {
          animation: guitar-fretboard-label 800ms ease-out forwards;
        }
      `}</style>

      <div
        className="overflow-hidden rounded-xl border border-[#3d2e18]"
        style={{ background: '#2a1f0e' }}
      >
        <div className="flex h-[160px]">
          {/* Open string labels */}
          <div
            className="flex w-8 shrink-0 flex-col justify-evenly py-1"
            style={{ background: '#2a1f0e' }}
            aria-hidden
          >
            {STRINGS.map((s) => (
              <div
                key={s.note + s.displayNote}
                className="flex min-h-[24px] items-center justify-center font-mono text-[11px] font-semibold text-[#EF9F27]"
              >
                {s.note}
              </div>
            ))}
          </div>

          {/* Nut */}
          <div
            className="shrink-0 self-stretch bg-[#e8d5a3]"
            style={{ width: 6 }}
            aria-hidden
          />

          {/* Fretboard */}
          <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
            {/* Alternating fret cells */}
            <div className="absolute inset-0 flex">
              {Array.from({ length: NUM_FRETS }, (_, i) => (
                <div
                  key={i}
                  className="h-full flex-1"
                  style={{ background: i % 2 === 0 ? '#2a1f0e' : '#2e2210' }}
                />
              ))}
            </div>

            {/* Fret wires */}
            <div className="pointer-events-none absolute inset-0 z-[5]">
              {[1, 2, 3, 4, 5].map((fret) => (
                <div
                  key={fret}
                  className="absolute top-0 bottom-0 bg-[#8a8070]"
                  style={{
                    width: 2,
                    left: `${(fret / NUM_FRETS) * 100}%`,
                    transform: 'translateX(-50%)',
                  }}
                />
              ))}
            </div>

            {/* Inlay dots — frets 3 & 5, between G and D (strings 3 & 4 from top) */}
            {/* Between strings 3 & 4 (G–D): vertical midpoint of fretboard */}
            <div
              className="pointer-events-none absolute z-[8] rounded-full bg-[#4a3820]"
              style={{
                left: `${((2 + 0.5) / NUM_FRETS) * 100}%`,
                top: '50%',
                width: 8,
                height: 8,
                transform: 'translate(-50%, -50%)',
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute z-[8] rounded-full bg-[#4a3820]"
              style={{
                left: `${((4 + 0.5) / NUM_FRETS) * 100}%`,
                top: '50%',
                width: 8,
                height: 8,
                transform: 'translate(-50%, -50%)',
              }}
              aria-hidden
            />

            {/* Strings + hit areas */}
            <div className="relative z-10 flex h-full flex-col justify-evenly py-0.5">
              {STRINGS.map((s, idx) => {
                const plucking = pluckingString === idx;
                const showLabel =
                  floatingLabel?.stringIndex === idx && floatingLabel?.note;

                return (
                  <div key={s.displayNote} className="relative flex min-h-[24px] flex-1 items-center">
                    {showLabel && (
                      <span
                        className="guitar-fretboard-label absolute left-1 z-20 rounded-[20px] px-2 py-0.5 text-[11px] font-bold text-[#1a1510]"
                        style={{ background: '#EF9F27', top: -2 }}
                      >
                        {floatingLabel.note}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStringClick(idx)}
                      aria-label={`Play open ${s.displayNote} string`}
                      className="flex h-full min-h-[24px] w-full items-center bg-transparent px-0"
                    >
                      <div
                        className={`w-full rounded-full ${plucking ? 'guitar-fretboard-pluck' : ''}`}
                        style={{
                          height: Math.max(s.thickness, 1),
                          backgroundColor: plucking ? '#EF9F27' : s.color,
                          boxShadow:
                            s.thickness >= 2
                              ? '0 1px 0 rgba(0,0,0,0.25)'
                              : undefined,
                        }}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Fret numbers */}
        <div
          className="flex border-t border-[#1f1810] px-0 py-1.5"
          style={{ background: '#2a1f0e' }}
        >
          <div className="w-8 shrink-0" aria-hidden />
          <div className="w-[6px] shrink-0" aria-hidden />
          <div className="flex min-w-0 flex-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="flex-1 text-center text-[10px] text-[#6b6560]"
              >
                {n}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
