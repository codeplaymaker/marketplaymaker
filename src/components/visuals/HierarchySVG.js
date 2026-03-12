import React from 'react';

/**
 * Visual Device: Hierarchy (▽)
 * Represents layered price levels / order blocks — the ICT playbook concept.
 * Three horizontal zones stacked vertically with a sweep line.
 */
const HierarchySVG = ({ width = 280, height = 180 }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 280 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Premium zone */}
    <rect x="40" y="20" width="200" height="36" rx="4"
      fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
    <text x="50" y="43" fontSize="9" fill="rgba(255,255,255,0.2)" fontFamily="Inter, sans-serif">PREMIUM</text>
    <line x1="140" y1="28" x2="230" y2="28" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
    <line x1="140" y1="38" x2="220" y2="38" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
    <line x1="140" y1="48" x2="210" y2="48" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />

    {/* Equilibrium line */}
    <line x1="30" y1="90" x2="250" y2="90" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="6 4" />
    <text x="252" y="93" fontSize="8" fill="rgba(255,255,255,0.15)" fontFamily="Inter, sans-serif">EQ</text>

    {/* Discount zone */}
    <rect x="40" y="124" width="200" height="36" rx="4"
      fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
    <text x="50" y="147" fontSize="9" fill="rgba(255,255,255,0.2)" fontFamily="Inter, sans-serif">DISCOUNT</text>
    <line x1="140" y1="132" x2="230" y2="132" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
    <line x1="140" y1="142" x2="215" y2="142" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
    <line x1="140" y1="152" x2="225" y2="152" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />

    {/* Price sweep line — the "story" */}
    <polyline
      points="60,30 80,42 100,38 120,85 110,130 130,148 160,140 180,95 200,50 220,35"
      stroke="rgba(255,255,255,0.25)"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Entry dot in discount zone */}
    <circle cx="130" cy="148" r="3" fill="rgba(255,255,255,0.4)" />

    {/* Target dot in premium zone */}
    <circle cx="220" cy="35" r="3" fill="rgba(255,255,255,0.4)" />
    <line x1="223" y1="35" x2="235" y2="35" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    <text x="237" y="38" fontSize="7" fill="rgba(255,255,255,0.2)" fontFamily="Inter, sans-serif">TP</text>
  </svg>
);

export default HierarchySVG;
