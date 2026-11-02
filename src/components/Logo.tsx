interface LogoMarkProps {
  size?: number
}

export function LogoMark({ size = 34 }: LogoMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <path
        d="M7.5 24.5l5.3-6.4 5 2.8L26.5 10"
        stroke="var(--accent)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26.5" cy="10" r="2.4" fill="var(--accent)" />
      <path d="M7.5 28.5h19" stroke="#2c3742" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <button type="button" className="brand" onClick={onClick} aria-label="Edgebook home">
      <span className="brand-mark">
        <LogoMark size={26} />
      </span>
      <span>
        <span className="brand-word">edgebook</span>
        <span className="brand-tag">P&amp;L journal</span>
      </span>
    </button>
  )
}
