import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Card, CardTitle, FullWidthSection, Grid } from './SharedStyles';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(99,102,241,0.15); }
  50% { box-shadow: 0 0 16px rgba(99,102,241,0.3); }
`;

const LiveDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p => p.$color || '#22c55e'};
  margin-right: 6px;
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

const KPI = styled.div`
  background: rgba(30, 30, 50, 0.9);
  border-radius: 12px;
  padding: 0.7rem 0.6rem;
  text-align: center;
  border: 1px solid ${p => p.$highlight ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.08)'};
  min-width: 0;
`;

const KPIValue = styled.div`
  font-size: 1.2rem;
  font-weight: 800;
  color: ${p => p.$color || '#e2e8f0'};
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
`;

const KPILabel = styled.div`
  font-size: 0.6rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 2px;
`;

const CurveContainer = styled.div`
  position: relative;
  width: 100%;
  height: 180px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(15, 15, 26, 0.6);
  border: 1px solid rgba(99,102,241,0.1);
`;

const TradeRow = styled.div`
  display: grid;
  grid-template-columns: 0.8fr 2.5fr 0.6fr 0.6fr 0.7fr 0.55fr 0.55fr;
  gap: 0.4rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(99,102,241,0.06);
  align-items: center;
  font-size: 0.72rem;

  &:last-child { border-bottom: none; }
  &:hover { background: rgba(99,102,241,0.04); border-radius: 6px; }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 0.12rem 0.4rem;
  border-radius: 5px;
  font-size: 0.62rem;
  font-weight: 700;
  background: ${p => p.$won === true ? 'rgba(34,197,94,0.15)' : p.$won === false ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.12)'};
  color: ${p => p.$won === true ? '#22c55e' : p.$won === false ? '#ef4444' : '#a5b4fc'};
`;

const StratBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
`;

const StratChip = styled.span`
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  background: ${p => p.$bg || 'rgba(99,102,241,0.12)'};
  color: ${p => p.$color || '#a5b4fc'};
`;

// ── Learning-specific styled components ──────────────────────────────

const PhaseBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  border-radius: 10px;
  background: ${p => p.$bg || 'rgba(30,30,50,0.9)'};
  border: 1px solid ${p => p.$border || 'rgba(99,102,241,0.15)'};
  ${p => p.$active ? css`animation: ${glow} 2s ease-in-out infinite;` : ''}
`;

const PhaseLabel = styled.span`
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${p => p.$color || '#a5b4fc'};
`;

const ProgressTrack = styled.div`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(99,102,241,0.1);
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  border-radius: 3px;
  background: ${p => p.$color || '#6366f1'};
  width: ${p => p.$pct || 0}%;
  transition: width 0.5s ease;
`;

const PatternRow = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 0.5fr 0.5fr 0.6fr 0.6fr 0.5fr 0.5fr;
  gap: 0.3rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid rgba(99,102,241,0.05);
  align-items: center;
  font-size: 0.68rem;

  &:hover { background: rgba(99,102,241,0.04); border-radius: 6px; }
`;

const BlockedTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.58rem;
  font-weight: 700;
  background: rgba(239,68,68,0.12);
  color: #f87171;
`;

const SignalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 0;
  border-bottom: 1px solid rgba(99,102,241,0.04);
  font-size: 0.68rem;
`;

const MiniBar = styled.div`
  width: 60px;
  height: 5px;
  border-radius: 3px;
  background: rgba(99,102,241,0.1);
  overflow: hidden;
  display: inline-block;
  margin-left: 6px;
  vertical-align: middle;
`;

const MiniBarFill = styled.div`
  height: 100%;
  border-radius: 3px;
  background: ${p => p.$color || '#6366f1'};
  width: ${p => Math.min(100, p.$pct || 0)}%;
`;

