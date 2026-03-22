import React, { useState, useMemo, useCallback } from 'react';
import {
  Card, CardTitle, Input, Badge, Chip, FullWidthSection,
} from './SharedStyles';

/* ════════════════════════════════════════════════════════════════════════
   SIGNALS TAB — World-class edge signal explorer
   ════════════════════════════════════════════════════════════════════════ */

const STRATEGIES = ['TOP_5', 'ALL', 'NO_BETS', 'ARBITRAGE', 'SPORTS_EDGE'];
const STRAT_META = {
  TOP_5:       { icon: '🏆', label: 'Top 5',     color: '#fcd34d' },
  ALL:         { icon: '🌐', label: 'All',        color: '#e2e8f0' },
  NO_BETS:     { icon: '🟢', label: 'NO Bets',    color: '#34d399' },
  ARBITRAGE:   { icon: '🔵', label: 'Arbitrage',  color: '#a5b4fc' },
  SPORTS_EDGE: { icon: '🟡', label: 'Spread',     color: '#fbbf24' },
};
const SORT_OPTIONS = [
  { key: 'score',  label: 'Score' },
  { key: 'edge',   label: 'Edge %' },
  { key: 'volume', label: 'Volume' },
  { key: 'size',   label: 'Size' },
];

/* helper fns */
const fmt$ = (v) => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(1) + 'K' : (v || 0).toFixed(0);
const edgePct = (opp) => {
  const e = opp.edge || {};
  return (e.edgeAfterCosts || e.net || e.raw || 0) * 100;
};

