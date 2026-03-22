export default function ChordDiagram({ name, frets, fingers, baseFret = 1, barres = [], size = 'sm' }) {
  const isLg = size === 'lg';
  const isPalette = size === 'palette';
  const isMini = size === 'mini';
  const scale = isLg ? 1.5 : 1;

  const stringX = isLg ? [12, 24, 36, 48, 60, 72] : [8, 18, 28, 38, 48, 56];
  const width = isLg ? 96 : isMini ? 40 : isPalette ? 56 : 64;
  const height = isLg ? 138 : isMini ? 56 : isPalette ? 78 : 92;
  const nutY = 18 * scale;
  const fretY = [nutY, 26 * scale, 42 * scale, 58 * scale, 74 * scale];

  const fretPos = (fret) => {
    if (fret <= 0) return nutY;
    if (fret <= 4) return fretY[fret];
    return fretY[4] + (fret - 4) * 16 * scale;
  };

  const f = frets || [];
  const fin = fingers || [];

  const viewW = isPalette || isMini ? 64 : width;
  const viewH = isPalette || isMini ? 92 : height;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${viewW} ${viewH}`}
      className="block shrink-0"
      aria-label={name ? `Chord diagram for ${name}` : 'Chord diagram'}
    >
      {/* Nut bar */}
      <rect
        x={stringX[0] - 2}
        y={nutY - 2}
        width={stringX[5] - stringX[0] + 4}
        height={4}
        fill="#cccccc"
        rx={1}
      />

      {/* Fret lines (4 horizontal) */}
      {[1, 2, 3, 4].map((i) => (
        <line
          key={`fret-${i}`}
          x1={stringX[0]}
          y1={fretY[i]}
          x2={stringX[5]}
          y2={fretY[i]}
          stroke="#555048"
          strokeWidth="0.8"
        />
      ))}

      {/* String lines (6 vertical) */}
      {stringX.map((x, i) => (
        <line
          key={`str-${i}`}
          x1={x}
          y1={nutY}
          x2={x}
          y2={viewH - 20}
          stroke="#555048"
          strokeWidth="0.8"
        />
      ))}

      {/* Barres first (under dots) - string 1 = high e = index 5, string 6 = low E = index 0 */}
      {(barres || []).map((b, bi) => {
        const fromIdx = Math.max(0, Math.min(5, 6 - (b.fromString || 1)));
        const toIdx = Math.max(0, Math.min(5, 6 - (b.toString || 6)));
        const left = Math.min(stringX[fromIdx], stringX[toIdx]);
        const right = Math.max(stringX[fromIdx], stringX[toIdx]);
        const y = fretPos(b.fret) - 4;
        return (
          <rect
            key={bi}
            x={left - 6}
            y={y}
            width={right - left + 12}
            height={8}
            rx={7}
            fill="#EF9F27"
          />
        );
      })}

      {/* Finger dots and markers */}
      {f.map((fretVal, i) => {
        const x = stringX[i];
        if (fretVal === -1) {
          return (
            <text key={`mute-${i}`} x={x} y={10} textAnchor="middle" fill="#888780" fontSize={11}>
              ×
            </text>
          );
        }
        if (fretVal === 0) {
          return (
            <circle
              key={`open-${i}`}
              cx={x}
              cy={10}
              r={4}
              fill="none"
              stroke="#cccccc"
              strokeWidth={1.5}
            />
          );
        }
        const y = fretPos(fretVal);
        const fingerNum = fin[i];
        const hasBarre = (barres || []).some(
          (b) =>
            b.fret === fretVal &&
            Math.min(6 - b.fromString, 6 - b.toString) <= i &&
            i <= Math.max(6 - b.fromString, 6 - b.toString)
        );
        if (hasBarre) {
          return (
            <text
              key={`barre-dot-${i}`}
              x={x}
              y={y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={9}
              fontWeight={700}
              fill="#2a2318"
            >
              {fingerNum}
            </text>
          );
        }
        return (
          <g key={`dot-${i}`}>
            <circle cx={x} cy={y} r={7} fill="#EF9F27" />
            {fingerNum ? (
              <text
                x={x}
                y={y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={9}
                fontWeight={700}
                fill="#2a2318"
              >
                {fingerNum}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* Base fret label */}
      {baseFret > 1 && (
        <text
          x={4}
          y={fretY[0] + 4}
          fontSize={10}
          fill="#888780"
          fontWeight={600}
        >
          {baseFret}fr
        </text>
      )}

      {/* Chord name (palette shows name in parent row) */}
      {!isPalette && !isMini ? (
        <text
          x={viewW / 2}
          y={viewH - 4}
          textAnchor="middle"
          fontSize={12}
          fontWeight={500}
          fill="#EF9F27"
        >
          {name || ''}
        </text>
      ) : null}
    </svg>
  );
}
