export interface DonutSegment {
  label: string
  value: number
  color: string
}

const R = 15.9155 // circumference = 100, so a segment's value share is its dash length

/**
 * Ring chart in hand-written SVG. The picture is hidden from screen readers; a visually hidden
 * table carries the same numbers.
 */
export default function Donut({
  segments,
  centerValue,
  centerLabel,
  caption,
  size = 170,
}: {
  segments: DonutSegment[]
  centerValue: string
  centerLabel: string
  /** Names the hidden table, e.g. "Inquiries by status". */
  caption: string
  size?: number
}) {
  const total = segments.reduce((n, s) => n + s.value, 0)
  let offset = 0
  return (
    <figure className="relative m-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 42 42" width={size} height={size} aria-hidden="true" focusable="false" className="block -rotate-90">
        <circle cx="21" cy="21" r={R} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5" />
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const len = (s.value / total) * 100
              const el = (
                <circle
                  key={s.label}
                  cx="21"
                  cy="21"
                  r={R}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="5"
                  strokeDasharray={`${len} ${100 - len}`}
                  strokeDashoffset={-offset}
                />
              )
              offset += len
              return el
            })}
      </svg>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display text-[34px] leading-none text-ink">{centerValue}</div>
          <div className="mt-0.5 font-grotesk text-[11px] text-[var(--ink-50)]">{centerLabel}</div>
        </div>
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Status</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          {segments.map((s) => (
            <tr key={s.label}>
              <th scope="row">{s.label}</th>
              <td>{s.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