// Mini SVG sparkline for PnL curve
function PnLCurve({ data = [] }) {
  if (data.length < 2) {
    return (
      <CurveContainer style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
          {data.length === 0 ? 'No resolved trades yet — tracking...' : 'Need 2+ resolved trades for chart'}
        </span>
      </CurveContainer>
    );
  }

  const W = 600, H = 160, PAD = 20;
  const values = data.map(d => d.cumPnL);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;

  const toX = (i) => PAD + (i / (values.length - 1)) * (W - PAD * 2);
  const toY = (v) => H - PAD - ((v - min) / range) * (H - PAD * 2);

  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const zeroY = toY(0);
  const lastVal = values[values.length - 1];
  const color = lastVal >= 0 ? '#22c55e' : '#ef4444';

  // Gradient fill
  const fill = `${line} L${toX(values.length - 1).toFixed(1)},${H} L${PAD},${H} Z`;

  return (
    <CurveContainer>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Zero line */}
        <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke="#334155" strokeWidth="1" strokeDasharray="4,3" />
        {/* Fill */}
        <path d={fill} fill="url(#pnlGrad)" />
        {/* Line */}
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* End dot */}
        <circle cx={toX(values.length - 1)} cy={toY(lastVal)} r="4" fill={color} />
        {/* Labels */}
        <text x={PAD} y={14} fill="#64748b" fontSize="10" fontFamily="monospace">
          +${max.toFixed(2)}
        </text>
        <text x={PAD} y={H - 4} fill="#64748b" fontSize="10" fontFamily="monospace">
          {min < 0 ? `-$${Math.abs(min).toFixed(2)}` : '$0.00'}
        </text>
        <text x={W - PAD} y={toY(lastVal) - 8} fill={color} fontSize="11" fontWeight="bold" textAnchor="end" fontFamily="monospace">
          {lastVal >= 0 ? '+' : ''}${lastVal.toFixed(2)}
        </text>
      </svg>
    </CurveContainer>
  );
}

