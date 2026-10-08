export interface AreaSeries {
  name: string
  values: number[]
  color: string
  /** Soft gradient under the line. */
  fill?: boolean
  dashed?: boolean
}

const W = 400
const H = 170
const TOP = 14
const BOTTOM = 150

/**
 * Line + area chart in hand-written SVG, one point per label. Strokes use non-scaling-stroke so the
 * SVG can stretch to its card without thickening the lines. A visually hidden table has the numbers.
 */
export default function AreaChart({
  labels,
  series,
  caption,
  format,
  markLast = true,
}: {
  labels: string[]
  series: AreaSeries[]
  /** Names the hidden table, e.g. "Money by event month (LKR)". */
  caption: string
  format: (n: number) => string
  /** Dot on the highest point of the last series. */
  markLast?: boolean
}) {
  const n = labels.length
  const max = Math.max(1, ...series.flatMap((s) => s.values)) * 1.1
  const pad = W / (n * 2) // points sit at column centres so the HTML labels line up
  const x = (i: number) => (n === 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (n - 1))
  const y = (v: number) => BOTTOM - (v / max) * (BOTTOM - TOP)
  const line = (vals: number[]) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const gid = `area-${caption.replace(/\W+/g, '')}`

  const last = series[series.length - 1]
  const peak = last ? last.values.reduce((best, v, i) => (v > last.values[best] ? i : best), 0) : 0
  const showMark = markLast && last && last.values[peak] > 0

  return (
    <figure className="m-0">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[170px] w-full" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#9D14FF" stopOpacity=".55" />
              <stop offset="1" stopColor="#9D14FF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g stroke="rgba(255,255,255,.06)" strokeWidth="1" vectorEffect="non-scaling-stroke">
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1="0" x2={W} y1={TOP + f * (BOTTOM - TOP)} y2={TOP + f * (BOTTOM - TOP)} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
          {series.map((s) => (
            <g key={s.name}>
              {s.fill && <path d={`${line(s.values)} L${x(n - 1).toFixed(1)} ${BOTTOM} L${x(0).toFixed(1)} ${BOTTOM}Z`} fill={`url(#${gid})`} />}
              <path
                d={line(s.values)}
                fill="none"
                stroke={s.color}
                strokeWidth={s.dashed ? 2 : 2.5}
                strokeDasharray={s.dashed ? '4 4' : undefined}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </svg>
        {showMark && (
          <span
            aria-hidden="true"
            className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
            style={{ left: `${(x(peak) / W) * 100}%`, top: `${(y(last.values[peak]) / H) * 100}%` }}
          />
        )}
      </div>
      <div aria-hidden="true" className="mt-1 grid font-grotesk text-[11.5px] text-[var(--ink-50)]" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {labels.map((l) => (
          <span key={l} className="text-center">
            {l}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            {series.map((s) => (
              <th key={s.name} scope="col">
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((l, i) => (
            <tr key={l}>
              <th scope="row">{l}</th>
              {series.map((s) => (
                <td key={s.name}>{format(s.values[i] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
