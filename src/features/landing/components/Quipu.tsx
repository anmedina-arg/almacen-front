// Quipu: cuerda principal con cordones colgantes y nudos. Dibujado a mano
// (valores fijos), usado como divisor entre secciones.
const CORDS = [
  { x: 40, len: 38, knots: [14, 26] },
  { x: 92, len: 62, knots: [12, 28, 46] },
  { x: 150, len: 30, knots: [16] },
  { x: 210, len: 70, knots: [10, 24, 38, 56] },
  { x: 262, len: 44, knots: [14, 32] },
  { x: 330, len: 58, knots: [12, 30, 48] },
  { x: 384, len: 26, knots: [13] },
  { x: 446, len: 66, knots: [11, 25, 41, 55] },
  { x: 500, len: 40, knots: [15, 30] },
  { x: 566, len: 54, knots: [12, 27, 44] },
  { x: 620, len: 32, knots: [16] },
  { x: 684, len: 68, knots: [10, 23, 37, 55] },
  { x: 740, len: 46, knots: [14, 33] },
  { x: 806, len: 60, knots: [12, 29, 47] },
  { x: 862, len: 28, knots: [14] },
  { x: 924, len: 64, knots: [11, 26, 42, 54] },
  { x: 980, len: 42, knots: [15, 31] },
  { x: 1044, len: 56, knots: [12, 28, 45] },
  { x: 1100, len: 34, knots: [16] },
  { x: 1156, len: 52, knots: [13, 30, 44] },
];

const KNOT_COLORS = ['var(--bone)', 'var(--bone)', 'var(--bone)', 'var(--mustard)'];

export function Quipu() {
  return (
    <svg
      className="ck-quipu"
      viewBox="0 0 1200 96"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M0 14 Q 300 24 600 14 T 1200 14"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {CORDS.map((cord, ci) => (
        <g key={cord.x}>
          <line
            x1={cord.x}
            x2={cord.x}
            y1="16"
            y2={16 + cord.len}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {cord.knots.map((k, ki) => (
            <ellipse
              key={k}
              cx={cord.x}
              cy={16 + k}
              rx="7"
              ry="5.5"
              fill={KNOT_COLORS[(ci + ki) % KNOT_COLORS.length]}
              stroke="var(--navy)"
              strokeWidth="1.5"
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
