export function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 760"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="hero-amber-wash" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1240 40) rotate(137) scale(760 620)">
            <stop stopColor="#F0B90B" stopOpacity="0.34" />
            <stop offset="0.42" stopColor="#F0B90B" stopOpacity="0.12" />
            <stop offset="1" stopColor="#F0B90B" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hero-plane" x1="760" y1="80" x2="1210" y2="690" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F0B90B" stopOpacity="0.12" />
            <stop offset="0.58" stopColor="#F0B90B" stopOpacity="0.035" />
            <stop offset="1" stopColor="#F0B90B" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="hero-dot-fade" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1060 250) rotate(153) scale(800 580)">
            <stop stopColor="white" stopOpacity="0.92" />
            <stop offset="0.56" stopColor="white" stopOpacity="0.48" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <pattern id="hero-dot-pattern" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.75" fill="#EAECEF" fillOpacity="0.2" />
          </pattern>
          <mask id="hero-dot-mask">
            <rect width="1440" height="760" fill="url(#hero-dot-fade)" />
          </mask>
        </defs>

        <rect width="1440" height="760" fill="url(#hero-amber-wash)" />
        <path d="M735 -80H1530V565L1110 625L870 356Z" fill="url(#hero-plane)" />
        <rect
          x="360"
          width="1080"
          height="720"
          fill="url(#hero-dot-pattern)"
          mask="url(#hero-dot-mask)"
        />

        <g fill="#F0B90B" opacity="0.13" transform="translate(1160 198)">
          <rect width="116" height="10" rx="2" />
          <rect x="28" y="28" width="88" height="10" rx="2" />
          <rect x="58" y="56" width="58" height="10" rx="2" />
        </g>
      </svg>

      <div className="absolute inset-0 bg-[linear-gradient(90deg,#0b0e11_0%,rgba(11,14,17,0.96)_24%,rgba(11,14,17,0.42)_60%,rgba(11,14,17,0.08)_100%)] sm:bg-[linear-gradient(90deg,#0b0e11_0%,rgba(11,14,17,0.9)_30%,rgba(11,14,17,0.18)_68%,transparent_100%)]" />
    </div>
  );
}
