/**
 * Decorative motherboard traces behind the page content.
 *
 * Pure SVG + CSS — no client JS. Each trace declares pathLength="100" so the
 * dash animation in globals.css works in percent-of-path units regardless of
 * the path's real geometry, which keeps every pulse travelling at a consistent
 * visual speed. Routing follows real PCB convention: orthogonal runs joined by
 * 45° bends, terminating in a via pad.
 */

type Trace = {
  /** Path data. Ends where its via pad sits. */
  d: string
  /** Via pad coordinates — the endpoint of `d`. */
  pad: [number, number]
  accent?: boolean
  dur: number
  delay: number
}

const TRACES: Trace[] = [
  // Entering from the left edge.
  { d: 'M0 118 H196 L268 190 H430', pad: [430, 190], dur: 7, delay: 0 },
  {
    d: 'M0 262 H142 L206 326 H392',
    pad: [392, 326],
    accent: true,
    dur: 9,
    delay: 1.4,
  },
  { d: 'M0 430 H228 L306 352 H524', pad: [524, 352], dur: 8, delay: 3.1 },
  {
    d: 'M0 566 H164 L242 644 H408',
    pad: [408, 644],
    accent: true,
    dur: 10,
    delay: 0.6,
  },
  { d: 'M0 712 H302 L366 776 H556', pad: [556, 776], dur: 8.5, delay: 2.2 },

  // Entering from the right edge.
  { d: 'M1440 156 H1244 L1166 234 H962', pad: [962, 234], dur: 9.5, delay: 0.9 },
  {
    d: 'M1440 322 H1298 L1224 248 H1010',
    pad: [1010, 248],
    accent: true,
    dur: 7.5,
    delay: 2.8,
  },
  { d: 'M1440 486 H1262 L1184 564 H986', pad: [986, 564], dur: 8, delay: 1.7 },
  {
    d: 'M1440 648 H1206 L1128 570 H904',
    pad: [904, 570],
    accent: true,
    dur: 11,
    delay: 3.6,
  },
  { d: 'M1440 782 H1304 L1240 718 H1046', pad: [1046, 718], dur: 9, delay: 0.3 },

  // Vertical runs off the top and bottom edges.
  { d: 'M312 0 V76 L376 140 V306', pad: [376, 306], dur: 8.5, delay: 4.2 },
  {
    d: 'M1092 900 V824 L1032 764 V598',
    pad: [1032, 598],
    accent: true,
    dur: 9.5,
    delay: 1.1,
  },
  { d: 'M690 0 V54 L742 106 V196', pad: [742, 196], dur: 7, delay: 5 },
  { d: 'M624 900 V842 L570 788 V690', pad: [570, 690], dur: 8, delay: 2.5 },
]

export function CircuitBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      // Fade the traces out toward the middle so headline text stays legible,
      // and toward the edges so they don't end in a hard cut.
      style={{
        maskImage:
          'radial-gradient(ellipse 70% 55% at 50% 45%, transparent 20%, black 85%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 70% 55% at 50% 45%, transparent 20%, black 85%)',
      }}
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <filter id="trace-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Dim base traces — the copper, always visible. */}
        <g strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {TRACES.map((trace, i) => (
            <path
              key={`base-${i}`}
              d={trace.d}
              stroke={
                trace.accent ? 'var(--color-arduino)' : 'var(--color-violet)'
              }
              strokeOpacity="0.18"
            />
          ))}
        </g>

        {/* Signal pulses travelling along each trace. */}
        <g
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#trace-glow)"
        >
          {TRACES.map((trace, i) => (
            <path
              key={`pulse-${i}`}
              className="trace-pulse"
              d={trace.d}
              pathLength="100"
              stroke={
                trace.accent
                  ? 'var(--color-arduino-bright)'
                  : 'var(--color-violet-bright)'
              }
              style={
                {
                  '--dur': `${trace.dur}s`,
                  '--delay': `${trace.delay}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </g>

        {/* Via pads where the traces terminate. */}
        <g filter="url(#trace-glow)">
          {TRACES.map((trace, i) => (
            <circle
              key={`pad-${i}`}
              className="pad-glow"
              cx={trace.pad[0]}
              cy={trace.pad[1]}
              r="3"
              fill={
                trace.accent
                  ? 'var(--color-arduino-bright)'
                  : 'var(--color-violet-bright)'
              }
              style={
                {
                  '--dur': `${trace.dur / 2}s`,
                  '--delay': `${trace.delay}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
