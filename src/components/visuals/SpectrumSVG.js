import React from 'react';

/**
 * Visual Device: Spectrum (≡)
 * Abstract range visualization for the hero section — represents the
 * range between "blind" and "edge" that the product bridges.
 */
const SpectrumSVG = ({ width = 480, height = 120 }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 480 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{ width: '100%', height: 'auto', maxWidth: width }}
  >
    {/* Gradient bar */}
    <defs>
      <linearGradient id="spectrumGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.03)" />
        <stop offset="50%" stopColor="rgba(255,255,255,0.08)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
      </linearGradient>
    </defs>

    {/* Main bar */}
    <rect x="40" y="50" width="400" height="6" rx="3" fill="url(#spectrumGrad)" />

    {/* Left label — where most traders are */}
    <text x="40" y="42" fontSize="8" fill="rgba(255,255,255,0.15)" fontFamily="Inter, sans-serif" letterSpacing="0.15em">NOISE</text>
    <circle cx="40" cy="53" r="4" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

    {/* Right label — where the product takes you */}
    <text x="415" y="42" fontSize="8" fill="rgba(255,255,255,0.35)" fontFamily="Inter, sans-serif" fontWeight="600" letterSpacing="0.15em">EDGE</text>
    <circle cx="440" cy="53" r="4" fill="rgba(255,255,255,0.35)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />

    {/* Tick marks along spectrum */}
    {[100, 160, 220, 280, 340, 380].map((x, i) => (
      <line key={i} x1={x} y1={58} x2={x} y2={64}
        stroke={`rgba(255,255,255,${0.04 + i * 0.02})`}
        strokeWidth="1"
      />
    ))}

    {/* "You" marker — moving toward edge */}
    <g>
      <line x1="320" y1="38" x2="320" y2="50"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
      <rect x="303" y="24" width="34" height="14" rx="7"
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1"
      />
      <text x="320" y="34" fontSize="7" fill="rgba(255,255,255,0.3)" fontFamily="Inter, sans-serif" textAnchor="middle" fontWeight="600">YOU</text>
    </g>

    {/* Signal dots */}
    {[80, 120, 180, 250, 310, 360, 400, 420].map((x, i) => (
      <circle key={i} cx={x} cy={80 + Math.sin(i * 1.8) * 12} r={1.5 + i * 0.3}
        fill={`rgba(255,255,255,${0.04 + i * 0.03})`}
      />
    ))}
  </svg>
);

export default SpectrumSVG;
