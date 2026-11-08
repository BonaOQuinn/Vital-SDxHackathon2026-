// Inline SVG icons. Decorative unless a title is passed by the caller.
type IconProps = { size?: number; className?: string };

export function MicIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className} aria-hidden="true">
      <rect x="7.5" y="2.5" width="7" height="11" rx="3.5" />
      <path d="M4 10.5a7 7 0 0 0 14 0M11 17.5v2.5" />
    </svg>
  );
}

export function ProfileIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="11" r="2.5" />
      <path d="M5.5 17c.6-1.8 2-2.8 3.5-2.8s2.9 1 3.5 2.8M15 10h3M15 14h3" />
    </svg>
  );
}

export function DocIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}

export function AlertIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7v6M12 16.5v.3" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12.5 4 6.5 10l6 6" />
    </svg>
  );
}
