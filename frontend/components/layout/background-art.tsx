// Decorative background for every page. It is purely visual: hidden from screen readers,
// ignores pointer input, and uses the palette variables so dark mode gets its own colours.

const SPARKLES: { x: number; y: number; s: number }[] = [
  { x: 1180, y: 210, s: 26 },
  { x: 260, y: 640, s: 18 },
  { x: 1010, y: 560, s: 14 },
  { x: 640, y: 120, s: 12 },
];

const RINGS: { x: number; y: number; r: number }[] = [
  { x: 1320, y: 420, r: 46 },
  { x: 90, y: 360, r: 30 },
  { x: 760, y: 780, r: 58 },
];

// Four-pointed star, drawn with quadratic curves so the points stay sharp.
function sparklePath(x: number, y: number, s: number) {
  return `M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z`;
}

export function BackgroundArt() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg
        className="size-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="art-lavender">
            <stop offset="0" style={{ stopColor: "var(--lavender)" }} />
            <stop offset="1" style={{ stopColor: "var(--lavender)", stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="art-sky">
            <stop offset="0" style={{ stopColor: "var(--sky)" }} />
            <stop offset="1" style={{ stopColor: "var(--sky)", stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="art-mint">
            <stop offset="0" style={{ stopColor: "var(--mint)" }} />
            <stop offset="1" style={{ stopColor: "var(--mint)", stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="art-blush">
            <stop offset="0" style={{ stopColor: "var(--blush)" }} />
            <stop offset="1" style={{ stopColor: "var(--blush)", stopOpacity: 0 }} />
          </radialGradient>
          <pattern id="art-dots" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.6" style={{ fill: "var(--navy)" }} opacity="0.14" />
          </pattern>
        </defs>

        {/* Soft colour blobs in the corners and along the edges */}
        <circle cx="160" cy="150" r="360" fill="url(#art-lavender)" opacity="0.9" />
        <circle cx="1300" cy="110" r="300" fill="url(#art-sky)" opacity="0.9" />
        <circle cx="1220" cy="800" r="380" fill="url(#art-mint)" opacity="0.8" />
        <circle cx="90" cy="860" r="280" fill="url(#art-blush)" opacity="0.7" />
        <circle cx="720" cy="420" r="420" fill="url(#art-sky)" opacity="0.35" />

        {/* Dotted texture */}
        <rect width="1440" height="900" fill="url(#art-dots)" />

        {/* Gentle waves at the bottom */}
        <path
          d="M0 660 C 240 580, 420 740, 680 670 S 1100 580, 1440 660 L1440 900 L0 900 Z"
          style={{ fill: "var(--mint)" }}
          opacity="0.55"
        />
        <path
          d="M0 730 C 300 670, 520 800, 800 740 S 1200 670, 1440 730 L1440 900 L0 900 Z"
          style={{ fill: "var(--lavender)" }}
          opacity="0.5"
        />
        <path
          d="M0 120 C 180 80, 360 170, 560 120 S 960 60, 1140 110"
          fill="none"
          style={{ stroke: "var(--navy)" }}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.08"
        />
        <path
          d="M300 880 C 480 820, 620 900, 820 850 S 1140 800, 1300 860"
          fill="none"
          style={{ stroke: "var(--navy)" }}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.08"
        />

        {/* Sparkles */}
        {SPARKLES.map((sp) => (
          <path
            key={`${sp.x}-${sp.y}`}
            d={sparklePath(sp.x, sp.y, sp.s)}
            style={{ fill: "var(--navy)" }}
            opacity="0.22"
          />
        ))}

        {/* Rings */}
        {RINGS.map((ring) => (
          <circle
            key={`${ring.x}-${ring.y}`}
            cx={ring.x}
            cy={ring.y}
            r={ring.r}
            fill="none"
            style={{ stroke: "var(--navy)" }}
            strokeWidth="2"
            opacity="0.12"
          />
        ))}
      </svg>
    </div>
  );
}
