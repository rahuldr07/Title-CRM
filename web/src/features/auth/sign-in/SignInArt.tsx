import type { ReactNode } from 'react'

function Icon({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const SearchIcon = () => (
  <Icon size={26}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m20 20-4.8-4.8" />
  </Icon>
)

export const ReportIcon = () => (
  <Icon size={26}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h6M9 9h1" />
  </Icon>
)

export const BoltIcon = () => (
  <Icon size={26}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
  </Icon>
)

export const ShieldIcon = () => (
  <Icon size={26}>
    <path d="M12 3 5 6v5c0 4.4 3 8.3 7 9.5 4-1.2 7-5.1 7-9.5V6z" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
)

export const MailIcon = () => (
  <Icon>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </Icon>
)

export const LockIcon = ({ size = 22 }: { size?: number }) => (
  <Icon size={size}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    <path d="M12 14.5v2" />
  </Icon>
)

export const EyeIcon = ({ off }: { off: boolean }) => (
  <Icon>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
    {off ? <path d="m4 4 16 16" /> : null}
  </Icon>
)

export const ArrowIcon = () => (
  <Icon size={20}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
)

export const MicrosoftMark = () => (
  <svg width={21} height={21} viewBox="0 0 21 21" aria-hidden="true">
    <rect x="0" y="0" width="10" height="10" fill="#f25022" />
    <rect x="11" y="0" width="10" height="10" fill="#7fba00" />
    <rect x="0" y="11" width="10" height="10" fill="#00a4ef" />
    <rect x="11" y="11" width="10" height="10" fill="#ffb900" />
  </svg>
)

const GROUND = 330

function House({ x, w, h, roof }: { x: number; w: number; h: number; roof: number }) {
  const top = GROUND - h
  const eave = w * 0.07
  const cols = w > 150 ? 3 : 2
  const ww = w * 0.13
  const gap = (w - cols * ww) / (cols + 1)
  return (
    <g>
      <rect x={x} y={top} width={w} height={h} fill="var(--si-wall)" />
      <rect x={x} y={top} width={w} height={h * 0.08} fill="var(--si-shade)" />
      <polygon
        points={`${x - eave},${top + 2} ${x + w / 2},${top - roof} ${x + w + eave},${top + 2}`}
        fill="var(--si-roof)"
      />
      <polygon
        points={`${x + w / 2},${top - roof} ${x + w + eave},${top + 2} ${x + w / 2 + 6},${top + 2}`}
        fill="var(--si-roof2)"
      />
      {Array.from({ length: cols }, (_, i) =>
        [0.22, 0.55].map((r) => (
          <rect
            key={`${i}-${r}`}
            x={x + gap + i * (ww + gap)}
            y={top + h * r}
            width={ww}
            height={h * 0.2}
            rx={1.5}
            fill="var(--si-glass)"
          />
        )),
      )}
      <rect x={x + w / 2 - w * 0.06} y={GROUND - h * 0.3} width={w * 0.12} height={h * 0.3} fill="var(--si-door)" />
    </g>
  )
}

function Tree({ x, r }: { x: number; r: number }) {
  return (
    <g fill="var(--si-tree)">
      <circle cx={x} cy={GROUND - r * 1.6} r={r} />
      <circle cx={x - r * 0.7} cy={GROUND - r * 1.1} r={r * 0.8} />
      <circle cx={x + r * 0.7} cy={GROUND - r * 1.1} r={r * 0.8} />
    </g>
  )
}

export function Street() {
  return (
    <svg className="si-street" viewBox="0 0 800 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <Tree x={250} r={38} />
      <Tree x={455} r={30} />
      <Tree x={640} r={24} />
      <Tree x={770} r={20} />
      <House x={40} w={230} h={140} roof={78} />
      <House x={300} w={160} h={104} roof={58} />
      <House x={490} w={118} h={80} roof={44} />
      <House x={632} w={92} h={62} roof={34} />
      <House x={742} w={70} h={48} roof={26} />
      <rect x="0" y={GROUND} width="800" height={360 - GROUND} fill="var(--si-lawn)" />
      <rect x="0" y={GROUND} width="800" height="5" fill="var(--si-kerb)" />
    </svg>
  )
}