export default function PnLTab({ ctx }) {
  const { api } = ctx;
  const [perf, setPerf] = useState(null);
  const [history, setHistory] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const fetchPnL = useCallback(async () => {
    try {
      const [perfData, histData, insightsData] = await Promise.all([
        api('/polybot/paper-trades/performance').catch(() => null),
        api('/polybot/paper-trades?limit=100').catch(() => []),
        api('/polybot/learning/insights').catch(() => null),
      ]);
      if (perfData) setPerf(perfData);
      if (Array.isArray(histData)) setHistory(histData);
      if (insightsData) setInsights(insightsData);
    } catch { /* ignore */ }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    fetchPnL();
    timerRef.current = setInterval(fetchPnL, 5000);
    return () => clearInterval(timerRef.current);
  }, [fetchPnL]);

  const pnl = perf?.totalPnL || 0;
  const bankroll = perf?.simBankroll ?? 50;
  const startBankroll = perf?.startingBankroll ?? 50;
  const roi = perf?.bankrollReturn || 0;
  const winRate = perf?.winRate || 0;
  const resolved = perf?.resolvedCount || 0;
  const pending = perf?.pendingResolution || 0;
  const total = perf?.totalPaperTrades || 0;
  const sharpe = perf?.sharpeRatio || 0;
  const maxDD = perf?.maxDrawdown || 0;
  const profitFactor = perf?.profitFactor || 0;
  const pnlCurve = perf?.pnlCurve || [];
  const byStrat = perf?.byStrategy || {};

  // Learning data
  const phase = insights?.phase || perf?.learningPhase || 'EXPLORE';
  const totalRes = insights?.totalResolutions || 0;
  const learningVer = insights?.learningVersion || 0;
  const patterns = insights?.patternPerformance || {};
  const blocked = insights?.blockedPatterns || {};
  const thresholds = insights?.scoreThresholds || {};
  const signals = insights?.signalAccuracy || {};
  const drawdownPct = startBankroll > 0 ? Math.max(0, ((startBankroll - bankroll) / startBankroll) * 100) : 0;

  // Phase config
  const phaseConfig = {
    EXPLORE: { color: '#6366f1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', label: 'EXPLORE', icon: '🔭', target: 20, desc: 'Learning fast — casting a wide net' },
    EXPLOIT: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', label: 'EXPLOIT', icon: '🎯', target: 50, desc: 'Only proven signals — score ≥50' },
    AGGRESSIVE_EXPLOIT: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', label: 'AGGRESSIVE', icon: '⚡', target: 100, desc: 'High conviction only — score ≥55, max 3 bets' },
  };
  const pc = phaseConfig[phase] || phaseConfig.EXPLORE;
  const phasePct = Math.min(100, (totalRes / pc.target) * 100);

  const stratColors = {
    NO_BETS: { bg: 'rgba(34,197,94,0.12)', color: '#34d399', label: 'NO_BETS' },
    ARBITRAGE: { bg: 'rgba(99,102,241,0.12)', color: '#a5b4fc', label: 'ARB' },
    SPORTS_EDGE: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', label: 'SPORTS' },
    MOMENTUM: { bg: 'rgba(168,85,247,0.12)', color: '#c084fc', label: 'MOM' },
    PROVEN_EDGE: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', label: 'PROVEN' },
    CONTRARIAN: { bg: 'rgba(236,72,153,0.12)', color: '#f472b6', label: 'CONTRA' },
    WHALE_DETECTION: { bg: 'rgba(14,165,233,0.12)', color: '#38bdf8', label: 'WHALE' },
    SHARP_MONEY: { bg: 'rgba(217,119,6,0.12)', color: '#d97706', label: 'SHARP' },
    autoScan: { bg: 'rgba(14,165,233,0.12)', color: '#38bdf8', label: 'SCAN' },
  };

  return (
    <Grid>
      {/* ── Live Header ──────────────────────────────────── */}
      <FullWidthSection>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
          <LiveDot $color={pending > 0 ? '#22c55e' : '#fbbf24'} />
          <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.95rem' }}>Live Paper P&L</span>
          <span style={{ color: '#64748b', fontSize: '0.72rem', marginLeft: 'auto' }}>
            SIMULATION MODE · v{learningVer} · refreshes every 5s
          </span>
        </div>

        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.4rem' }}>
          <KPI $highlight>
            <KPIValue $color={pnl >= 0 ? '#22c55e' : '#ef4444'}>
              {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
            </KPIValue>
            <KPILabel>Total P&L</KPILabel>
          </KPI>
          <KPI>
            <KPIValue $color="#e2e8f0">${bankroll.toFixed(2)}</KPIValue>
            <KPILabel>Bankroll</KPILabel>
          </KPI>
          <KPI>
            <KPIValue $color={roi >= 0 ? '#22c55e' : '#ef4444'}>
              {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
            </KPIValue>
            <KPILabel>ROI</KPILabel>
          </KPI>
          <KPI>
            <KPIValue $color={winRate >= 50 ? '#22c55e' : winRate > 0 ? '#fbbf24' : '#64748b'}>
              {winRate.toFixed(0)}%
            </KPIValue>
            <KPILabel>Win Rate</KPILabel>
          </KPI>
          <KPI>
            <KPIValue $color="#a5b4fc">{total}</KPIValue>
            <KPILabel>Trades</KPILabel>
          </KPI>
          <KPI>
            <KPIValue $color="#fbbf24">{pending}</KPIValue>
            <KPILabel>Pending</KPILabel>
          </KPI>
          <KPI>
            <KPIValue $color="#34d399">{resolved}</KPIValue>
            <KPILabel>Resolved</KPILabel>
          </KPI>
        </div>
      </FullWidthSection>

      {/* ── Learning Brain ────────────────────────────────── */}
      <FullWidthSection>
        <Card $delay="0.05s">
          <CardTitle>🧠 Learning Intelligence</CardTitle>

          {/* Phase Progress */}
          <PhaseBar $bg={pc.bg} $border={pc.border} $active>
            <span style={{ fontSize: '1.1rem' }}>{pc.icon}</span>
            <PhaseLabel $color={pc.color}>{pc.label}</PhaseLabel>
            <ProgressTrack>
              <ProgressFill $color={pc.color} $pct={phasePct} />
            </ProgressTrack>
            <span style={{ color: pc.color, fontSize: '0.72rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: '52px', textAlign: 'right' }}>
              {totalRes} / {pc.target}
            </span>
          </PhaseBar>
          <div style={{ color: '#64748b', fontSize: '0.65rem', marginTop: '0.3rem', paddingLeft: '0.2rem' }}>
            {pc.desc}
          </div>

          {/* Learning KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.4rem', marginTop: '0.7rem' }}>
            <KPI>
              <KPIValue $color={pc.color} style={{ fontSize: '1rem' }}>
                {phase === 'EXPLORE' ? '≥40' : phase === 'EXPLOIT' ? '≥50' : '≥55'}
              </KPIValue>
              <KPILabel>Min Score</KPILabel>
            </KPI>
            <KPI>
              <KPIValue $color={pc.color} style={{ fontSize: '1rem' }}>
                {phase === 'EXPLORE' ? '8' : phase === 'EXPLOIT' ? '5' : '3'}
              </KPIValue>
              <KPILabel>Max Bets/Cycle</KPILabel>
            </KPI>
            <KPI>
              <KPIValue $color={Object.keys(blocked).length > 0 ? '#ef4444' : '#22c55e'} style={{ fontSize: '1rem' }}>
                {Object.keys(blocked).length}
              </KPIValue>
              <KPILabel>Blocked</KPILabel>
            </KPI>
            <KPI>
              <KPIValue $color={drawdownPct > 15 ? '#ef4444' : drawdownPct > 5 ? '#fbbf24' : '#22c55e'} style={{ fontSize: '1rem' }}>
                {drawdownPct.toFixed(1)}%
              </KPIValue>
              <KPILabel>Drawdown</KPILabel>
            </KPI>
            <KPI>
              <KPIValue $color="#a5b4fc" style={{ fontSize: '1rem' }}>
                {drawdownPct > 30 ? '0.5x' : drawdownPct > 15 ? '0.75x' : '1.0x'}
              </KPIValue>
              <KPILabel>Pos Scale</KPILabel>
            </KPI>
          </div>
        </Card>
      </FullWidthSection>

      {/* ── Capital & Position Limits ─────────────────────── */}
      <FullWidthSection>
        <Card $delay="0.05s">
          <CardTitle>💰 Capital Management <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 400 }}>max {perf?.capitalUtilization?.maxPositions ?? 50} positions · 5% reserve</span></CardTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.4rem' }}>
            <KPI>
              <KPIValue $color="#22c55e" style={{ fontSize: '1rem' }}>
                ${perf?.capitalUtilization?.availableCapital?.toFixed(2) ?? '—'}
              </KPIValue>
              <KPILabel>Available</KPILabel>
            </KPI>
            <KPI>
              <KPIValue $color="#f59e0b" style={{ fontSize: '1rem' }}>
                ${perf?.capitalUtilization?.lockedCapital?.toFixed(2) ?? '—'}
              </KPIValue>
              <KPILabel>Locked</KPILabel>
            </KPI>
            <KPI>
              <KPIValue $color={(() => {
                const pct = perf?.capitalUtilization?.utilizationPct || 0;
                if (pct >= 90) return '#ef4444';
                if (pct >= 70) return '#f59e0b';
                return '#22c55e';
              })()} style={{ fontSize: '1rem' }}>
                {perf?.capitalUtilization?.utilizationPct?.toFixed(0) ?? 0}%
              </KPIValue>
              <KPILabel>Utilization</KPILabel>
            </KPI>
            <KPI>
              <KPIValue $color={(() => {
                const open = perf?.capitalUtilization?.openPositions || 0;
                const max = perf?.capitalUtilization?.maxPositions || 50;
                if (open >= max) return '#ef4444';
                if (open >= max * 0.8) return '#f59e0b';
                return '#818cf8';
              })()} style={{ fontSize: '1rem' }}>
                {perf?.capitalUtilization?.openPositions ?? 0}/{perf?.capitalUtilization?.maxPositions ?? 50}
              </KPIValue>
              <KPILabel>Positions</KPILabel>
            </KPI>
          </div>
        </Card>
      </FullWidthSection>

      {/* ── Time Horizon ──────────────────────────────────── */}
      <FullWidthSection>
        <Card $delay="0.06s">
          <CardTitle>⏱️ Time Horizon <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 400 }}>≤7d normal · 8-30d score≥60 · &gt;30d blocked</span></CardTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.4rem' }}>
            <KPI>
              <KPIValue $color="#22c55e" style={{ fontSize: '1rem' }}>
                {perf?.timeHorizon?.pendingByHorizon?.short ?? '—'}
              </KPIValue>
              <KPILabel>≤7 Days</KPILabel>
            </KPI>
            <KPI>
              <KPIValue $color="#fbbf24" style={{ fontSize: '1rem' }}>
                {perf?.timeHorizon?.pendingByHorizon?.medium ?? '—'}
              </KPIValue>
              <KPILabel>8-30 Days</KPILabel>
            </KPI>
            <KPI>
              <KPIValue $color="#64748b" style={{ fontSize: '1rem' }}>
                {perf?.timeHorizon?.pendingByHorizon?.unknown ?? '—'}
              </KPIValue>
              <KPILabel>No Date</KPILabel>
            </KPI>
            <KPI>
              <KPIValue $color="#ef4444" style={{ fontSize: '1rem' }}>
                {perf?.timeHorizon?.pendingByHorizon?.expired ?? 0}
              </KPIValue>
              <KPILabel>Expired</KPILabel>
            </KPI>
          </div>
        </Card>
      </FullWidthSection>

      {/* ── Pattern Memory ────────────────────────────────── */}
      {Object.keys(patterns).length > 0 && (
        <FullWidthSection>
          <Card $delay="0.08s">
            <CardTitle>🔬 Pattern Memory <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 400 }}>({Object.keys(patterns).length} patterns tracked)</span></CardTitle>

            {/* Header */}
            <PatternRow style={{ color: '#64748b', fontWeight: 600, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Pattern</span>
              <span style={{ textAlign: 'center' }}>W</span>
              <span style={{ textAlign: 'center' }}>L</span>
              <span style={{ textAlign: 'center' }}>Win%</span>
              <span style={{ textAlign: 'center' }}>P&L</span>
              <span style={{ textAlign: 'center' }}>Streak</span>
              <span style={{ textAlign: 'center' }}>Status</span>
            </PatternRow>

            {Object.entries(patterns)
              .sort((a, b) => (b[1].totalPnL || 0) - (a[1].totalPnL || 0))
              .map(([key, p]) => {
                const [strat, side] = key.split(':');
                const sc = stratColors[strat] || { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8', label: strat };
                const isBlocked = !!blocked[key];
                const wr = p.winRate || 0;
                return (
                  <PatternRow key={key} style={{ opacity: isBlocked ? 0.6 : 1 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <StratChip $bg={sc.bg} $color={sc.color} style={{ fontSize: '0.58rem', padding: '0.08rem 0.3rem' }}>
                        {sc.label}
                      </StratChip>
                      <span style={{ color: side === 'NO' ? '#f87171' : '#34d399', fontWeight: 700, fontSize: '0.62rem' }}>
                        {side}
                      </span>
                    </span>
                    <span style={{ textAlign: 'center', color: '#22c55e', fontWeight: 600 }}>{p.wins}</span>
                    <span style={{ textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>{p.losses}</span>
                    <span style={{ textAlign: 'center' }}>
                      <span style={{ color: wr >= 50 ? '#22c55e' : wr >= 35 ? '#fbbf24' : '#ef4444', fontWeight: 700 }}>
                        {wr.toFixed(0)}%
                      </span>
                      <MiniBar>
                        <MiniBarFill $pct={wr} $color={wr >= 50 ? '#22c55e' : wr >= 35 ? '#fbbf24' : '#ef4444'} />
                      </MiniBar>
                    </span>
                    <span style={{ textAlign: 'center', color: (p.totalPnL || 0) >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {(p.totalPnL || 0) >= 0 ? '+' : ''}${(p.totalPnL || 0).toFixed(2)}
                    </span>
                    <span style={{ textAlign: 'center', fontWeight: 700, color: (p.streak || 0) > 0 ? '#22c55e' : (p.streak || 0) < 0 ? '#ef4444' : '#64748b' }}>
                      {(p.streak || 0) > 0 ? `+${p.streak}` : p.streak || '0'}
                    </span>
                    <span style={{ textAlign: 'center' }}>
                      {isBlocked ? (
                        <BlockedTag>🚫 BLOCKED</BlockedTag>
                      ) : wr >= 50 ? (
                        <span style={{ color: '#22c55e', fontSize: '0.6rem', fontWeight: 700 }}>✓ ACTIVE</span>
                      ) : (
                        <span style={{ color: '#fbbf24', fontSize: '0.6rem', fontWeight: 700 }}>⚠ WATCH</span>
                      )}
                    </span>
                  </PatternRow>
                );
              })}
          </Card>
        </FullWidthSection>
      )}

      {/* ── Blocked Patterns Detail ───────────────────────── */}
      {Object.keys(blocked).length > 0 && (
        <FullWidthSection>
          <Card $delay="0.1s">
            <CardTitle>🚫 Blocked Patterns</CardTitle>
            <div style={{ display: 'grid', gap: '0.4rem' }}>
              {Object.entries(blocked).map(([key, b]) => {
                const [strat, side] = key.split(':');
                const sc = stratColors[strat] || { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8', label: strat };
                const cooldownLeft = (b.cooldownUntil || 0) - totalRes;
                return (
                  <div key={key} style={{
                    background: 'rgba(239,68,68,0.06)', borderRadius: '8px', padding: '0.5rem 0.7rem',
                    border: '1px solid rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}>
                    <StratChip $bg={sc.bg} $color={sc.color}>{sc.label}</StratChip>
                    <span style={{ color: side === 'NO' ? '#f87171' : '#34d399', fontWeight: 700, fontSize: '0.72rem' }}>{side}</span>
                    <span style={{ color: '#f87171', fontSize: '0.68rem', flex: 1 }}>
                      {b.reason}
                    </span>
                    <span style={{ color: '#64748b', fontSize: '0.62rem' }}>
                      WR: {b.winRate}% · {b.trades} trades · P&L: ${(b.totalPnL || 0).toFixed(2)}
                    </span>
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.3rem', borderRadius: '4px',
                      background: cooldownLeft > 0 ? 'rgba(251,191,36,0.12)' : 'rgba(34,197,94,0.12)',
                      color: cooldownLeft > 0 ? '#fbbf24' : '#22c55e',
                    }}>
                      {cooldownLeft > 0 ? `↻ ${cooldownLeft} res` : '↻ review'}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </FullWidthSection>
      )}

      {/* ── Learned Thresholds ────────────────────────────── */}
      {Object.keys(thresholds).length > 0 && (
        <FullWidthSection>
          <Card $delay="0.12s">
            <CardTitle>📊 Learned Score Thresholds</CardTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.4rem' }}>
              {Object.entries(thresholds).map(([strat, t]) => {
                const sc = stratColors[strat] || { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8', label: strat };
                return (
                  <div key={strat} style={{
                    background: sc.bg, borderRadius: '8px', padding: '0.5rem',
                    border: `1px solid ${sc.color}22`,
                  }}>
                    <div style={{ fontWeight: 700, color: sc.color, fontSize: '0.72rem', marginBottom: '0.3rem' }}>
                      {sc.label}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.15rem', fontSize: '0.63rem' }}>
                      <span style={{ color: '#94a3b8' }}>Profit Cutoff</span>
                      <span style={{ color: '#e2e8f0', fontWeight: 700, textAlign: 'right' }}>{t.profitCutoff}</span>
                      <span style={{ color: '#94a3b8' }}>Optimal Min</span>
                      <span style={{ color: '#a5b4fc', fontWeight: 600, textAlign: 'right' }}>{t.optimalMinScore}</span>
                      <span style={{ color: '#94a3b8' }}>Win Rate</span>
                      <span style={{ color: (t.winRate || 0) >= 50 ? '#22c55e' : '#fbbf24', fontWeight: 600, textAlign: 'right' }}>{t.winRate}%</span>
                      <span style={{ color: '#94a3b8' }}>Sample</span>
                      <span style={{ color: '#64748b', textAlign: 'right' }}>{t.sampleSize} trades</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </FullWidthSection>
      )}

      {/* ── Signal Accuracy ───────────────────────────────── */}
      {Object.keys(signals).length > 0 && (
        <FullWidthSection>
          <Card $delay="0.14s">
            <CardTitle>📡 Signal Accuracy</CardTitle>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {Object.entries(signals)
                .filter(([, s]) => s.total >= 3)
                .sort((a, b) => (b[1].accuracy || 0) - (a[1].accuracy || 0))
                .map(([name, s]) => {
                  const acc = s.accuracy || 0;
                  const recent = s.recentAccuracy;
                  return (
                    <SignalRow key={name}>
                      <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{name}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ color: acc >= 60 ? '#22c55e' : acc >= 45 ? '#fbbf24' : '#ef4444', fontWeight: 700, minWidth: '36px', textAlign: 'right' }}>
                          {acc.toFixed(0)}%
                        </span>
                        <MiniBar style={{ width: '50px' }}>
                          <MiniBarFill $pct={acc} $color={acc >= 60 ? '#22c55e' : acc >= 45 ? '#fbbf24' : '#ef4444'} />
                        </MiniBar>
                        {recent != null && (
                          <span style={{ color: '#64748b', fontSize: '0.6rem' }}>
                            ({recent.toFixed(0)}% recent)
                          </span>
                        )}
                        <span style={{ color: '#475569', fontSize: '0.58rem' }}>n={s.total}</span>
                      </span>
                    </SignalRow>
                  );
                })}
            </div>
          </Card>
        </FullWidthSection>
      )}

      {/* ── PnL Curve ────────────────────────────────────── */}
      <FullWidthSection>
        <Card $delay="0.16s">
          <CardTitle>📈 Equity Curve</CardTitle>
          <PnLCurve data={pnlCurve} bankroll={startBankroll} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.68rem', color: '#64748b' }}>
            <span>Sharpe: <strong style={{ color: sharpe > 0 ? '#22c55e' : '#ef4444' }}>{sharpe.toFixed(2)}</strong></span>
            <span>Max DD: <strong style={{ color: '#ef4444' }}>${maxDD.toFixed(2)}</strong></span>
            <span>PF: <strong style={{ color: profitFactor > 1 ? '#22c55e' : '#ef4444' }}>{profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}</strong></span>
            <span>Start: <strong style={{ color: '#a5b4fc' }}>${startBankroll}</strong></span>
          </div>
        </Card>
      </FullWidthSection>

      {/* ── Strategy Breakdown ───────────────────────────── */}
      <FullWidthSection>
        <Card $delay="0.18s">
          <CardTitle>🎯 Strategy Breakdown</CardTitle>
          {Object.keys(byStrat).length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>
              Waiting for resolved trades...
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
              {Object.entries(byStrat).map(([strat, s]) => {
                const sc = stratColors[strat] || { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8', label: strat };
                return (
                  <div key={strat} style={{
                    background: sc.bg, borderRadius: '10px', padding: '0.6rem',
                    border: `1px solid ${sc.color}22`,
                  }}>
                    <div style={{ fontWeight: 700, color: sc.color, fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                      {sc.label}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.2rem', fontSize: '0.68rem' }}>
                      <span style={{ color: '#94a3b8' }}>Trades</span>
                      <span style={{ color: '#e2e8f0', fontWeight: 600, textAlign: 'right' }}>{s.trades}</span>
                      <span style={{ color: '#94a3b8' }}>Win%</span>
                      <span style={{ color: s.winRate >= 50 ? '#22c55e' : '#fbbf24', fontWeight: 600, textAlign: 'right' }}>{s.winRate}%</span>
                      <span style={{ color: '#94a3b8' }}>P&L</span>
                      <span style={{ color: s.pnl >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600, textAlign: 'right' }}>
                        {s.pnl >= 0 ? '+' : ''}${s.pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </FullWidthSection>

      {/* ── Paper Trades ──────────────────────────────────── */}
      <FullWidthSection>
        <Card $delay="0.2s">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <CardTitle style={{ margin: 0 }}>📋 Paper Trades ({total})</CardTitle>
            <StratBar>
              {Object.entries(byStrat).map(([strat, s]) => {
                const sc = stratColors[strat] || { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8', label: strat };
                return (
                  <StratChip key={strat} $bg={sc.bg} $color={sc.color}>
                    {s.trades} {sc.label}
                  </StratChip>
                );
              })}
            </StratBar>
          </div>

          <TradeRow style={{ color: '#64748b', fontWeight: 600, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>Time</span>
            <span>Market</span>
            <span>Strategy</span>
            <span>Side</span>
            <span>Size</span>
            <span>Result</span>
            <span>Expires</span>
          </TradeRow>

          {history.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center', padding: '1.5rem' }}>
              {loading ? 'Loading...' : 'Scanner is running — trades will appear as edges are detected'}
            </div>
          ) : (
            history.slice(0, 50).map((t, i) => {
              const sc = stratColors[t.strategy] || { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8', label: t.strategy?.slice(0, 6) };
              return (
                <TradeRow key={t.conditionId + '-' + i}>
                  <span style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                    {t.timestamp ? new Date(t.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                  <span style={{ color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.market || t.question || '—'}
                  </span>
                  <span>
                    <StratChip $bg={sc.bg} $color={sc.color}>{sc.label}</StratChip>
                  </span>
                  <span style={{ color: t.side === 'NO' ? '#f87171' : '#34d399', fontWeight: 600 }}>
                    {t.side || '—'}
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#e2e8f0' }}>
                    ${(t.kellySize || t.amount || 0).toFixed(2)}
                  </span>
                  <span>
                    {t.resolved ? (
                      <Badge $won={t.pnl?.won}>
                        {t.pnl?.won ? `+$${(t.pnl.netPnL || 0).toFixed(2)}` : `-$${Math.abs(t.pnl?.netPnL || t.kellySize || 0).toFixed(2)}`}
                      </Badge>
                    ) : (
                      <Badge $won={null}>OPEN</Badge>
                    )}
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.65rem', color: (() => {
                    if (t.expired) return '#f87171';
                    const d = t.daysLeft;
                    if (d == null) return '#64748b';
                    if (d <= 7) return '#34d399';
                    if (d <= 30) return '#fbbf24';
                    return '#f87171';
                  })() }}>
                    {t.expired ? 'EXP' : t.daysLeft != null ? `${t.daysLeft}d` : '—'}
                  </span>
                </TradeRow>
              );
            })
          )}
        </Card>
      </FullWidthSection>

      {/* ── Bankroll History ──────────────────────────────── */}
      {perf?.simBankrollHistory?.length > 0 && (
        <FullWidthSection>
          <Card $delay="0.25s">
            <CardTitle>💰 Bankroll Timeline</CardTitle>
            <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '0.7rem' }}>
              {[...perf.simBankrollHistory].reverse().slice(0, 30).map((h, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0',
                  borderBottom: '1px solid rgba(99,102,241,0.05)',
                }}>
                  <span style={{ color: '#64748b' }}>
                    {new Date(h.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ color: '#94a3b8', flex: 1, marginLeft: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.event}
                  </span>
                  <span style={{ color: '#e2e8f0', fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginLeft: '0.5rem' }}>
                    ${h.bankroll?.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </FullWidthSection>
      )}
    </Grid>
  );
}
