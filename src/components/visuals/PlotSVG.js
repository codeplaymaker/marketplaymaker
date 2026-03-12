import React from 'react';

/**
 * Visual Device: Plot (⊞)
 * Scatter of data points on two axes — represents the trading journal
 * showing trade performance across win rate and edge.
 */
const PlotSVG = ({ width = 280, height = 180 }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 280 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Y-axis */}
    <line x1="40" y1="15" x2="40" y2="155" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
    <text x="10" y="88" fontSize="7" fill="rgba(255,255,255,0.15)" fontFamily="Inter, sans-serif"
      transform="rotate(-90 18 88)">P&amp;L</text>

    {/* X-axis */}
    <line x1="40" y1="155" x2="260" y2="155" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
    <text x="140" y="172" fontSize="7" fill="rgba(255,255,255,0.15)" fontFamily="Inter, sans-serif" textAnchor="middle">TRADES</text>

    {/* Zero line */}
    <line x1="40" y1="100" x2="260" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />

    {/* Grid */}
    <line x1="40" y1="55" x2="260" y2="55" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3" />
    <line x1="100" y1="15" x2="100" y2="155" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3" />
    <line x1="160" y1="15" x2="160" y2="155" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3" />
    <line x1="220" y1="15" x2="220" y2="155" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3" />

    {/* Winning trades (above zero) — brighter */}
    <circle cx="58" cy="88" r="3" fill="rgba(255,255,255,0.35)" />
    <circle cx="72" cy="110" r="3" fill="rgba(255,255,255,0.12)" />
    <circle cx="90" cy="75" r="4" fill="rgba(255,255,255,0.35)" />
    <circle cx="108" cy="92" r="3" fill="rgba(255,255,255,0.35)" />
    <circle cx="120" cy="115" r="3" fill="rgba(255,255,255,0.12)" />
    <circle cx="135" cy="68" r="4" fill="rgba(255,255,255,0.4)" />
    <circle cx="148" cy="105" r="3" fill="rgba(255,255,255,0.12)" />
    <circle cx="165" cy="60" r="5" fill="rgba(255,255,255,0.4)" />
    <circle cx="178" cy="82" r="3" fill="rgba(255,255,255,0.35)" />
    <circle cx="192" cy="112" r="3" fill="rgba(255,255,255,0.12)" />
    <circle cx="208" cy="55" r="5" fill="rgba(255,255,255,0.4)" />
    <circle cx="222" cy="72" r="4" fill="rgba(255,255,255,0.35)" />
    <circle cx="238" cy="48" r="5" fill="rgba(255,255,255,0.45)" />
    <circle cx="250" cy="65" r="4" fill="rgba(255,255,255,0.4)" />

    {/* Trend line (upward) */}
    <line x1="50" y1="105" x2="255" y2="55"
      stroke="rgba(255,255,255,0.15)"
      strokeWidth="1"
      strokeDasharray="6 3"
    />

    {/* Annotation */}
    <text x="200" y="42" fontSize="8" fill="rgba(255,255,255,0.25)" fontFamily="Inter, sans-serif" fontWeight="600">+EV</text>
  </svg>
);

export default PlotSVG;
