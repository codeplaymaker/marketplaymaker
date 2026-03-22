import React, { useMemo, useState, useEffect } from 'react';
import {
  Grid, FullWidthSection, Card, CardTitle, StatCard, StatValue, StatLabel,
  Button, Badge, Input, LiveDot, PriceBar, PriceFill,
} from './SharedStyles';

// ─── Micro Sparkline (pure SVG, no deps) ─────────────────────────────
const Sparkline = ({ data, color = '#22c55e', width = 80, height = 28 }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`spark-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-${color.replace('#','')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─── Countdown hook ──────────────────────────────────────────────────
function useCountdown(targetTime) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!targetTime) return null;
  const diff = new Date(targetTime).getTime() - now;
  if (diff <= 0) return 'now';
  const s = Math.floor(diff / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

// ─── Helpers ─────────────────────────────────────────────────────────
const fmtPnL = (v) => {
  if (v == null) return '$0.00';
  return `${v >= 0 ? '+' : ''}$${Math.abs(v).toFixed(2)}`;
};

const fmtPct = (v) => v != null ? `${v}%` : '—';

const timeSince = (iso) => {
  if (!iso) return 'never';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

// ═══════════════════════════════════════════════════════════════════════
// OVERVIEW TAB — World-class command center
// ═══════════════════════════════════════════════════════════════════════
const OverviewTab = React.memo(({ ctx }) => {
  const {
    indEdges, status, trackRecord, picksRecord, performance, connected,
    isRunning, mode, bankrollInput, setBankrollInput, opportunities,
    scanning, scanResult, scanStatus, indSourcesStatus, llmConfigured,
    learningData, positions, startBot, stopBot, triggerScan, autoExecute,
    /* resetBot — available via ctx if needed */
    setActiveTab, sseConnected, lastEvent,
  } = ctx;

  const nextScanCountdown = useCountdown(scanStatus?.nextScan);

  // Derived metrics
  const activeEdges = useMemo(() => indEdges.filter(e => (e.edgeQuality || 0) >= 35), [indEdges]);
  const bPlusEdges = useMemo(() => indEdges.filter(e => (e.edgeQuality || 0) >= 55), [indEdges]);
  const totalMarkets = (status?.scanner?.platforms?.polymarket?.markets || 0) + (status?.scanner?.platforms?.kalshi?.markets || 0);
  const winRate = trackRecord?.summary?.winRate ?? picksRecord?.summary?.winRate ?? null;
  const pnl = trackRecord?.hypothetical?.totalReturn ?? performance?.totalPnL ?? null;
  const totalTrades = performance?.totalTrades || 0;

  // P&L sparkline data from track record
  const pnlSpark = useMemo(() => {
    const recent = trackRecord?.recent || [];
    if (recent.length < 2) return null;
    let cum = 0;
    return recent.slice().reverse().map(r => { cum += (r.pnlPp || 0); return cum; });
  }, [trackRecord]);

  // Source health
  const sources = useMemo(() => [
    { name: 'GPT-4o', icon: '🧠', ok: llmConfigured, detail: `${indSourcesStatus?.llm?.totalCalls || 0} calls` },
    { name: 'Metaculus', icon: '📊', ok: (indSourcesStatus?.polling?.sources || []).find(s => s.name === 'Metaculus')?.stats?.successes > 0, detail: 'Superforecasters' },
    { name: 'Manifold', icon: '🎯', ok: (indSourcesStatus?.expert?.sources || []).find(s => s.name === 'Manifold Markets')?.stats?.successes > 0, detail: 'Cross-platform' },
    { name: 'Polymarket', icon: '🟣', ok: connected, detail: `${status?.scanner?.platforms?.polymarket?.markets || 0} mkts` },
    { name: 'Kalshi', icon: '🔵', ok: (status?.scanner?.platforms?.kalshi?.markets || 0) > 0, detail: `${status?.scanner?.platforms?.kalshi?.markets || 0} mkts` },
  ], [llmConfigured, indSourcesStatus, connected, status]);

  const sourcesOnline = sources.filter(s => s.ok).length;

  return (
    <Grid>
      {/* ════════════════════════════════════════════════════════════════
          1. PRIMARY ACTION BAR — Paper-Trade button front and center
          ════════════════════════════════════════════════════════════════ */}
      <FullWidthSection>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
          padding: '0.75rem 1rem', borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.08))',
          border: '1px solid rgba(99, 102, 241, 0.25)',
        }}>
          <LiveDot $active={isRunning} />
          <div style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.95rem' }}>
                {isRunning ? 'Scanner Active' : 'Scanner Offline'}
              </span>
              <Badge $type={mode === 'PAPER' ? 'simulation' : 'running'} style={{ fontSize: '0.6rem' }}>
                {mode}
              </Badge>
              {sseConnected && (
                <span style={{ fontSize: '0.6rem', color: '#34d399', fontWeight: 600 }}>● LIVE</span>
              )}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>
              {isRunning ? (
                <>
                  {totalMarkets} markets · {status?.scanner?.scanCount || 0} scans
                  {nextScanCountdown && nextScanCountdown !== 'now' && <> · next in <strong style={{ color: '#a5b4fc' }}>{nextScanCountdown}</strong></>}
                  {nextScanCountdown === 'now' && <> · <strong style={{ color: '#34d399' }}>scanning now</strong></>}
                </>
              ) : (
                'Start the scanner to detect market edges in real-time'
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '0.3rem 0.5rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.7rem' }}>$</span>
              <Input
                id="bankroll-input"
                type="number"
                value={bankrollInput}
                onChange={(e) => setBankrollInput(e.target.value)}
                $width="70px"
                min="10"
                style={{ padding: '0.25rem 0.4rem', fontSize: '0.78rem', background: 'transparent', border: 'none' }}
                aria-label="Bankroll amount in USDC"
              />
              <span style={{ color: '#475569', fontSize: '0.6rem' }}>USDC</span>
            </div>

            {!isRunning ? (
              <Button $variant="primary" onClick={startBot} disabled={!connected} style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}>
                ▶ Start Scanner
              </Button>
            ) : (
              <>
                <Button $variant="ghost" onClick={triggerScan} disabled={!connected || scanning} style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}>
                  {scanning ? '⏳' : '🔍 Scan Now'}
                </Button>
                <Button $variant="danger" onClick={stopBot} style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}>
                  ⏹ Stop
                </Button>
              </>
            )}

            <Button
              $variant="success"
              onClick={autoExecute}
              disabled={!connected || !isRunning || opportunities.length === 0}
              style={{
                padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 700,
                boxShadow: opportunities.length > 0 ? '0 0 20px rgba(16, 185, 129, 0.3)' : 'none',
              }}
            >
              ⚡ Paper-Trade Top 3
            </Button>
          </div>
        </div>

        {/* Scan result toast */}
        {scanResult && (
          <div style={{
            marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '10px', fontSize: '0.8rem',
            background: scanResult.error ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
            border: `1px solid ${scanResult.error ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
            color: scanResult.error ? '#f87171' : '#34d399',
          }} role="status" aria-live="polite">
            {scanResult.error
              ? `${scanResult.error}`
              : `${scanResult.marketsScanned} markets scanned — ${scanResult.opportunitiesFound} opportunities found`}
          </div>
        )}
      </FullWidthSection>

      {/* ════════════════════════════════════════════════════════════════
          2. HERO KPI STRIP — Large, scannable metrics
          ════════════════════════════════════════════════════════════════ */}
      <FullWidthSection>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.6rem',
        }}>
          {/* Active Edges */}
          <div style={{
            background: 'rgba(30, 30, 50, 0.9)', borderRadius: '12px', padding: '0.8rem 1rem',
            border: activeEdges.length > 0 ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(99, 102, 241, 0.1)',
            cursor: 'pointer',
          }} onClick={() => setActiveTab('signals')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a5b4fc', fontVariantNumeric: 'tabular-nums' }}>
                  {activeEdges.length}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.1rem' }}>
                  Active Edges
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.7rem', color: bPlusEdges.length > 0 ? '#34d399' : '#475569', fontWeight: 600 }}>
                  {bPlusEdges.length} B+
                </span>
              </div>
            </div>
          </div>

          {/* Markets */}
          <div style={{
            background: 'rgba(30, 30, 50, 0.9)', borderRadius: '12px', padding: '0.8rem 1rem',
            border: '1px solid rgba(99, 102, 241, 0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#818cf8', fontVariantNumeric: 'tabular-nums' }}>
                  {totalMarkets || '—'}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.1rem' }}>
                  Markets
                </div>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#475569', textAlign: 'right', lineHeight: 1.4 }}>
                <div>{status?.scanner?.platforms?.polymarket?.markets || 0} poly</div>
                <div>{status?.scanner?.platforms?.kalshi?.markets || 0} kalshi</div>
              </div>
            </div>
          </div>

          {/* Win Rate */}
          <div style={{
            background: 'rgba(30, 30, 50, 0.9)', borderRadius: '12px', padding: '0.8rem 1rem',
            border: '1px solid rgba(99, 102, 241, 0.1)',
            cursor: 'pointer',
          }} onClick={() => setActiveTab('pnl')}>
            <div>
              <div style={{
                fontSize: '1.5rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                color: winRate != null ? (winRate >= 55 ? '#22c55e' : winRate >= 45 ? '#fbbf24' : '#ef4444') : '#475569',
              }}>
                {fmtPct(winRate)}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.1rem' }}>
                Win Rate
              </div>
            </div>
          </div>

          {/* P&L with sparkline */}
          <div style={{
            background: 'rgba(30, 30, 50, 0.9)', borderRadius: '12px', padding: '0.8rem 1rem',
            border: '1px solid rgba(99, 102, 241, 0.1)',
            cursor: 'pointer',
          }} onClick={() => setActiveTab('pnl')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{
                  fontSize: '1.5rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                  color: pnl != null ? (pnl >= 0 ? '#22c55e' : '#ef4444') : '#475569',
                }}>
                  {fmtPnL(pnl)}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.1rem' }}>
                  Total P&L
                </div>
              </div>
              {pnlSpark && (
                <Sparkline data={pnlSpark} color={pnl >= 0 ? '#22c55e' : '#ef4444'} width={60} height={24} />
              )}
            </div>
          </div>

          {/* Sources */}
          <div style={{
            background: 'rgba(30, 30, 50, 0.9)', borderRadius: '12px', padding: '0.8rem 1rem',
            border: `1px solid ${sourcesOnline >= 4 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{
                  fontSize: '1.5rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                  color: sourcesOnline >= 4 ? '#34d399' : '#fbbf24',
                }}>
                  {sourcesOnline}<span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 400 }}>/{sources.length}</span>
                </div>
                <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.1rem' }}>
                  Sources Live
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.2rem', flexDirection: 'column' }}>
                {sources.map((s, i) => (
                  <span key={i} style={{ fontSize: '0.55rem', color: s.ok ? '#34d399' : '#475569' }}>
                    {s.ok ? '●' : '○'} {s.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </FullWidthSection>

      {/* ════════════════════════════════════════════════════════════════
          3. LIVE POSITIONS — AI-proven paper trades (the money shot)
          ════════════════════════════════════════════════════════════════ */}
      <FullWidthSection>
        <Card $delay="0.04s">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <CardTitle style={{ marginBottom: 0 }}>
              💼 Live AI Positions
            </CardTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {positions.length > 0 && (
                <span style={{
                  fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 600,
                  background: 'rgba(99, 102, 241, 0.1)', color: '#a5b4fc',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                }}>
                  ${positions.reduce((s, p) => s + (p.size || 0), 0).toFixed(2)} deployed
                </span>
              )}
              <span style={{ fontSize: '0.68rem', color: '#64748b', cursor: 'pointer' }}
                onClick={() => setActiveTab('pnl')}>
                Full history →
              </span>
            </div>
          </div>

          {positions.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '1.25rem 1rem',
              background: 'rgba(99, 102, 241, 0.04)', borderRadius: '10px',
              border: '1px solid rgba(99, 102, 241, 0.08)',
            }}>
              {isRunning ? (
                <div>
                  <div style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>🎯</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Waiting for trade signals</div>
                  <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '0.2rem' }}>
                    The AI will auto-execute the top edges when conditions are met.
                    Hit <strong style={{ color: '#34d399' }}>Paper-Trade Top 3</strong> to trade immediately.
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>⚡</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>No open positions</div>
                  <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '0.2rem' }}>
                    Start the scanner and the AI will identify, validate, and paper-trade the best edges automatically.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.4rem' }}>
              {positions.map((pos, i) => {
                const entryPct = ((pos.avgPrice || 0) * 100).toFixed(0);
                const stratColor = pos.strategy === 'NO_BETS' ? '#34d399'
                  : pos.strategy === 'ARBITRAGE' ? '#a5b4fc'
                  : pos.strategy === 'MOMENTUM' ? '#c084fc'
                  : pos.strategy === 'SPORTS_EDGE' ? '#fbbf24'
                  : '#818cf8';
                const sideColor = pos.side === 'YES' ? '#22c55e' : '#ef4444';
                const elapsed = pos.enteredAt
                  ? (() => {
                      const mins = Math.floor((Date.now() - new Date(pos.enteredAt).getTime()) / 60000);
                      if (mins < 60) return `${mins}m`;
                      if (mins < 1440) return `${Math.floor(mins / 60)}h`;
                      return `${Math.floor(mins / 1440)}d`;
                    })()
                  : '—';

                return (
                  <div key={pos.conditionId || i} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto',
                    gap: '0.5rem',
                    alignItems: 'center',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '10px',
                    background: 'rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.08)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.15)'}>
                    {/* Market name + strategy */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {(pos.market || 'Unknown Market').length > 55
                          ? pos.market.slice(0, 52) + '...'
                          : pos.market || 'Unknown Market'}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.15rem' }}>
                        <span style={{
                          fontSize: '0.6rem', fontWeight: 700,
                          background: `${stratColor}15`, color: stratColor,
                          padding: '0.08rem 0.35rem', borderRadius: '4px',
                          border: `1px solid ${stratColor}25`,
                        }}>
                          {(pos.strategy || '').replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontSize: '0.62rem', color: '#475569' }}>{elapsed} ago</span>
                      </div>
                    </div>

                    {/* Side badge */}
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem',
                      borderRadius: '6px',
                      background: `${sideColor}15`, color: sideColor,
                      border: `1px solid ${sideColor}25`,
                    }}>
                      {pos.side || 'YES'}
                    </span>

                    {/* Entry + Edge */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                        {entryPct}¢
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b' }}>entry</div>
                    </div>

                    {/* Size */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a5b4fc', fontVariantNumeric: 'tabular-nums' }}>
                        ${(pos.size || 0).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b' }}>size</div>
                    </div>
                  </div>
                );
              })}

              {/* Summary bar */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.4rem 0.75rem', borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.08)',
                fontSize: '0.72rem', color: '#64748b',
              }}>
                <span>
                  {positions.length} position{positions.length !== 1 ? 's' : ''} across{' '}
                  {[...new Set(positions.map(p => p.strategy))].length} strateg{[...new Set(positions.map(p => p.strategy))].length !== 1 ? 'ies' : 'y'}
                </span>
                <span style={{ color: '#a5b4fc', fontWeight: 600 }}>
                  {positions.filter(p => p.side === 'YES').length} YES · {positions.filter(p => p.side === 'NO').length} NO
                </span>
              </div>
            </div>
          )}
        </Card>
      </FullWidthSection>

      {/* ════════════════════════════════════════════════════════════════
          3. DATA PIPELINE — Compact source health
          ════════════════════════════════════════════════════════════════ */}
      <FullWidthSection>
        <Card $delay="0.05s">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <CardTitle style={{ marginBottom: 0 }}>
              📡 Data Pipeline
            </CardTitle>
            <span style={{
              fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 600,
              background: sourcesOnline >= 4 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(251, 191, 36, 0.12)',
              color: sourcesOnline >= 4 ? '#22c55e' : '#fbbf24',
              border: `1px solid ${sourcesOnline >= 4 ? 'rgba(34, 197, 94, 0.25)' : 'rgba(251, 191, 36, 0.25)'}`,
            }}>
              {sourcesOnline >= 4 ? 'ALL SYSTEMS GO' : `${sourcesOnline} OF ${sources.length} ONLINE`}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
            {sources.map((src, i) => (
              <div key={i} style={{
                background: src.ok ? 'rgba(16, 185, 129, 0.04)' : 'rgba(0,0,0,0.2)',
                borderRadius: '10px', padding: '0.6rem 0.75rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                border: `1px solid ${src.ok ? 'rgba(34, 197, 94, 0.12)' : 'rgba(100, 116, 139, 0.15)'}`,
                transition: 'all 0.3s ease',
              }}>
                <span style={{ fontSize: '1.1rem' }}>{src.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: src.ok ? '#e2e8f0' : '#475569' }}>{src.name}</div>
                  <div style={{ fontSize: '0.65rem', color: src.ok ? '#34d399' : '#64748b' }}>
                    {src.ok ? src.detail : 'Offline'}
                  </div>
                </div>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: src.ok ? '#22c55e' : '#475569',
                  boxShadow: src.ok ? '0 0 6px rgba(34, 197, 94, 0.6)' : 'none',
                }} />
              </div>
            ))}
          </div>
        </Card>
      </FullWidthSection>

      {/* ════════════════════════════════════════════════════════════════
          4. TOP EDGE SIGNALS — The money section
          ════════════════════════════════════════════════════════════════ */}
      <Card $delay="0.1s" style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <CardTitle style={{ marginBottom: 0 }}>
            🔬 Top Edge Signals
          </CardTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {activeEdges.length > 0 && (
              <Badge $type="running">
                {bPlusEdges.length} B+ · {activeEdges.length - bPlusEdges.length} C+
              </Badge>
            )}
            <span style={{ fontSize: '0.68rem', color: '#64748b', cursor: 'pointer' }} onClick={() => setActiveTab('signals')}>
              View all →
            </span>
          </div>
        </div>
        {/* Filter context — proves the system is working hard */}
        {activeEdges.length > 0 && indEdges.length > activeEdges.length && (
          <div style={{
            fontSize: '0.7rem', color: '#64748b', marginBottom: '0.6rem',
            padding: '0.3rem 0.6rem', background: 'rgba(99,102,241,0.04)', borderRadius: '6px',
            display: 'inline-block',
          }}>
            Showing <strong style={{ color: '#a5b4fc' }}>{Math.min(activeEdges.length, 6)}</strong> of <strong style={{ color: '#94a3b8' }}>{indEdges.length}</strong> signals <span style={{ color: '#475569' }}>(C+ grade, validated)</span>
          </div>
        )}

        {activeEdges.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '1.5rem 1rem',
            background: 'rgba(99, 102, 241, 0.04)', borderRadius: '10px',
            border: '1px solid rgba(99, 102, 241, 0.08)',
          }}>
            {scanStatus?.scanRunning || scanning ? (
              <div>
                <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>⏳</div>
                <div style={{ color: '#a5b4fc', fontSize: '0.85rem', fontWeight: 600 }}>Scanning markets...</div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Analyzing {totalMarkets} markets across Polymarket + Kalshi. Edges appear when mispricing is detected.
                </div>
              </div>
            ) : scanStatus?.lastScan ? (
              <div>
                <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>🔍</div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>No validated edges right now</div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Scanning {totalMarkets} markets every 5 minutes. Last scan {timeSince(scanStatus.lastScan)}.
                  {nextScanCountdown && nextScanCountdown !== 'now' && <> Next in <strong style={{ color: '#a5b4fc' }}>{nextScanCountdown}</strong>.</>}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>🚀</div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Waiting for first scan</div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  The AI scans 500+ prediction markets using 5 independent data sources.
                  First scan starts ~20s after boot.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {activeEdges.length > 0 && indEdges.filter(e => (e.edgeQuality || 0) < 35).length > 0 && activeEdges.length < 3 && (
              <div style={{
                background: 'rgba(251, 191, 36, 0.06)', border: '1px solid rgba(251, 191, 36, 0.15)',
                borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#fbbf24',
              }}>
                Showing C+ grade and above. {indEdges.filter(e => (e.edgeQuality || 0) < 35).length} lower-confidence edges in Sources tab.
              </div>
            )}
            {[...activeEdges]
              .sort((a, b) => (b.edgeQuality || 0) - (a.edgeQuality || 0))
              .slice(0, 6)
              .map((edge, i) => {
              const absDivPct = Math.abs(edge.divergence || 0) * 100;
              const divColor = (edge.divergence || 0) > 0 ? '#22c55e' : '#ef4444';
              const gradeColor = edge.edgeGrade === 'A' ? '#22c55e' : edge.edgeGrade === 'B' ? '#a5b4fc' : edge.edgeGrade === 'C' ? '#fbbf24' : '#ef4444';
              const isBPlus = (edge.edgeQuality || 0) >= 55;
              return (
                <div key={i} style={{
                  background: isBPlus ? 'rgba(99, 102, 241, 0.06)' : 'rgba(0,0,0,0.15)',
                  borderRadius: '10px', padding: '0.75rem',
                  border: `1px solid ${isBPlus ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.08)'}`,
                  transition: 'all 0.2s ease',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: isBPlus ? 600 : 500, flex: 1, lineHeight: 1.3 }}>
                      {(edge.question || '').length > 60 ? edge.question.slice(0, 57) + '...' : edge.question}
                    </span>
                    <span style={{
                      background: `${gradeColor}18`, color: gradeColor,
                      padding: '0.12rem 0.4rem', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 700,
                      border: `1px solid ${gradeColor}35`, flexShrink: 0,
                    }}>
                      {edge.edgeGrade}:{edge.edgeQuality}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.78rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#94a3b8' }}>
                      Mkt <strong style={{ color: '#e2e8f0' }}>{edge.marketPrice != null ? (edge.marketPrice * 100).toFixed(0) + '¢' : '—'}</strong>
                    </span>
                    <span style={{ color: '#94a3b8' }}>
                      Ind <strong style={{ color: '#a5b4fc' }}>{edge.prob != null ? (edge.prob * 100).toFixed(0) + '¢' : '—'}</strong>
                    </span>
                    <span style={{ color: divColor, fontWeight: 700 }}>
                      {absDivPct.toFixed(1)}pp {edge.edgeDirection === 'BUY_YES' ? '↑ YES' : edge.edgeDirection === 'BUY_NO' ? '↓ NO' : ''}
                    </span>
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                        {edge.sourceCount || edge.validatedSourceCount || 0} src
                      </span>
                      <Badge $type={edge.edgeSignal === 'STRONG' ? 'running' : 'simulation'} style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>
                        {edge.edgeSignal}
                      </Badge>
                    </span>
                  </div>
                  {/* Source chips */}
                  {edge.sources && edge.sources.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.35rem' }}>
                      {edge.sources.map((src, si) => {
                        const isHardData = src.key === 'bookmaker' || src.key === 'crypto' || src.key === 'espn' || src.key === 'stock';
                        const chipColor = isHardData ? '#22c55e' : src.key === 'llm' ? '#64748b' : '#a5b4fc';
                        return (
                          <span key={si} style={{
                            background: `${chipColor}10`, color: chipColor,
                            padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.62rem',
                            border: `1px solid ${chipColor}25`,
                          }}>
                            {src.key === 'espn' ? `🏟 ESPN ${(src.prob * 100).toFixed(0)}%` :
                             src.key === 'bookmaker' ? `📊 Books ${(src.prob * 100).toFixed(0)}%` :
                             src.key === 'crypto' ? `₿ Crypto ${(src.prob * 100).toFixed(0)}%` :
                             src.key === 'stock' ? `📉 Stock ${(src.prob * 100).toFixed(0)}%` :
                             src.key === 'polling' ? `🎯 Metaculus ${(src.prob * 100).toFixed(0)}%` :
                             src.key === 'expert' ? `📈 Manifold ${(src.prob * 100).toFixed(0)}%` :
                             src.key === 'kalshi' ? `🏛 Kalshi ${(src.prob * 100).toFixed(0)}%` :
                             `🤖 LLM ${(src.prob * 100).toFixed(0)}%`}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {activeEdges.length > 6 && (
              <div
                style={{ textAlign: 'center', fontSize: '0.78rem', color: '#a5b4fc', cursor: 'pointer', padding: '0.4rem', fontWeight: 600 }}
                onClick={() => setActiveTab('signals')}
              >
                +{activeEdges.length - 6} more edges →
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ════════════════════════════════════════════════════════════════
          5. TRACK RECORD + RISK — Side by side on desktop
          ════════════════════════════════════════════════════════════════ */}

      {/* Track Record */}
      <Card $delay="0.12s">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <CardTitle style={{ marginBottom: 0 }}>📊 Track Record</CardTitle>
          {trackRecord?.summary?.resolvedEdges > 0 && (
            <Badge $type={trackRecord.summary.winRate >= 50 ? 'running' : 'stopped'}>
              {trackRecord.summary.winRate}% WR
            </Badge>
          )}
        </div>

        {(!trackRecord || trackRecord.summary?.resolvedEdges === 0) ? (
          <div style={{
            textAlign: 'center', padding: '1rem 0.5rem',
            background: 'rgba(99, 102, 241, 0.04)', borderRadius: '10px',
          }}>
            <div style={{ fontSize: '1rem', marginBottom: '0.4rem' }}>📈</div>
            <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
              Tracking {trackRecord?.pending || 0} edge{trackRecord?.pending !== 1 ? 's' : ''}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '0.2rem' }}>
              Record builds automatically as markets resolve. Every prediction is tracked.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
              <StatCard>
                <StatValue $color={trackRecord.summary.totalPnLpp >= 0 ? '#22c55e' : '#ef4444'} style={{ fontSize: '1.1rem' }}>
                  {trackRecord.summary.totalPnLpp >= 0 ? '+' : ''}{trackRecord.summary.totalPnLpp}pp
                </StatValue>
                <StatLabel>Total P&L</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue $color="#a5b4fc" style={{ fontSize: '1.1rem' }}>
                  {trackRecord.summary.wins}W-{trackRecord.summary.losses}L
                </StatValue>
                <StatLabel>{trackRecord.summary.resolvedEdges} resolved</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue $color={trackRecord.summary.betterRate >= 50 ? '#22c55e' : '#fbbf24'} style={{ fontSize: '1.1rem' }}>
                  {trackRecord.summary.betterRate || 0}%
                </StatValue>
                <StatLabel>Beat Market</StatLabel>
              </StatCard>
            </div>

            {/* Sparkline */}
            {pnlSpark && pnlSpark.length >= 3 && (
              <div style={{
                background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.5rem 0.6rem',
                border: '1px solid rgba(99,102,241,0.08)',
              }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cumulative P&L</div>
                <Sparkline data={pnlSpark} color={pnl >= 0 ? '#22c55e' : '#ef4444'} width={240} height={40} />
              </div>
            )}

            {trackRecord.hypothetical?.totalBets > 0 && (
              <div style={{
                background: 'rgba(99,102,241,0.06)', borderRadius: '8px',
                padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#94a3b8',
                border: '1px solid rgba(99,102,241,0.12)',
              }}>
                💰 $10/edge × {trackRecord.hypothetical.totalBets} bets = <strong style={{ color: trackRecord.hypothetical.totalReturn >= 0 ? '#22c55e' : '#ef4444' }}>${trackRecord.hypothetical.totalReturn.toFixed(2)}</strong> ({trackRecord.hypothetical.roi}% ROI)
              </div>
            )}

            {trackRecord.recent?.length > 0 && (
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Recent: {trackRecord.recent.slice(0, 4).map((r, i) => (
                  <span key={i} style={{ color: r.pnlPp > 0 ? '#22c55e' : '#ef4444', marginRight: '0.4rem', fontWeight: 600 }}>
                    {r.pnlPp > 0 ? '+' : ''}{r.pnlPp}pp
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Risk Dashboard */}
      <Card $delay="0.14s">
        <CardTitle>🛡️ Risk & Exposure</CardTitle>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {/* Capital deployed */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
              <span style={{ color: '#94a3b8' }}>Capital Deployed</span>
              <span style={{ color: '#e2e8f0', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                ${status?.risk?.totalDeployed?.toFixed(2) || '0.00'} / ${status?.risk?.maxDeployment?.toFixed(2) || '0.00'}
              </span>
            </div>
            <PriceBar>
              <PriceFill $pct={status?.risk?.utilizationPct || 0} />
            </PriceBar>
            <div style={{ fontSize: '0.62rem', color: '#475569', marginTop: '0.2rem' }}>
              {(status?.risk?.utilizationPct || 0).toFixed(0)}% utilized · Max 20% bankroll
            </div>
          </div>

          {/* Daily loss limit */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
              <span style={{ color: '#94a3b8' }}>Daily Loss Buffer</span>
              <span style={{ color: '#e2e8f0', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                ${Math.abs(status?.risk?.dailyPnL || 0).toFixed(2)} / ${status?.risk?.dailyLossLimit?.toFixed(2) || '0.00'}
              </span>
            </div>
            <PriceBar>
              <PriceFill
                $pct={status?.risk?.dailyLossLimit
                  ? Math.min(100, (Math.abs(status?.risk?.dailyPnL || 0) / status.risk.dailyLossLimit) * 100)
                  : 0
                }
              />
            </PriceBar>
          </div>

          {/* Positions + Strategies in compact grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
            <div style={{
              background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.5rem 0.6rem',
              border: '1px solid rgba(99,102,241,0.06)', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#a5b4fc', fontVariantNumeric: 'tabular-nums' }}>
                {positions.length}
              </div>
              <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase' }}>Open Positions</div>
            </div>
            <div style={{
              background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.5rem 0.6rem',
              border: '1px solid rgba(99,102,241,0.06)', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#c084fc', fontVariantNumeric: 'tabular-nums' }}>
                {totalTrades}
              </div>
              <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase' }}>Total Trades</div>
            </div>
          </div>

          {/* Strategy opportunity counts */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {[
              { name: 'NO Bets', count: opportunities.filter(o => o.strategy === 'NO_BETS').length, color: '#34d399', icon: '🛡️' },
              { name: 'Arbitrage', count: opportunities.filter(o => o.strategy === 'ARBITRAGE').length, color: '#a5b4fc', icon: '🔄' },
              { name: 'Statistical', count: opportunities.filter(o => o.strategy === 'SPORTS_EDGE').length, color: '#fbbf24', icon: '📐' },
              { name: 'Momentum', count: opportunities.filter(o => o.strategy === 'MOMENTUM').length, color: '#c084fc', icon: '📈' },
            ].filter(s => s.count > 0).map((s, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                background: `${s.color}10`, border: `1px solid ${s.color}25`,
                borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.68rem', color: s.color, fontWeight: 600,
              }}>
                {s.icon} {s.count} {s.name}
              </span>
            ))}
            {opportunities.length === 0 && (
              <span style={{ fontSize: '0.72rem', color: '#475569' }}>No active opportunities</span>
            )}
          </div>
        </div>
      </Card>

      {/* ════════════════════════════════════════════════════════════════
          6. AI BRAIN — Pattern memory & learning indicator
          ════════════════════════════════════════════════════════════════ */}
      <FullWidthSection>
        <Card $delay="0.15s">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.1))',
                border: '1px solid rgba(139,92,246,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
              }}>🧠</div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0' }}>AI Brain</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Pattern memory &amp; self-calibration</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Patterns learned */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#c084fc', fontVariantNumeric: 'tabular-nums' }}>
                  {learningData?.totalResolved || 0}
                </div>
                <div style={{ fontSize: '0.58rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Patterns</div>
              </div>
              {/* Active adjustments */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#a5b4fc', fontVariantNumeric: 'tabular-nums' }}>
                  {learningData?.adjustments ? Object.keys(learningData.adjustments).length : 0}
                </div>
                <div style={{ fontSize: '0.58rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Adjustments</div>
              </div>
              {/* Confidence / status */}
              <div style={{
                padding: '0.3rem 0.65rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 600,
                background: (learningData?.totalResolved || 0) >= 20
                  ? 'rgba(34,197,94,0.1)' : (learningData?.totalResolved || 0) >= 5
                  ? 'rgba(251,191,36,0.1)' : 'rgba(100,116,139,0.1)',
                color: (learningData?.totalResolved || 0) >= 20
                  ? '#34d399' : (learningData?.totalResolved || 0) >= 5
                  ? '#fbbf24' : '#64748b',
                border: `1px solid ${(learningData?.totalResolved || 0) >= 20
                  ? 'rgba(34,197,94,0.2)' : (learningData?.totalResolved || 0) >= 5
                  ? 'rgba(251,191,36,0.2)' : 'rgba(100,116,139,0.15)'}`,
              }}>
                {(learningData?.totalResolved || 0) >= 50 ? '🟢 High Confidence'
                  : (learningData?.totalResolved || 0) >= 20 ? '🟡 Calibrating'
                  : (learningData?.totalResolved || 0) >= 5 ? '🔵 Learning'
                  : '⚪ Warming Up'}
              </div>
            </div>
          </div>
          {/* Detail line */}
          {(learningData?.adjustments && Object.keys(learningData.adjustments).length > 0) && (
            <div style={{
              marginTop: '0.6rem', padding: '0.4rem 0.65rem', borderRadius: '8px',
              background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.1)',
              fontSize: '0.72rem', color: '#a78bfa', lineHeight: 1.5,
            }}>
              Self-calibrated <strong>{Object.keys(learningData.adjustments).length}</strong> strategy threshold{Object.keys(learningData.adjustments).length !== 1 ? 's' : ''} from {learningData.totalResolved || 0} resolved outcomes. The model adjusts edge detection sensitivity based on what actually wins.
            </div>
          )}
          {(!learningData || (learningData.totalResolved || 0) === 0) && (
            <div style={{
              marginTop: '0.6rem', padding: '0.4rem 0.65rem', borderRadius: '8px',
              background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.08)',
              fontSize: '0.72rem', color: '#64748b', lineHeight: 1.5,
            }}>
              The AI learns from every market resolution — improving edge detection, adjusting thresholds, and calibrating confidence over time. More data = sharper predictions.
            </div>
          )}
        </Card>
      </FullWidthSection>

      {/* ════════════════════════════════════════════════════════════════
          7. LIVE ACTIVITY FEED — Real-time heartbeat
          ════════════════════════════════════════════════════════════════ */}
      <FullWidthSection>
        <Card $delay="0.16s">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <CardTitle style={{ marginBottom: 0 }}>⚡ Live Activity</CardTitle>
            {lastEvent && (
              <span style={{ fontSize: '0.62rem', color: '#475569' }}>
                Last event: {timeSince(lastEvent.timestamp || lastEvent.ts)}
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.3rem' }}>
            {[
              status?.scanner?.lastScan && {
                icon: '🔍', color: '#a5b4fc',
                text: `Scanned ${totalMarkets} markets`,
                detail: timeSince(status.scanner.lastScan),
              },
              activeEdges.length > 0 && {
                icon: '🔬', color: '#22c55e',
                text: `${activeEdges.length} validated edge${activeEdges.length !== 1 ? 's' : ''} live`,
                detail: `${bPlusEdges.length} B+`,
              },
              opportunities.length > 0 && {
                icon: '🎯', color: '#c084fc',
                text: `${opportunities.length} opportunit${opportunities.length !== 1 ? 'ies' : 'y'} queued`,
                detail: opportunities.slice(0, 2).map(o => o.strategy.replace('_', ' ')).join(', '),
              },
              positions.length > 0 && {
                icon: '💼', color: '#818cf8',
                text: `${positions.length} open position${positions.length !== 1 ? 's' : ''}`,
                detail: `$${positions.reduce((s, p) => s + (p.size || 0), 0).toFixed(0)} deployed`,
              },
              learningData?.totalResolved > 0 && {
                icon: '🧠', color: '#c084fc',
                text: `AI learned from ${learningData.totalResolved} resolutions`,
                detail: learningData.adjustments ? 'Thresholds active' : 'Training',
              },
              {
                icon: '💰', color: (performance?.totalPnL || 0) >= 0 ? '#22c55e' : '#ef4444',
                text: `P&L: ${fmtPnL(performance?.totalPnL)}`,
                detail: `${totalTrades} trades`,
              },
            ].filter(Boolean).map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.35rem 0.6rem', borderRadius: '8px',
                background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(99,102,241,0.06)',
              }}>
                <span style={{ fontSize: '0.78rem', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: '0.75rem', color: '#cbd5e1', flex: 1 }}>{item.text}</span>
                <span style={{ fontSize: '0.65rem', color: item.color, fontWeight: 600, flexShrink: 0 }}>{item.detail}</span>
              </div>
            ))}
          </div>
        </Card>
      </FullWidthSection>
    </Grid>
  );
});

OverviewTab.displayName = 'OverviewTab';
export default OverviewTab;
