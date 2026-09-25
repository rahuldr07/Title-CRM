export function Skeleton({
  width = '100%',
  height = 14,
  radius = 4,
  style,
}: {
  width?: number | string
  height?: number | string
  radius?: number
  style?: React.CSSProperties
}) {
  return (
    <span
      className="skel"
      aria-hidden="true"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  )
}

export function SkeletonValue({ width = 72 }: { width?: number }) {
  return <Skeleton width={width} height={26} radius={5} style={{ verticalAlign: '-4px' }} />
}

export function SkeletonRows({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="skel-rows" role="status" aria-live="polite" aria-label="Loading">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="skel-row">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} width={c === 0 ? '60%' : '40%'} />
          ))}
        </div>
      ))}
    </div>
  )
}
