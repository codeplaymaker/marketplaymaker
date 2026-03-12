import React from 'react';

/**
 * Visual Device: Comparison (◫)
 * Two probability lines diverging — represents the edge scanner finding
 * where market price diverges from sharp bookmaker consensus.
 */
const ComparisonSVG = ({ width = 280, height = 180 }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 280 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Y-axis */}
    <line x1="40" y1="20" x2="40" y2="160" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
    {/* X-axis */}
    <line x1="40" y1="160" x2="260" y2="160" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

    {/* Y labels */}
    <text x="12" y="35" fontSize="8" fill="rgba(255,255,255,0.15)" fontFamily="Inter, sans-serif">100%</text>
    <text x="18" y="95" fontSize="8" fill="rgba(255,255,255,0.15)" fontFamily="Inter, sans-serif">50%</text>
    <text x="24" y="163" fontSize="8" fill="rgba(255,255,255,0.15)" fontFamily="Inter, sans-serif">0%</text>

    {/* Grid lines */}
    <line x1="40" y1="90" x2="260" y2="90" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 4" />
    <line x1="40" y1="55" x2="260" y2="55" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 4" />
    <line x1="40" y1="125" x2="260" y2="125" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 4" />

    {/* Market price line (higher — overpriced) */}
    <polyline
      points="40,100 70,95 100,88 130,80 150,72 170,68 190,70 210,65 240,60"
      stroke="rgba(255,255,255,0.15)"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <text x="243" y="58" fontSize="7" fill="rgba(255,255,255,0.2)" fontFamily="Inter, sans-serif">MARKET</text>

    {/* Sharp consensus line (lower — true probability) */}
    <polyline
      points="40,100 70,98 100,96 130,100 150,105 170,108 190,112 210,110 240,108"
      stroke="rgba(255,255,255,0.4)"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <text x="243" y="112" fontSize="7" fill="rgba(255,255,255,0.35)" fontFamily="Inter, sans-serif">SHARP</text>

    {/* Divergence area (the "edge") */}
    <polygon
      points="130,80 150,72 170,68 190,70 210,65 240,60 240,108 210,110 190,112 170,108 150,105 130,100"
      fill="rgba(255,255,255,0.04)"
    />

    {/* Edge annotation */}
    <line x1="190" y1="70" x2="190" y2="112" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="2 2" />
    <text x="194" y="94" fontSize="8" fill="rgba(255,255,255,0.3)" fontFamily="Inter, sans-serif" fontWeight="600">EDGE</text>
  </svg>
);

export default ComparisonSVG;
