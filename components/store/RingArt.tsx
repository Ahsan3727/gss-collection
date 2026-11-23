'use client';

import { STONES } from '@/lib/constants';

interface RingArtProps {
  setting?: string;
  stone?: string;
  view?: 'front' | 'detail' | 'scale';
  className?: string;
}

export default function RingArt({
  setting = 'solitaire',
  stone = 'garnet',
  view = 'front',
  className = '',
}: RingArtProps) {
  const stoneData = STONES[stone] || STONES.garnet;
  const stoneColor = stoneData.color;

  return (
    <div className={`relative w-full aspect-square bg-mist flex items-center justify-center overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full object-contain"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id={`glow-${stone}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={stoneColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={stoneColor} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="silver-band" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FBFCFD" />
            <stop offset="30%" stopColor="#D4D9DF" />
            <stop offset="60%" stopColor="#9AA3AF" />
            <stop offset="100%" stopColor="#7A8490" />
          </linearGradient>
        </defs>

        {/* Ambient background glow */}
        <circle cx="200" cy="200" r="160" fill={`url(#glow-${stone})`} />

        {/* Silver ring band */}
        <ellipse cx="200" cy="336" rx="78" ry="7" fill="#0B0B0B" fillOpacity="0.12" />
        <circle cx="200" cy="236" r="98" fill="none" stroke="#5E6874" strokeWidth="15" />
        <circle cx="200" cy="236" r="98" fill="none" stroke="url(#silver-band)" strokeWidth="13" />

        {/* Setting crown mount */}
        <path
          d="M 180 148 L 220 148 L 214 175 L 186 175 Z"
          fill="url(#silver-band)"
          stroke="#6C7683"
          strokeWidth="1.2"
        />

        {/* Center gemstone */}
        <ellipse cx="200" cy="140" rx="36" ry="34" fill={stoneColor} stroke="#444" strokeWidth="1" />
        <ellipse cx="192" cy="132" rx="14" ry="9" fill="#ffffff" fillOpacity="0.45" />

        {/* Prongs */}
        <circle cx="170" cy="122" r="3.5" fill="url(#silver-band)" stroke="#555" strokeWidth="0.8" />
        <circle cx="230" cy="122" r="3.5" fill="url(#silver-band)" stroke="#555" strokeWidth="0.8" />
        <circle cx="170" cy="158" r="3.5" fill="url(#silver-band)" stroke="#555" strokeWidth="0.8" />
        <circle cx="230" cy="158" r="3.5" fill="url(#silver-band)" stroke="#555" strokeWidth="0.8" />
      </svg>
    </div>
  );
}
