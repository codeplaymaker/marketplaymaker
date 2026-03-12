import React from 'react';

/**
 * Visual Device: Flow (→)
 * A sequential pipeline connector — used between the 4 process steps.
 * Horizontal on desktop, vertical on mobile.
 */
const FlowSVG = ({ width = 800, height = 40 }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 800 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{ width: '100%', height: 'auto', marginBottom: '2rem' }}
  >
    {/* Connector line */}
    <line x1="100" y1="20" x2="700" y2="20"
      stroke="rgba(255,255,255,0.08)"
      strokeWidth="1"
    />

    {/* Step nodes */}
    {[100, 300, 500, 700].map((cx, i) => (
      <g key={i}>
        <circle cx={cx} cy={20} r="8"
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
        <circle cx={cx} cy={20} r="3"
          fill="rgba(255,255,255,0.3)"
        />
      </g>
    ))}

    {/* Arrows between nodes */}
    {[200, 400, 600].map((x, i) => (
      <g key={i}>
        <line x1={x - 8} y1={20} x2={x + 8} y2={20}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
          markerEnd="url(#arrowhead)"
        />
      </g>
    ))}

    <defs>
      <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      </marker>
    </defs>
  </svg>
);

export default FlowSVG;
