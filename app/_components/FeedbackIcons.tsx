/**
 * FeedbackIcons — shared branded feedback icons for all practice modes.
 *
 * CorrectIcon: bright green circle + bold checkmark + gold sparkles  → energetic, celebratory
 * WrongIcon:   warm amber circle + soft rounded X + "try again" arc  → encouraging, not punishing
 */

export function CorrectIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ display: "inline-block", flexShrink: 0 }}
    >
      {/* Main filled circle */}
      <circle cx="12" cy="12" r="9" fill="#22c55e" />

      {/* Bold checkmark */}
      <path
        d="M8 12.8 L11 15.8 L16.5 9"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Sparkle — top right, gold */}
      <circle cx="20.5" cy="3.5" r="1.6" fill="#fbbf24" />

      {/* Sparkle — left, soft green */}
      <circle cx="2.5" cy="9" r="1.1" fill="#86efac" />

      {/* Sparkle — bottom right, tiny gold */}
      <circle cx="21" cy="18.5" r="1" fill="#fde68a" />
    </svg>
  );
}

export function WrongIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ display: "inline-block", flexShrink: 0 }}
    >
      {/* Soft amber circle */}
      <circle cx="12" cy="12" r="9" fill="#fff7ed" />
      <circle cx="12" cy="12" r="9" stroke="#f97316" strokeWidth="1.6" />

      {/* Rounded X */}
      <path
        d="M9.2 9.2 L14.8 14.8"
        stroke="#f97316"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M14.8 9.2 L9.2 14.8"
        stroke="#f97316"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* "Try again" arc — subtle curve at the bottom of the circle */}
      <path
        d="M8.5 18 Q12 20.5 15.5 18"
        stroke="#f97316"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      {/* Arrowhead on the try-again arc */}
      <path
        d="M14.6 17.2 L15.5 18 L14.8 19"
        stroke="#f97316"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.55"
      />
    </svg>
  );
}
