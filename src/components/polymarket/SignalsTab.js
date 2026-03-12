import React from 'react';
import {
  Card, CardTitle, Button, Input, Table, TableRow, EmptyState, Badge, Chip,
} from './SharedStyles';

const SignalsTab = React.memo(({ ctx }) => {
  const {
    filteredOpps, oppsFilter, setOppsFilter, connected, isRunning,
    signalSearch, setSignalSearch, addToWatchlist, setTradeModal, setTradeSide,
  } = ctx;

  return (
    <Card $delay="0.1s">
      <CardTitle>🎯 Live Opportunities ({filteredOpps.length})</CardTitle>

      <div style={{
        background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)',
        borderRadius: '10px', padding: '0.6rem 0.9rem', fontSize: '0.8rem',
        color: '#a5b4fc', lineHeight: '1.5', marginBottom: '0.75rem',
      }}>
        💡 <strong>Filter by strategy</strong> below to focus on one approach. Click a strategy to learn how it works. Opportunities are ranked by <strong>score</strong> — higher is better. Run a <strong>Scan</strong> from the Overview tab to refresh.
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {['TOP_5', 'ALL', 'NO_BETS', 'ARBITRAGE', 'SPORTS_EDGE'].map((f) => (
          <Button key={f} $variant={oppsFilter === f ? 'primary' : 'ghost'}
            onClick={() => setOppsFilter(f)}
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
            {f === 'TOP_5' ? '🏆 Top 5' : f === 'ALL' ? '🌐 All' : f === 'NO_BETS' ? '🟢 NO Bets' : f === 'ARBITRAGE' ? '🔵 Arbitrage' : '🟡 Spread'}
          </Button>
        ))}
      </div>

      {/* Signal Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <Input type="text" placeholder="🔍 Search signals by market name..." value={signalSearch}
          onChange={(e) => setSignalSearch(e.target.value)}
          $width="100%" style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}
          aria-label="Search signals" />
        {signalSearch && (
          <Button $variant="ghost" onClick={() => setSignalSearch('')} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', flexShrink: 0 }}>✕</Button>
        )}
      </div>

      {/* Strategy Info Panel */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(148, 163, 184, 0.1)',
        borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem',
        fontSize: '0.78rem', lineHeight: '1.5', color: '#94a3b8',
      }}>
        {oppsFilter === 'TOP_5' && (
          <>
            <div style={{ fontWeight: 600, color: '#fcd34d', marginBottom: '0.3rem' }}>🏆 Top 5 Trades — Best Pick Per Strategy</div>
            <div>The <strong style={{ color: '#e2e8f0' }}>5 highest-scoring opportunities</strong> across every strategy. These are the bot&apos;s strongest conviction trades based on edge size, signal confluence, liquidity, and confidence.</div>
          </>
        )}
        {oppsFilter === 'ALL' && (
          <>
            <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.3rem' }}>🌐 All Strategies</div>
            <div>Shows every opportunity found across all 4 strategies, ranked by score.</div>
          </>
        )}
        {oppsFilter === 'NO_BETS' && (
          <>
            <div style={{ fontWeight: 600, color: '#34d399', marginBottom: '0.3rem' }}>🟢 NO Bets — Systematic Risk Underwriting</div>
            <div style={{ marginBottom: '0.4rem' }}>Sells insurance on events that are <strong style={{ color: '#e2e8f0' }}>very likely to happen</strong>. When a market shows 92%+ probability, the NO side trades at ¢1–8.</div>
            <div><strong style={{ color: '#cbd5e1' }}>How it works:</strong> Uses Kelly Criterion to size positions based on edge vs. implied probability.</div>
          </>
        )}
        {oppsFilter === 'ARBITRAGE' && (
          <>
            <div style={{ fontWeight: 600, color: '#a5b4fc', marginBottom: '0.3rem' }}>🔵 Arbitrage — Cross-Market Mispricing</div>
            <div style={{ marginBottom: '0.4rem' }}>Finds <strong style={{ color: '#e2e8f0' }}>pricing inconsistencies</strong> between related markets.</div>
            <div><strong style={{ color: '#cbd5e1' }}>How it works:</strong> Groups related markets by slug pattern. Calculates total implied probability — deviations from 100% = arb.</div>
          </>
        )}
        {oppsFilter === 'SPORTS_EDGE' && (
          <>
            <div style={{ fontWeight: 600, color: '#fbbf24', marginBottom: '0.3rem' }}>🟡 Spread Trading — Market Making &amp; Momentum</div>
            <div style={{ marginBottom: '0.4rem' }}>Captures the <strong style={{ color: '#e2e8f0' }}>bid-ask spread</strong> on markets with wide gaps.</div>
            <div><strong style={{ color: '#cbd5e1' }}>How it works:</strong> Identifies markets where the spread is 2–15% and liquidity is sufficient.</div>
          </>
        )}
      </div>

      {/* Top 5 Detailed Cards */}
      {oppsFilter === 'TOP_5' && filteredOpps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
          {filteredOpps.map((opp, i) => {
            const edge = opp.edge || {};
            const model = opp.model || {};
            const isArb = opp.strategy === 'ARBITRAGE';
            const isNO = opp.strategy === 'NO_BETS';
            const isSE = opp.strategy === 'SPORTS_EDGE';
            const entryPrice = isArb
              ? (opp.yesPrice || opp.noPrice || opp.markets?.[0]?.yesPrice || null)
              : isNO ? opp.noPrice : (opp.side === 'YES' ? opp.yesPrice : opp.noPrice);
            const rankColors = ['#fcd34d', '#c0c0c0', '#cd7f32', '#a5b4fc', '#a5b4fc'];
            return (
              <div key={`top5-${i}`} style={{
                background: 'linear-gradient(135deg, rgba(30, 30, 55, 0.95), rgba(20, 20, 40, 0.95))',
                border: i === 0 ? '1.5px solid rgba(252, 211, 77, 0.5)' : '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '14px', padding: '1.25rem', position: 'relative', overflow: 'hidden',
              }}>
                {/* Rank badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: `linear-gradient(135deg, ${rankColors[i]}33, ${rankColors[i]}11)`,
                    border: `2px solid ${rankColors[i]}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '1rem', color: rankColors[i],
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem', lineHeight: 1.3 }}>
                      {opp.market?.length > 80 ? opp.market.slice(0, 77) + '...' : opp.market}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.3rem' }}>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '4px',
                        background: opp.platform === 'KALSHI' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                        color: opp.platform === 'KALSHI' ? '#60a5fa' : '#a78bfa',
                        border: `1px solid ${opp.platform === 'KALSHI' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
                        letterSpacing: '0.05em',
                      }}>{opp.platform === 'KALSHI' ? 'KALSHI' : 'POLY'}</span>
                      <Chip $strategy={opp.strategy}>
                        {isNO ? 'NO BETS' : isArb ? 'ARBITRAGE' : 'SPORTS EDGE'}
                      </Chip>
                      <Badge $type={opp.confidence?.toLowerCase()}>{opp.confidence || '—'}</Badge>
                      <span style={{ color: opp.score >= 70 ? '#34d399' : opp.score >= 50 ? '#fbbf24' : '#f87171', fontWeight: 700, fontSize: '0.85rem' }}>
                        Score: {opp.score}/100
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action box */}
                <div style={{
                  background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.25)',
                  borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '0.75rem',
                }}>
                  {isArb && (
                    <>
                      <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                        📋 Action: Buy YES on all {opp.markets?.length || '?'} outcomes in this event
                      </div>
                      <div style={{ color: '#a7f3d0', fontSize: '0.82rem', lineHeight: 1.5 }}>
                        {opp.riskLevel === 'LOW'
                          ? 'This is a guaranteed arbitrage — the combined cost of all YES shares is less than $1.00.'
                          : `⚠️ INCOMPLETE coverage — only ${opp.completeness?.marketsInGroup || '?'}/${opp.completeness?.totalInEvent || '?'} outcomes tracked.`}
                      </div>
                      <div style={{ color: '#86efac', fontSize: '0.82rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
                        💰 Spend ~${((1 - (edge.raw || 0)) * (opp.positionSize || 30)).toFixed(2)} → collect ${opp.positionSize || 30} → <strong style={{ color: '#34d399' }}>${(opp.expectedProfit || 0).toFixed(2)} profit</strong> ({((edge.net || 0) * 100).toFixed(1)}% return)
                      </div>
                    </>
                  )}
                  {isNO && (
                    <>
                      <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                        📋 Action: BUY NO shares @ ${entryPrice?.toFixed(4) || '—'} each
                      </div>
                      <div style={{ color: '#a7f3d0', fontSize: '0.82rem', lineHeight: 1.5 }}>
                        You&apos;re betting this event <strong>won&apos;t happen</strong>. Our model estimates {((model.estimatedNoProb || 0) * 100).toFixed(1)}% chance it resolves NO, but the market is pricing NO at only {((opp.noPrice || 0) * 100).toFixed(1)}¢.
                      </div>
                      <div style={{ color: '#86efac', fontSize: '0.82rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
                        💰 Buy ${opp.positionSize?.toFixed(2) || '—'} worth → if the event doesn&apos;t happen, profit: ${(1 - (opp.noPrice || 0)).toFixed(2)}/share. Net EV: <strong style={{ color: '#34d399' }}>${(edge.netEV || 0).toFixed(2)} per $100</strong>
                      </div>
                      {model.newsData && (
                        <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                          📰 News factor: {model.newsData.headlines || 0} headlines, sentiment {(model.newsData.sentiment || 0) > 0 ? '+' : ''}{(model.newsData.sentiment || 0).toFixed(1)}
                        </div>
                      )}
                    </>
                  )}
                  {isSE && (
                    <>
                      <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                        📋 Action: BUY {opp.side || '—'} shares @ ${entryPrice?.toFixed(4) || '—'} each
                      </div>
                      <div style={{ color: '#a7f3d0', fontSize: '0.82rem', lineHeight: 1.5 }}>
                        Statistical signals detected
                        {opp.signals && opp.signals.length > 0 && (
                          <span> — {opp.signals.slice(0, 2).map(s => s.type?.replace(/_/g, ' ').toLowerCase() || 'signal').join(', ')}</span>
                        )}
                        .{opp.bookmaker ? ` Bookmakers consensus: ${((opp.bookmaker.consensusProb || 0) * 100).toFixed(1)}%` : ''}
                      </div>
                      <div style={{ color: '#86efac', fontSize: '0.82rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
                        💰 Position: ${opp.positionSize?.toFixed(2) || '—'} → Net edge: <strong style={{ color: '#34d399' }}>{((edge.edgeAfterCosts || 0) * 100).toFixed(2)}%</strong> after fees.
                      </div>
                    </>
                  )}
                </div>

                {/* Arb legs */}
                {isArb && opp.markets && (
                  <div style={{
                    background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.15)',
                    borderRadius: '8px', padding: '0.6rem 0.8rem', marginBottom: '0.75rem', fontSize: '0.8rem',
                  }}>
                    <div style={{ fontWeight: 600, color: '#a5b4fc', marginBottom: '0.4rem' }}>Trade Legs:</div>
                    {opp.markets.map((leg, j) => (
                      <div key={j} style={{ color: '#cbd5e1', padding: '0.2rem 0', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{j + 1}. BUY YES — {leg.question?.length > 55 ? leg.question.slice(0, 52) + '...' : leg.question}</span>
                        <span style={{ color: '#a5b4fc', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>@ ${leg.yesPrice}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Metrics grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
                  {isArb && (
                    <>
                      <div style={{ background: 'rgba(99,102,241,0.06)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Underround Gap</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a5b4fc' }}>{((edge.raw || 0) * 100).toFixed(1)}%</div>
                      </div>
                      <div style={{ background: 'rgba(52,211,153,0.06)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Net Edge</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399' }}>{((edge.net || 0) * 100).toFixed(1)}%</div>
                      </div>
                      <div style={{ background: 'rgba(251,191,36,0.06)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Expected Profit</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24' }}>${(opp.expectedProfit || 0).toFixed(2)}</div>
                      </div>
                      <div style={{ background: 'rgba(148,163,184,0.06)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Fees + Slippage</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#94a3b8' }}>{(((edge.feeOnProfit || 0) + (edge.slippage || 0)) * 100).toFixed(2)}%</div>
                      </div>
                    </>
                  )}
                  {isNO && (
                    <>
                      <div style={{ background: 'rgba(52,211,153,0.06)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Net Edge</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399' }}>{((edge.edgeAfterCosts || 0) * 100).toFixed(2)}%</div>
                      </div>
                      <div style={{ background: 'rgba(99,102,241,0.06)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Model NO Prob</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a5b4fc' }}>{((model.estimatedNoProb || 0) * 100).toFixed(1)}%</div>
                      </div>
                      <div style={{ background: 'rgba(251,191,36,0.06)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Net EV / $100</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24' }}>${(edge.netEV || 0).toFixed(2)}</div>
                      </div>
                      <div style={{ background: 'rgba(148,163,184,0.06)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Volume 24h</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#94a3b8' }}>${(opp.volume24hr || 0) >= 1000 ? ((opp.volume24hr / 1000).toFixed(1) + 'K') : (opp.volume24hr || 0).toFixed(0)}</div>
                      </div>
                    </>
                  )}
                  {isSE && (
                    <>
                      <div style={{ background: 'rgba(251,191,36,0.06)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Net Edge</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24' }}>{((edge.edgeAfterCosts || 0) * 100).toFixed(2)}%</div>
                      </div>
                      <div style={{ background: 'rgba(52,211,153,0.06)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Entry Price</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399' }}>${entryPrice?.toFixed(4) || '—'}</div>
                      </div>
                      <div style={{ background: 'rgba(99,102,241,0.06)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Liquidity</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a5b4fc' }}>${(opp.liquidity || 0) >= 1000 ? ((opp.liquidity / 1000).toFixed(1) + 'K') : (opp.liquidity || 0).toFixed(0)}</div>
                      </div>
                      <div style={{ background: 'rgba(148,163,184,0.06)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Volume 24h</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#94a3b8' }}>${(opp.volume24hr || 0) >= 1000 ? ((opp.volume24hr / 1000).toFixed(1) + 'K') : (opp.volume24hr || 0).toFixed(0)}</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Bookmaker Comparison */}
                {opp.bookmaker && (
                  <div style={{
                    background: 'rgba(251, 191, 36, 0.06)', border: '1px solid rgba(251, 191, 36, 0.2)',
                    borderRadius: '8px', padding: '0.6rem 0.8rem', marginTop: '0.5rem', fontSize: '0.8rem',
                  }}>
                    <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: '0.3rem' }}>
                      📊 Bookmaker Comparison — {opp.bookmaker.matchedEvent}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.4rem', marginBottom: '0.3rem' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>Polymarket</div>
                        <div style={{ fontWeight: 700, color: '#a5b4fc' }}>{((opp.side === 'YES' ? opp.yesPrice : opp.noPrice) * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>Bookmaker Avg</div>
                        <div style={{ fontWeight: 700, color: '#fbbf24' }}>{((opp.bookmaker.consensusProb || 0) * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>Divergence</div>
                        <div style={{ fontWeight: 700, color: Math.abs(opp.bookmaker.divergence) >= 0.05 ? '#34d399' : '#fbbf24' }}>
                          {opp.bookmaker.divergence > 0 ? '+' : ''}{((opp.bookmaker.divergence || 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    {opp.bookmaker.pinnacleProb && (
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Pinnacle (sharpest): {(opp.bookmaker.pinnacleProb * 100).toFixed(1)}%</div>
                    )}
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                      From {opp.bookmaker.bookmakerCount} bookmakers
                    </div>
                  </div>
                )}

                {/* Risk Assessment */}
                {opp.riskLevel && (
                  <div style={{
                    background: opp.riskLevel === 'HIGH' ? 'rgba(239, 68, 68, 0.08)' : opp.riskLevel === 'MEDIUM' ? 'rgba(251, 191, 36, 0.08)' : 'rgba(52, 211, 153, 0.08)',
                    border: `1px solid ${opp.riskLevel === 'HIGH' ? 'rgba(239, 68, 68, 0.3)' : opp.riskLevel === 'MEDIUM' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(52, 211, 153, 0.3)'}`,
                    borderRadius: '8px', padding: '0.6rem 0.8rem', marginTop: '0.5rem', fontSize: '0.8rem',
                  }}>
                    <div style={{ fontWeight: 700, color: opp.riskLevel === 'HIGH' ? '#ef4444' : opp.riskLevel === 'MEDIUM' ? '#fbbf24' : '#34d399', marginBottom: '0.25rem' }}>
                      {opp.riskLevel === 'HIGH' ? '🔴' : opp.riskLevel === 'MEDIUM' ? '🟡' : '🟢'} Risk: {opp.riskLevel}
                    </div>
                    {opp.riskNote && <div style={{ color: '#94a3b8', fontSize: '0.75rem', lineHeight: 1.4 }}>{opp.riskNote}</div>}
                    {isArb && opp.completeness && (
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        Coverage: {opp.completeness.marketsInGroup}/{opp.completeness.totalInEvent} outcomes tracked
                      </div>
                    )}
                  </div>
                )}

                {/* Expiry + Quick Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {opp.endDate ? `Expires: ${new Date(opp.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <Button $variant="ghost" onClick={() => addToWatchlist(opp)} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }} title="Add to watchlist">
                      ⭐ Watch
                    </Button>
                    <Button $variant="primary" onClick={() => { setTradeModal(opp); setTradeSide(opp.side || 'YES'); }} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}>
                      📝 Paper Trade
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Standard Table (non-Top 5) */}
      {oppsFilter !== 'TOP_5' && (
        <Table>
          <TableRow $header $columns="2.5fr 0.8fr 0.8fr 0.8fr 0.6fr 0.6fr">
            <span>Market</span><span>Strategy</span><span>Price</span><span>Size</span><span>Score</span><span>Confidence</span>
          </TableRow>
          {filteredOpps.length === 0 ? (
            <EmptyState>
              {connected ? isRunning ? 'Scanning for opportunities...' : 'Start the bot to scan for opportunities' : 'Connect to bot server first'}
            </EmptyState>
          ) : (
            filteredOpps.map((opp, i) => (
              <TableRow key={`${opp.conditionId}-${opp.strategy}-${i}`} $columns="2.5fr 0.8fr 0.8fr 0.8fr 0.6fr 0.6fr">
                <span style={{ fontWeight: 500, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 700, padding: '0.05rem 0.3rem', borderRadius: '3px',
                    background: opp.platform === 'KALSHI' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                    color: opp.platform === 'KALSHI' ? '#60a5fa' : '#a78bfa', flexShrink: 0,
                  }}>{opp.platform === 'KALSHI' ? 'K' : 'P'}</span>
                  <span>{opp.market?.length > 55 ? opp.market.slice(0, 52) + '...' : opp.market}</span>
                </span>
                <span><Chip $strategy={opp.strategy}>{opp.strategy === 'NO_BETS' ? 'NO' : opp.strategy === 'ARBITRAGE' ? 'ARB' : 'SPREAD'}</Chip></span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>${opp.yesPrice?.toFixed(3) || opp.noPrice?.toFixed(3) || opp.markets?.[0]?.yesPrice?.toFixed(3) || '—'}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: '#a5b4fc' }}>${opp.positionSize?.toFixed(2) || '—'}</span>
                <span><span style={{ color: opp.score >= 70 ? '#34d399' : opp.score >= 50 ? '#fbbf24' : '#f87171', fontWeight: 700 }}>{opp.score || 0}</span></span>
                <span><Badge $type={opp.confidence?.toLowerCase()}>{opp.confidence || '—'}</Badge></span>
              </TableRow>
            ))
          )}
        </Table>
      )}

      {/* Top 5 empty state */}
      {oppsFilter === 'TOP_5' && filteredOpps.length === 0 && (
        <EmptyState>
          {connected ? isRunning ? 'Scanning for top opportunities...' : 'Start the bot and run a scan to see top picks' : 'Connect to bot server first'}
        </EmptyState>
      )}
    </Card>
  );
});

SignalsTab.displayName = 'SignalsTab';
export default SignalsTab;
