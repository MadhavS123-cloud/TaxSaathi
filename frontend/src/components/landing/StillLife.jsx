import { motion } from 'framer-motion';
import { ease, useCalm } from './motion';

export default function StillLife() {
  const calm = useCalm();

  return (
    <motion.div
      className="relative mx-auto w-full max-w-[520px]"
      initial={calm ? false : { opacity: 0, y: 36 }}
      animate={{ opacity: 1, y: 0 }}
      transition={calm ? { duration: 0 } : { duration: 1.15, delay: 0.45, ease }}
      aria-hidden="true"
    >
      <div
        className="pointer-events-none absolute -inset-8 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.14), transparent 68%)' }}
      />
      <svg viewBox="0 0 520 640" className="relative w-full h-auto">
        <defs>
          <linearGradient id="drape" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3A3128" />
            <stop offset="55%" stopColor="#1C1814" />
            <stop offset="100%" stopColor="#12100E" />
          </linearGradient>
          <linearGradient id="leather" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4A3428" />
            <stop offset="100%" stopColor="#2A1C16" />
          </linearGradient>
          <linearGradient id="page" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F6F1E8" />
            <stop offset="100%" stopColor="#E6D9C6" />
          </linearGradient>
        </defs>

        <path
          d="M48 150c40-70 130-40 150 30 18 62-30 90-8 150 24 66-20 120 24 168"
          fill="none"
          stroke="#C9A96E"
          strokeOpacity="0.18"
          strokeWidth="1"
        />
        <path
          d="M36 168c62-18 78 74 128 78 54 4 42-78 96-70 48 7 40 92 18 140-28 62-8 130 36 168-70 18-150-10-168-74-16-56 34-78 18-132-18-62-78-46-128-40-28 4-42-18-0-70z"
          fill="url(#drape)"
          stroke="#C9A96E"
          strokeOpacity="0.28"
        />
        <path
          d="M92 210c28 8 46 36 40 62M150 198c22 20 24 58 8 86"
          fill="none"
          stroke="#F3EDE2"
          strokeOpacity="0.12"
        />

        <rect x="318" y="78" width="18" height="392" fill="#1A1816" />
        <rect x="346" y="78" width="18" height="392" fill="#141210" />
        <rect x="374" y="78" width="18" height="392" fill="#1A1816" />
        <rect x="300" y="56" width="110" height="22" fill="#221E1A" stroke="#C9A96E" strokeOpacity="0.35" />
        <rect x="292" y="470" width="126" height="26" fill="#221E1A" stroke="#C9A96E" strokeOpacity="0.35" />
        <line x1="355" y1="92" x2="355" y2="458" stroke="#C9A96E" strokeOpacity="0.45" />

        <g transform="translate(78 468)">
          <rect width="228" height="34" fill="url(#leather)" stroke="#C9A96E" strokeOpacity="0.55" />
          <rect width="6" height="34" fill="#C9A96E" fillOpacity="0.8" />
          <text x="20" y="22" fill="#F3EDE2" fontFamily="Georgia, serif" fontSize="13">Income Tax Act</text>
          <rect y="42" width="248" height="34" fill="#321F18" stroke="#C9A96E" strokeOpacity="0.4" />
          <rect y="42" width="6" height="34" fill="#C9A96E" fillOpacity="0.55" />
          <text x="20" y="64" fill="#E7D3B0" fontFamily="Georgia, serif" fontSize="13">CGST Act</text>
          <rect y="84" width="210" height="30" fill="#241814" stroke="#C9A96E" strokeOpacity="0.25" />
          <text x="20" y="104" fill="#C9A96E" fontFamily="Georgia, serif" fontSize="12">IGST Act</text>
        </g>

        <g transform="translate(236 236) rotate(-8)">
          <rect width="168" height="210" fill="url(#page)" />
          <rect x="0" y="0" width="168" height="8" fill="#C9A96E" />
          <text x="16" y="36" fill="#3A3128" fontFamily="Georgia, serif" fontSize="13">Tax invoice</text>
          <line x1="16" y1="52" x2="120" y2="52" stroke="#C9A96E" strokeOpacity="0.7" />
          <line x1="16" y1="78" x2="146" y2="78" stroke="#3A3128" strokeOpacity="0.25" />
          <line x1="16" y1="96" x2="132" y2="96" stroke="#3A3128" strokeOpacity="0.2" />
          <line x1="16" y1="114" x2="140" y2="114" stroke="#3A3128" strokeOpacity="0.2" />
          <line x1="16" y1="132" x2="100" y2="132" stroke="#3A3128" strokeOpacity="0.2" />
          <text x="16" y="176" fill="#3A3128" fontFamily="Georgia, serif" fontSize="12">For review</text>
        </g>
      </svg>
    </motion.div>
  );
}