const SignalsTab = React.memo(({ ctx }) => {
  const {
    filteredOpps, oppsFilter, setOppsFilter, connected, isRunning,
    signalSearch, setSignalSearch, addToWatchlist, setTradeModal, setTradeSide,
    opportunities = [],
  } = ctx;

  const [sortBy, setSortBy] = useState('score');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedId, setExpandedId] = useState(null);

  /* sort */
  const sorted = useMemo(() => {
    const arr = [...filteredOpps];
    const dir = sortDir === 'desc' ? -1 : 1;
    arr.sort((a, b) => {
      if (sortBy === 'score') return dir * ((b.score || 0) - (a.score || 0));
      if (sortBy === 'edge') return dir * (edgePct(b) - edgePct(a));
      if (sortBy === 'volume') return dir * ((b.volume24hr || 0) - (a.volume24hr || 0));
      if (sortBy === 'size') return dir * ((b.positionSize || 0) - (a.positionSize || 0));
      return 0;
    });
    return arr;
  }, [filteredOpps, sortBy, sortDir]);

  const toggleSort = useCallback((key) => {
    if (sortBy === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(key); setSortDir('desc'); }
  }, [sortBy]);

  /* aggregate stats */
  const stats = useMemo(() => {
    const all = opportunities;
    const avgScore = all.length > 0 ? all.reduce((s, o) => s + (o.score || 0), 0) / all.length : 0;
    const bestEdge = all.length > 0 ? Math.max(...all.map(o => edgePct(o))) : 0;
    const totalOpp = all.reduce((s, o) => s + (o.positionSize || 0), 0);
    const byStrat = {};
    all.forEach(o => { byStrat[o.strategy] = (byStrat[o.strategy] || 0) + 1; });
    return { total: all.length, avgScore, bestEdge, totalOpp, byStrat };
  }, [opportunities]);

  return (
    <>
      {/* 1. STATS HERO STRIP */}
      <FullWidthSection>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.5rem', marginBottom: '0rem',
        }}>
          {[
            { label: 'Total Signals', value: stats.total, color: '#e2e8f0', icon: '📡' },
            { label: 'Avg Score', value: stats.avgScore.toFixed(0) + '/100', color: stats.avgScore >= 60 ? '#34d399' : stats.avgScore >= 40 ? '#fbbf24' : '#f87171', icon: '📊' },
            { label: 'Best Edge', value: stats.bestEdge.toFixed(1) + '%', color: '#a5b4fc', icon: '💎' },
            { label: 'Total Opportunity', value: '$' + fmt$(stats.totalOpp), color: '#fbbf24', icon: '💰' },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'rgba(15, 15, 26, 0.6)', border: '1px solid rgba(99, 102, 241, 0.12)',
              borderRadius: '12px', padding: '0.75rem 0.85rem',
              display: 'flex', flexDirection: 'column', gap: '0.15rem',
            }}>
              <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>{s.icon}</span> {s.label}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums' }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </FullWidthSection>

      {/* 2. MAIN SIGNALS CARD */}
      <FullWidthSection>
        <Card $delay="0.1s">
          <CardTitle>🎯 Edge Signals</CardTitle>

          {/* Filter bar with counts */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
            {STRATEGIES.map((f) => {
              const meta = STRAT_META[f];
              const count = f === 'TOP_5' ? Math.min(5, opportunities.length)
                : f === 'ALL' ? opportunities.length
                : (stats.byStrat[f] || 0);
              return (
                <button key={f} onClick={() => setOppsFilter(f)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.35rem 0.7rem', borderRadius: '8px', cursor: 'pointer', border: 'none',
                  fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s',
                  background: oppsFilter === f ? (meta.color + '18') : 'rgba(30, 41, 59, 0.4)',
                  color: oppsFilter === f ? meta.color : '#94a3b8',
                  outline: oppsFilter === f ? ('1.5px solid ' + meta.color + '40') : '1px solid rgba(99,102,241,0.08)',
                }}>
                  <span>{meta.icon}</span>
                  <span>{meta.label}</span>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 700, padding: '0.05rem 0.3rem',
                    borderRadius: '6px', minWidth: '18px', textAlign: 'center',
                    background: oppsFilter === f ? (meta.color + '20') : 'rgba(99,102,241,0.06)',
                    color: oppsFilter === f ? meta.color : '#64748b',
                  }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Search + Sort controls */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 200px', position: 'relative' }}>
              <Input type="text" placeholder="Search signals by market name..."
                value={signalSearch} onChange={(e) => setSignalSearch(e.target.value)}
                $width="100%" style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem 0.4rem 1.8rem' }}
                aria-label="Search signals" />
              <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', pointerEvents: 'none' }}>🔍</span>
              {signalSearch && (
                <button onClick={() => setSignalSearch('')} style={{
                  position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '4px', color: '#f87171', fontSize: '0.65rem', padding: '0.1rem 0.3rem', cursor: 'pointer',
                }}>✕</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', marginRight: '0.15rem' }}>Sort:</span>
              {SORT_OPTIONS.map(o => (
                <button key={o.key} onClick={() => toggleSort(o.key)} style={{
                  padding: '0.25rem 0.5rem', borderRadius: '6px', cursor: 'pointer',
                  border: sortBy === o.key ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(99,102,241,0.08)',
                  background: sortBy === o.key ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: sortBy === o.key ? '#a5b4fc' : '#64748b',
                  fontSize: '0.68rem', fontWeight: 600, transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: '0.2rem',
                }}>
                  {o.label}
                  {sortBy === o.key && (
                    <span style={{ fontSize: '0.6rem' }}>{sortDir === 'desc' ? '▼' : '▲'}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Strategy explainer */}
          {oppsFilter !== 'ALL' && oppsFilter !== 'TOP_5' && (
            <div style={{
              background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(148, 163, 184, 0.08)',
              borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '0.75rem',
              fontSize: '0.76rem', lineHeight: '1.5', color: '#94a3b8',
            }}>
              {oppsFilter === 'NO_BETS' && (
                <><span style={{ fontWeight: 600, color: '#34d399' }}>🟢 NO Bets</span> &mdash; Sells insurance on events that are very likely to happen. When a market shows 92%+ probability, the NO side trades at 1&ndash;8&cent;. Uses Kelly Criterion to size positions.</>
              )}
              {oppsFilter === 'ARBITRAGE' && (
                <><span style={{ fontWeight: 600, color: '#a5b4fc' }}>🔵 Arbitrage</span> &mdash; Finds pricing inconsistencies between related markets. Groups related outcomes by slug pattern. Deviations from 100% total implied probability = guaranteed profit.</>
              )}
              {oppsFilter === 'SPORTS_EDGE' && (
                <><span style={{ fontWeight: 600, color: '#fbbf24' }}>🟡 Spread Trading</span> &mdash; Captures the bid&ndash;ask spread on markets with wide gaps (2&ndash;15%). Detects momentum and bookmaker divergence for directional plays.</>
              )}
            </div>
          )}

          {/* Result count context line */}
          {sorted.length > 0 && (
            <div style={{ fontSize: '0.7rem', color: '#475569', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                Showing <strong style={{ color: '#94a3b8' }}>{sorted.length}</strong> signal{sorted.length !== 1 ? 's' : ''}
                {signalSearch && <span> matching &ldquo;<em style={{ color: '#a5b4fc' }}>{signalSearch}</em>&rdquo;</span>}
                {oppsFilter !== 'ALL' && oppsFilter !== 'TOP_5' && (
                  <span> &middot; {STRAT_META[oppsFilter]?.label} strategy</span>
                )}
              </span>
              <span>sorted by {SORT_OPTIONS.find(o => o.key === sortBy)?.label} {sortDir === 'desc' ? '↓' : '↑'}</span>
            </div>
          )}

          {/* SIGNAL CARDS */}
          {sorted.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '2rem 1rem',
              background: 'rgba(99, 102, 241, 0.04)', borderRadius: '12px',
              border: '1px solid rgba(99, 102, 241, 0.08)',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                {!connected ? '🔌' : !isRunning ? '⏸️' : '🔍'}
              </div>
              <div style={{ fontWeight: 600, color: '#94a3b8', fontSize: '0.9rem' }}>
                {!connected ? 'Connect to the bot server first'
                  : !isRunning ? 'Start the scanner to find edges'
                  : 'Scanning for opportunities...'}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                {!connected ? 'Check your server URL in settings.'
                  : !isRunning ? 'Hit Start on the Overview tab, then come back.'
                  : 'Results will stream in as the AI analyzes markets.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {sorted.map((opp, i) => (
                <SignalCard
                  key={`${opp.conditionId}-${opp.strategy}-${i}`}
                  opp={opp}
                  rank={oppsFilter === 'TOP_5' ? i : null}
                  expanded={expandedId === `${opp.conditionId}-${opp.strategy}`}
                  onToggle={() => setExpandedId(
                    expandedId === `${opp.conditionId}-${opp.strategy}` ? null : `${opp.conditionId}-${opp.strategy}`
                  )}
                  addToWatchlist={addToWatchlist}
                  setTradeModal={setTradeModal}
                  setTradeSide={setTradeSide}
                />
              ))}
            </div>
          )}
        </Card>
      </FullWidthSection>
    </>
  );
});

/* ════════════════════════════════════════════════════════
   SIGNAL CARD — interactive, expandable, feature-rich
   ════════════════════════════════════════════════════════ */
// eslint-disable-next-line no-unused-vars
const SignalCard = React.memo(({ opp, rank, expanded, onToggle, addToWatchlist, setTradeModal, setTradeSide }) => {
  const edge = opp.edge || {};
  const model = opp.model || {};
  const isArb = opp.strategy === 'ARBITRAGE';
  const isNO = opp.strategy === 'NO_BETS';
  const isSE = opp.strategy === 'SPORTS_EDGE';
  const ep = edgePct(opp);
  const entryPrice = isArb
    ? (opp.yesPrice || opp.noPrice || opp.markets?.[0]?.yesPrice || null)
    : isNO ? opp.noPrice : (opp.side === 'YES' ? opp.yesPrice : opp.noPrice);
  const sideColor = (opp.side === 'YES' || isArb) ? '#22c55e' : '#ef4444';
  const sideLabel = isArb ? 'MULTI' : (opp.side || 'YES');
  const rankColors = ['#fcd34d', '#c0c0c0', '#cd7f32', '#a5b4fc', '#818cf8'];

  return (
    <div style={{
      background: rank === 0
        ? 'linear-gradient(135deg, rgba(30, 30, 55, 0.95), rgba(25, 25, 45, 0.95))'
        : 'rgba(15, 15, 26, 0.5)',
      border: rank === 0 ? '1.5px solid rgba(252, 211, 77, 0.35)' : '1px solid rgba(99, 102, 241, 0.1)',
      borderRadius: '12px', overflow: 'hidden', transition: 'all 0.2s',
    }}>
      {/* Collapsed Header Row */}
      <div
        onClick={onToggle}
        style={{
          display: 'grid',
          gridTemplateColumns: rank !== null ? '32px 1fr auto auto auto auto auto' : '1fr auto auto auto auto auto',
          gap: '0.5rem', alignItems: 'center', padding: '0.7rem 0.85rem', cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Rank */}
        {rank !== null && (
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: (rankColors[rank] || '#818cf8') + '15',
            border: '1.5px solid ' + (rankColors[rank] || '#818cf8'),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '0.8rem', color: rankColors[rank] || '#818cf8',
            flexShrink: 0,
          }}>{rank + 1}</div>
        )}

        {/* Market name + strategy + platform */}
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontWeight: 600, color: '#e2e8f0', fontSize: '0.82rem', lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {opp.market || 'Unknown Market'}
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginTop: '0.15rem', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.58rem', fontWeight: 700, padding: '0.05rem 0.3rem', borderRadius: '3px',
              background: opp.platform === 'KALSHI' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)',
              color: opp.platform === 'KALSHI' ? '#60a5fa' : '#a78bfa',
              border: '1px solid ' + (opp.platform === 'KALSHI' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(139, 92, 246, 0.2)'),
            }}>{opp.platform === 'KALSHI' ? 'KALSHI' : 'POLY'}</span>
            <Chip $strategy={opp.strategy}>
              {isNO ? 'NO BETS' : isArb ? 'ARB' : 'SPREAD'}
            </Chip>
            <Badge $type={opp.confidence?.toLowerCase()}>{opp.confidence || '—'}</Badge>
          </div>
        </div>

        {/* Side badge */}
        <span style={{
          fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem',
          borderRadius: '5px', flexShrink: 0,
          background: sideColor + '15', color: sideColor,
          border: '1px solid ' + sideColor + '25',
        }}>{sideLabel}</span>

        {/* Entry price */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
            {entryPrice ? ((entryPrice * 100).toFixed(0) + '¢') : '—'}
          </div>
          <div style={{ fontSize: '0.55rem', color: '#475569', textTransform: 'uppercase' }}>entry</div>
        </div>

        {/* Edge */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: ep >= 5 ? '#34d399' : ep >= 2 ? '#fbbf24' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
            {ep.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.55rem', color: '#475569', textTransform: 'uppercase' }}>edge</div>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontSize: '0.82rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
            color: opp.score >= 70 ? '#34d399' : opp.score >= 50 ? '#fbbf24' : '#f87171',
          }}>
            {opp.score || 0}
          </div>
          <div style={{ fontSize: '0.55rem', color: '#475569', textTransform: 'uppercase' }}>score</div>
        </div>

        {/* Expand chevron */}
        <span style={{
          fontSize: '0.7rem', color: '#475569', transition: 'transform 0.2s',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0,
        }}>▼</span>
      </div>

      {/* Expanded Detail Panel */}
      {expanded && (
        <div style={{
          padding: '0 0.85rem 0.85rem',
          borderTop: '1px solid rgba(99, 102, 241, 0.08)',
        }}>
          {/* Action box */}
          <div style={{
            background: 'rgba(52, 211, 153, 0.06)', border: '1px solid rgba(52, 211, 153, 0.2)',
            borderRadius: '10px', padding: '0.7rem 0.9rem', marginTop: '0.65rem', marginBottom: '0.6rem',
          }}>
            {isArb && (
              <>
                <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  📋 Buy YES on all {opp.markets?.length || '?'} outcomes
                </div>
                <div style={{ color: '#a7f3d0', fontSize: '0.78rem', lineHeight: 1.5 }}>
                  {opp.riskLevel === 'LOW'
                    ? 'Guaranteed arbitrage — the combined cost of all YES shares is less than $1.00.'
                    : `⚠️ Incomplete coverage — only ${opp.completeness?.marketsInGroup || '?'}/${opp.completeness?.totalInEvent || '?'} outcomes tracked.`}
                </div>
                <div style={{ color: '#86efac', fontSize: '0.78rem', marginTop: '0.3rem' }}>
                  💰 Spend ~${((1 - (edge.raw || 0)) * (opp.positionSize || 30)).toFixed(2)} → collect ${opp.positionSize || 30} → <strong style={{ color: '#34d399' }}>${(opp.expectedProfit || 0).toFixed(2)} profit</strong> ({((edge.net || 0) * 100).toFixed(1)}% return)
                </div>
              </>
            )}
            {isNO && (
              <>
                <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  📋 BUY NO @ {entryPrice ? ((entryPrice * 100).toFixed(1) + '¢') : '—'}
                </div>
                <div style={{ color: '#a7f3d0', fontSize: '0.78rem', lineHeight: 1.5 }}>
                  Betting this event <strong>won&apos;t happen</strong>. Model estimates {((model.estimatedNoProb || 0) * 100).toFixed(1)}% chance it resolves NO, but market prices NO at only {((opp.noPrice || 0) * 100).toFixed(1)}¢.
                </div>
                <div style={{ color: '#86efac', fontSize: '0.78rem', marginTop: '0.3rem' }}>
                  💰 Buy ${opp.positionSize?.toFixed(2) || '—'} → profit ${(1 - (opp.noPrice || 0)).toFixed(2)}/share if NO. Net EV: <strong style={{ color: '#34d399' }}>${(edge.netEV || 0).toFixed(2)} per $100</strong>
                </div>
              </>
            )}
            {isSE && (
              <>
                <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  📋 BUY {opp.side || '—'} @ {entryPrice ? ((entryPrice * 100).toFixed(1) + '¢') : '—'}
                </div>
                <div style={{ color: '#a7f3d0', fontSize: '0.78rem', lineHeight: 1.5 }}>
                  Statistical signals detected
                  {opp.signals?.length > 0 && <span> — {opp.signals.slice(0, 3).map(s => s.type?.replace(/_/g, ' ').toLowerCase() || 'signal').join(', ')}</span>}
                  .{opp.bookmaker ? ` Bookmaker consensus: ${((opp.bookmaker.consensusProb || 0) * 100).toFixed(1)}%` : ''}
                </div>
                <div style={{ color: '#86efac', fontSize: '0.78rem', marginTop: '0.3rem' }}>
                  💰 Position: ${opp.positionSize?.toFixed(2) || '—'} → Net edge: <strong style={{ color: '#34d399' }}>{((edge.edgeAfterCosts || 0) * 100).toFixed(2)}%</strong> after fees
                </div>
              </>
            )}
          </div>

          {/* Arb legs */}
          {isArb && opp.markets && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.12)',
              borderRadius: '8px', padding: '0.55rem 0.75rem', marginBottom: '0.5rem', fontSize: '0.78rem',
            }}>
              <div style={{ fontWeight: 600, color: '#a5b4fc', marginBottom: '0.35rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Trade Legs</div>
              {opp.markets.map((leg, j) => (
                <div key={j} style={{ color: '#cbd5e1', padding: '0.15rem 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{j + 1}. BUY YES — {leg.question?.length > 50 ? leg.question.slice(0, 47) + '...' : leg.question}</span>
                  <span style={{ color: '#a5b4fc', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>@ {((leg.yesPrice || 0) * 100).toFixed(0)}¢</span>
                </div>
              ))}
            </div>
          )}

          {/* Metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.4rem', marginBottom: '0.5rem' }}>
            {isArb && (
              <>
                <MetricTile label="Underround" value={((edge.raw || 0) * 100).toFixed(1) + '%'} color="#a5b4fc" />
                <MetricTile label="Net Edge" value={((edge.net || 0) * 100).toFixed(1) + '%'} color="#34d399" />
                <MetricTile label="Expected $" value={'$' + (opp.expectedProfit || 0).toFixed(2)} color="#fbbf24" />
                <MetricTile label="Fees+Slip" value={(((edge.feeOnProfit || 0) + (edge.slippage || 0)) * 100).toFixed(2) + '%'} color="#94a3b8" />
              </>
            )}
            {isNO && (
              <>
                <MetricTile label="Net Edge" value={((edge.edgeAfterCosts || 0) * 100).toFixed(2) + '%'} color="#34d399" />
                <MetricTile label="Model NO%" value={((model.estimatedNoProb || 0) * 100).toFixed(1) + '%'} color="#a5b4fc" />
                <MetricTile label="Net EV/$100" value={'$' + (edge.netEV || 0).toFixed(2)} color="#fbbf24" />
                <MetricTile label="Vol 24h" value={'$' + fmt$(opp.volume24hr || 0)} color="#94a3b8" />
              </>
            )}
            {isSE && (
              <>
                <MetricTile label="Net Edge" value={((edge.edgeAfterCosts || 0) * 100).toFixed(2) + '%'} color="#fbbf24" />
                <MetricTile label="Entry" value={entryPrice ? ((entryPrice * 100).toFixed(1) + '¢') : '—'} color="#34d399" />
                <MetricTile label="Liquidity" value={'$' + fmt$(opp.liquidity || 0)} color="#a5b4fc" />
                <MetricTile label="Vol 24h" value={'$' + fmt$(opp.volume24hr || 0)} color="#94a3b8" />
              </>
            )}
            <MetricTile label="Position Size" value={'$' + (opp.positionSize || 0).toFixed(2)} color="#818cf8" />
            <MetricTile label="Score" value={(opp.score || 0) + '/100'}
              color={opp.score >= 70 ? '#34d399' : opp.score >= 50 ? '#fbbf24' : '#f87171'} />
          </div>

          {/* Bookmaker comparison */}
          {opp.bookmaker && (
            <div style={{
              background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.15)',
              borderRadius: '8px', padding: '0.55rem 0.75rem', marginBottom: '0.5rem',
            }}>
              <div style={{ fontWeight: 600, color: '#fbbf24', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.3rem' }}>
                📊 Bookmaker Comparison — {opp.bookmaker.matchedEvent}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.35rem' }}>
                <div>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase' }}>Polymarket</div>
                  <div style={{ fontWeight: 700, color: '#a5b4fc', fontSize: '0.9rem' }}>
                    {(((opp.side === 'YES' ? opp.yesPrice : opp.noPrice) || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase' }}>Bookmaker Avg</div>
                  <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.9rem' }}>
                    {((opp.bookmaker.consensusProb || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase' }}>Divergence</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: Math.abs(opp.bookmaker.divergence) >= 0.05 ? '#34d399' : '#fbbf24' }}>
                    {opp.bookmaker.divergence > 0 ? '+' : ''}{((opp.bookmaker.divergence || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              {opp.bookmaker.pinnacleProb && (
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  Pinnacle (sharpest): {(opp.bookmaker.pinnacleProb * 100).toFixed(1)}% &middot; From {opp.bookmaker.bookmakerCount} books
                </div>
              )}
            </div>
          )}

          {/* News factor */}
          {isNO && model.newsData && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.1)',
              borderRadius: '8px', padding: '0.45rem 0.75rem', marginBottom: '0.5rem',
              fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: '0.5rem', alignItems: 'center',
            }}>
              <span>📰</span>
              <span>{model.newsData.headlines || 0} headlines, sentiment {(model.newsData.sentiment || 0) > 0 ? '+' : ''}{(model.newsData.sentiment || 0).toFixed(1)}</span>
            </div>
          )}

          {/* Risk assessment */}
          {opp.riskLevel && (
            <div style={{
              background: opp.riskLevel === 'HIGH' ? 'rgba(239,68,68,0.06)' : opp.riskLevel === 'MEDIUM' ? 'rgba(251,191,36,0.06)' : 'rgba(52,211,153,0.06)',
              border: '1px solid ' + (opp.riskLevel === 'HIGH' ? 'rgba(239,68,68,0.2)' : opp.riskLevel === 'MEDIUM' ? 'rgba(251,191,36,0.2)' : 'rgba(52,211,153,0.2)'),
              borderRadius: '8px', padding: '0.45rem 0.75rem', marginBottom: '0.5rem',
              fontSize: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
            }}>
              <span>{opp.riskLevel === 'HIGH' ? '🔴' : opp.riskLevel === 'MEDIUM' ? '🟡' : '🟢'}</span>
              <div>
                <span style={{ fontWeight: 700, color: opp.riskLevel === 'HIGH' ? '#ef4444' : opp.riskLevel === 'MEDIUM' ? '#fbbf24' : '#34d399' }}>
                  Risk: {opp.riskLevel}
                </span>
                {opp.riskNote && <span style={{ color: '#94a3b8', marginLeft: '0.4rem' }}>{opp.riskNote}</span>}
                {isArb && opp.completeness && (
                  <span style={{ color: '#64748b', marginLeft: '0.3rem' }}>
                    &middot; Coverage: {opp.completeness.marketsInGroup}/{opp.completeness.totalInEvent}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Footer: expiry + actions */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: '0.4rem', flexWrap: 'wrap', gap: '0.4rem',
          }}>
            <div style={{ fontSize: '0.7rem', color: '#475569' }}>
              {opp.endDate && (
                <span>⏰ {new Date(opp.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button onClick={(e) => { e.stopPropagation(); addToWatchlist(opp); }} style={{
                padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer',
                background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)',
                color: '#fbbf24', fontSize: '0.7rem', fontWeight: 600, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251, 191, 36, 0.08)'; }}>
                ⭐ Watch
              </button>
              <button onClick={(e) => { e.stopPropagation(); setTradeModal(opp); setTradeSide(opp.side || 'YES'); }} style={{
                padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer',
                background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 600, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)'; }}>
                📝 Paper Trade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

/* Metric tile micro-component */
const MetricTile = ({ label, value, color }) => (
  <div style={{
    background: color + '08', borderRadius: '8px', padding: '0.4rem 0.6rem',
    border: '1px solid ' + color + '12',
  }}>
    <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    <div style={{ fontSize: '1rem', fontWeight: 700, color: color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
  </div>
);

SignalCard.displayName = 'SignalCard';
SignalsTab.displayName = 'SignalsTab';
export default SignalsTab;
