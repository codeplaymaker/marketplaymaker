import React from 'react';
import {
  Grid, FullWidthSection, Card, Button, EmptyState,
} from './SharedStyles';

const PicksTab = React.memo(function PicksTab({ ctx }) {
  const {
    picksGradeFilter, setPicksGradeFilter,
    accaData, setAccaData, accaBuilding, setAccaBuilding,
    picksRecord, setPicksRecord, picksResolving, setPicksResolving,
    learningData, api,
  } = ctx;

  return (
    <Grid>
      <FullWidthSection>
        <Card $delay="0.05s">
          {/* Hero – plain English explainer */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
            border: '1px solid rgba(99,102,241,0.2)', borderRadius: '14px',
            padding: '1rem', marginBottom: '1rem',
          }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
              Smart Picks
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.7 }}>
              We scan <strong style={{ color: '#a5b4fc' }}>30+ bookmakers</strong> in real-time to find bets where the odds are
              <strong style={{ color: '#22c55e' }}> better than the true probability</strong>.
              When bookmakers disagree, someone is wrong — and that&apos;s your edge.
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
              {[
                { icon: '🔍', label: 'Live scanning', desc: 'Updated every 15 min' },
                { icon: '📊', label: `${accaData?.totalLegs || 0} events checked`, desc: `${accaData?.buildStats?.hygiene?.valid || '—'} qualify` },
                { icon: '🏦', label: 'Sharp bookmakers', desc: 'Pinnacle, Matchbook & more' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                  <div>
                    <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.82rem' }}>{item.label}</div>
                    <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grade filter + Action bar */}
          <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            {['ALL', 'S', 'A', 'B', 'C'].map(g => (
              <Button key={g} $variant={picksGradeFilter === g ? 'primary' : 'ghost'}
                onClick={() => setPicksGradeFilter(g)}
                style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}>
                {g === 'ALL' ? '🏆 All Grades' : g === 'S' ? '🟢 S-Tier' : g === 'A' ? '🔵 A-Tier' : g === 'B' ? '🟡 B-Tier' : '⚪ C-Tier'}
              </Button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={async () => {
                  setAccaBuilding(true);
                  try {
                    const result = await api('/polybot/accas/build', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
                    if (result) setAccaData(result);
                  } catch { /* ignore */ }
                  setAccaBuilding(false);
                }}
                disabled={accaBuilding}
                style={{
                  background: accaBuilding ? 'rgba(100,116,139,0.2)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white', border: 'none', padding: '0.6rem 1.4rem', borderRadius: '10px',
                  fontSize: '0.88rem', fontWeight: 600, cursor: accaBuilding ? 'wait' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {accaBuilding ? '⏳ Scanning...' : '🔄 Find New Picks'}
              </button>
              {accaData?.lastBuildTime && (
                <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                  Last scan: {(() => {
                    const mins = Math.floor((Date.now() - new Date(accaData.lastBuildTime).getTime()) / 60000);
                    return mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
                  })()}
                </span>
              )}
            </div>
            {accaData?.stats && (
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                <span style={{ color: '#22c55e', fontWeight: 600 }}>{accaData.stats.total} picks found</span>
              </div>
            )}
          </div>

          {/* Pick cards */}
          {(!accaData?.accas || accaData.accas.length === 0) ? (
            <EmptyState>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🏆</div>
              <div style={{ fontSize: '1rem', color: '#e2e8f0', fontWeight: 600, marginBottom: '0.4rem' }}>No picks yet</div>
              <div style={{ color: '#64748b', maxWidth: '400px' }}>
                Hit &ldquo;Find New Picks&rdquo; to scan live odds across 30+ bookmakers and find mispriced bets.
              </div>
            </EmptyState>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {accaData.accas.filter(a => picksGradeFilter === 'ALL' || a.grade === picksGradeFilter).map((acca, idx) => {
                // Translate grade to user-friendly confidence
                const confidenceMap = {
                  S: { label: 'Excellent', color: '#22c55e', stars: 5, bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)' },
                  A: { label: 'Strong', color: '#6366f1', stars: 4, bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.25)' },
                  B: { label: 'Good', color: '#a5b4fc', stars: 3, bg: 'rgba(165,180,252,0.06)', border: 'rgba(165,180,252,0.2)' },
                  C: { label: 'Fair', color: '#94a3b8', stars: 2, bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.15)' },
                };
                const conf = confidenceMap[acca.grade] || confidenceMap.C;

                // Translate EV to plain English edge description
                const edgeDesc = acca.evPercent >= 8 ? 'Very strong edge'
                  : acca.evPercent >= 4 ? 'Strong edge'
                  : acca.evPercent >= 2 ? 'Good edge'
                  : acca.evPercent >= 1 ? 'Slight edge'
                  : 'Marginal edge';

                // Sport emoji helper
                const sportEmoji = (sport) => {
                  if (!sport) return '🏅';
                  const s = sport.toLowerCase();
                  if (s.includes('soccer') || s.includes('football')) return '⚽';
                  if (s.includes('basketball') || s.includes('nba')) return '🏀';
                  if (s.includes('mma') || s.includes('ufc')) return '🥊';
                  if (s.includes('baseball') || s.includes('mlb')) return '⚾';
                  if (s.includes('hockey') || s.includes('nhl')) return '🏒';
                  if (s.includes('tennis')) return '🎾';
                  if (s.includes('rugby') || s.includes('nrl')) return '🏉';
                  if (s.includes('cricket')) return '🏏';
                  if (s.includes('golf')) return '⛳';
                  return '🏅';
                };

                return (
                  <div key={idx} style={{
                    background: conf.bg,
                    border: `1px solid ${conf.border}`,
                    borderRadius: '14px', padding: '0', overflow: 'hidden',
                    transition: 'all 0.2s',
                  }}>
                    {/* Card header */}
                    <div style={{
                      padding: '0.75rem 1rem',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      flexWrap: 'wrap', gap: '0.5rem',
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                          <span style={{
                            background: `${conf.color}18`, color: conf.color,
                            border: `1px solid ${conf.color}35`,
                            borderRadius: '8px', padding: '0.2rem 0.6rem',
                            fontSize: '0.78rem', fontWeight: 700,
                          }}>
                            {conf.label}
                          </span>
                          <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
                            {acca.numLegs}-leg combo{acca.crossSport ? ' • Multi-sport' : ''}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                          {[...Array(5)].map((_, i) => (
                            <span key={i} style={{
                              color: i < conf.stars ? conf.color : '#1e293b',
                              fontSize: '0.85rem',
                            }}>★</span>
                          ))}
                          <span style={{ color: '#64748b', fontSize: '0.72rem', marginLeft: '0.4rem' }}>{edgeDesc}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#e2e8f0', fontSize: '1.4rem', fontWeight: 700 }}>
                          {acca.combinedOdds}x
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.72rem' }}>combined odds</div>
                      </div>
                    </div>

                    {/* Legs – clean list */}
                    <div style={{ padding: '0 0.75rem' }}>
                      {acca.legs.map((leg, li) => (
                        <div key={li} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.55rem 0',
                          borderBottom: li < acca.legs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{sportEmoji(leg.sport)}</span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.88rem' }}>
                                {leg.pick}
                                {leg.betType === 'SPREAD' && <span style={{ color: '#a5b4fc', fontWeight: 400, marginLeft: '0.3rem', fontSize: '0.8rem' }}>(spread)</span>}
                                {leg.betType === 'TOTAL' && <span style={{ color: '#34d399', fontWeight: 400, marginLeft: '0.3rem', fontSize: '0.8rem' }}>(total)</span>}
                              </div>
                              <div style={{ color: '#64748b', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {leg.match}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.75rem' }}>
                            <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.95rem' }}>
                              {leg.odds}
                            </span>
                            <div style={{ color: '#475569', fontSize: '0.68rem' }}>
                              {leg.book}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer – payout + simple edge indicator */}
                    <div style={{
                      margin: '0 0.75rem', marginTop: '0.25rem', marginBottom: '0.75rem',
                      padding: '0.7rem 0.75rem', borderRadius: '10px',
                      background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
                    }}>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginBottom: '0.15rem' }}>If you bet $10</div>
                        <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '1.1rem' }}>
                          ${(10 * acca.combinedOdds).toFixed(2)} potential return
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginBottom: '0.15rem' }}>Our edge</div>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                        }}>
                          <div style={{
                            width: '60px', height: '6px', borderRadius: '3px',
                            background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${Math.min(100, (acca.evPercent / 10) * 100)}%`,
                              height: '100%', borderRadius: '3px',
                              background: acca.evPercent >= 4 ? '#22c55e' : acca.evPercent >= 2 ? '#a5b4fc' : '#94a3b8',
                            }} />
                          </div>
                          <span style={{
                            color: acca.evPercent >= 4 ? '#22c55e' : acca.evPercent >= 2 ? '#a5b4fc' : '#94a3b8',
                            fontWeight: 700, fontSize: '0.95rem',
                          }}>
                            +{acca.evPercent}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expandable detail for advanced users */}
                    <details style={{ margin: '0 0.75rem 0.75rem' }}>
                      <summary style={{
                        color: '#475569', fontSize: '0.72rem', cursor: 'pointer',
                        padding: '0.3rem 0', listStyle: 'none',
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                      }}>
                        <span style={{ fontSize: '0.65rem' }}>▶</span> Advanced stats
                      </summary>
                      <div style={{
                        marginTop: '0.5rem', padding: '0.6rem 0.8rem',
                        background: 'rgba(0,0,0,0.2)', borderRadius: '8px',
                        fontSize: '0.72rem', color: '#64748b',
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.4rem',
                      }}>
                        <span>Grade: <strong style={{ color: '#94a3b8' }}>{acca.grade}-tier</strong></span>
                        <span>EV: <strong style={{ color: '#94a3b8' }}>{acca.evPercent >= 0 ? '+' : ''}{acca.evPercent}%</strong></span>
                        {acca.evConfidence && (
                          <span>CI: <strong style={{ color: '#94a3b8' }}>{acca.evConfidence.low}% to {acca.evConfidence.high}%</strong></span>
                        )}
                        <span>Correlation: <strong style={{ color: '#94a3b8' }}>{(acca.avgCorrelation * 100).toFixed(1)}%</strong></span>
                        {acca.kelly?.suggestedStake > 0 && (
                          <span>Kelly stake: <strong style={{ color: '#94a3b8' }}>${acca.kelly.suggestedStake}</strong> ({acca.kelly.bankrollPercent}%)</span>
                        )}
                        <span>Data: <strong style={{ color: acca.dataQuality === 'excellent' ? '#22c55e' : '#94a3b8' }}>{acca.dataQuality || 'n/a'}</strong></span>
                        {acca.legs.map((l, i) => l.sharpSource && (
                          <span key={i}>{l.pick.slice(0, 12)}: <strong style={{ color: '#94a3b8' }}>{l.sharpSource}</strong></span>
                        ))}
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          )}

          {/* How it works – simplified */}
          <div style={{
            marginTop: '1.5rem', padding: '1.25rem',
            background: 'rgba(99,102,241,0.04)', borderRadius: '12px',
            border: '1px solid rgba(99,102,241,0.08)',
          }}>
            <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              How does this work?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {[
                { step: '1', title: 'Scan the market', desc: 'We pull live odds from 30+ bookmakers every 15 minutes — including sharp books like Pinnacle that professional bettors use as the gold standard.' },
                { step: '2', title: 'Find the true price', desc: "When bookmakers disagree, we calculate the true probability by removing each book's built-in profit margin (the \"vig\"). Think of it like finding the wholesale price." },
                { step: '3', title: 'Spot the edge', desc: "If a bookmaker offers odds that are better than the true probability, that's a mispriced bet — you're being paid more than the risk is worth." },
                { step: '4', title: 'Build smart combos', desc: "We combine mispriced bets from different events into parlays, checking that the legs aren't correlated (e.g. same team, same game) which would reduce the edge." },
              ].map((item) => (
                <div key={item.step} style={{ display: 'flex', gap: '0.75rem' }}>
                  <span style={{
                    width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.78rem', fontWeight: 700,
                  }}>{item.step}</span>
                  <div>
                    <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.85rem' }}>{item.title}</div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: '1rem', padding: '0.6rem 0.8rem', borderRadius: '8px',
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.1)',
              fontSize: '0.78rem', color: '#64748b',
            }}>
              💡 <strong style={{ color: '#94a3b8' }}>The star rating</strong> reflects how confident we are in the edge. More stars = more bookmaker agreement, sharper source data, and a bigger gap between odds offered and true probability.
            </div>
          </div>

          {/* ── PICKS TRACK RECORD ────────────────────────────── */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.05))',
            border: '1px solid rgba(34,197,94,0.2)', borderRadius: '14px',
            padding: '1rem', marginTop: '1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ color: '#e2e8f0', margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📊 Picks Track Record
              </h3>
              <button
                onClick={async () => {
                  setPicksResolving(true);
                  try {
                    await api('/polybot/picks/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
                    const r = await api('/polybot/picks/track-record');
                    if (r) setPicksRecord(r);
                  } catch { /* ignore */ }
                  setPicksResolving(false);
                }}
                disabled={picksResolving}
                style={{
                  padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.3)',
                  background: picksResolving ? 'rgba(100,116,139,0.15)' : 'rgba(34,197,94,0.1)',
                  color: '#94a3b8', fontSize: '0.75rem', cursor: picksResolving ? 'wait' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {picksResolving ? '⏳ Checking...' : '🔄 Check Results'}
              </button>
            </div>

            {(!picksRecord || picksRecord.summary?.totalPicks === 0) ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
                <p style={{ margin: 0 }}>No picks tracked yet. Hit <strong>&ldquo;Find New Picks&rdquo;</strong> above to start building your track record.</p>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#475569' }}>
                  Every pick you generate is automatically saved. Results are checked against final scores.
                </p>
              </div>
            ) : (
              <>
                {/* Summary Stats Grid */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                  gap: '0.5rem', marginBottom: '0.75rem',
                }}>
                  {[
                    { label: 'Total Picks', value: picksRecord.summary.totalPicks, color: '#e2e8f0' },
                    { label: 'Won', value: picksRecord.summary.won, color: '#22c55e' },
                    { label: 'Lost', value: picksRecord.summary.lost, color: '#ef4444' },
                    { label: 'Pending', value: picksRecord.summary.pending, color: '#f59e0b' },
                    { label: 'Win Rate', value: `${picksRecord.summary.winRate}%`, color: picksRecord.summary.winRate >= 50 ? '#22c55e' : '#ef4444' },
                    { label: 'ROI', value: `${picksRecord.summary.roi > 0 ? '+' : ''}${picksRecord.summary.roi}%`, color: picksRecord.summary.roi >= 0 ? '#22c55e' : '#ef4444' },
                  ].map((stat, i) => (
                    <div key={i} style={{
                      background: 'rgba(15,23,42,0.5)', borderRadius: '10px', padding: '0.6rem',
                      textAlign: 'center', border: '1px solid rgba(148,163,184,0.08)',
                    }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.15rem' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* P&L + Streak */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{
                    flex: '1 1 120px', background: 'rgba(15,23,42,0.5)', borderRadius: '10px', padding: '0.6rem',
                    border: '1px solid rgba(148,163,184,0.08)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.25rem' }}>Total P&L ($10/pick)</div>
                    <div style={{
                      fontSize: '1.2rem', fontWeight: 700,
                      color: picksRecord.summary.totalPnl >= 0 ? '#22c55e' : '#ef4444',
                    }}>
                      {picksRecord.summary.totalPnl >= 0 ? '+' : ''}${picksRecord.summary.totalPnl.toFixed(2)}
                    </div>
                  </div>
                  <div style={{
                    flex: '1 1 120px', background: 'rgba(15,23,42,0.5)', borderRadius: '10px', padding: '0.6rem',
                    border: '1px solid rgba(148,163,184,0.08)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.25rem' }}>Current Streak</div>
                    <div style={{
                      fontSize: '1.2rem', fontWeight: 700,
                      color: picksRecord.summary.currentStreak?.type === 'won' ? '#22c55e' : picksRecord.summary.currentStreak?.type === 'lost' ? '#ef4444' : '#94a3b8',
                    }}>
                      {picksRecord.summary.currentStreak?.count || 0}{picksRecord.summary.currentStreak?.type === 'won' ? 'W' : picksRecord.summary.currentStreak?.type === 'lost' ? 'L' : ''}
                    </div>
                  </div>
                  <div style={{
                    flex: '1 1 120px', background: 'rgba(15,23,42,0.5)', borderRadius: '10px', padding: '0.6rem',
                    border: '1px solid rgba(148,163,184,0.08)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.25rem' }}>Avg Odds</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#e2e8f0' }}>
                      {picksRecord.summary.avgOdds.toFixed(2)}x
                    </div>
                  </div>
                </div>

                {/* Grade Breakdown */}
                {Object.keys(picksRecord.byGrade || {}).length > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.4rem' }}>By Grade</div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {Object.entries(picksRecord.byGrade).map(([grade, data]) => (
                        <div key={grade} style={{
                          background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '0.4rem 0.6rem',
                          border: '1px solid rgba(148,163,184,0.08)', fontSize: '0.72rem',
                          display: 'flex', gap: '0.5rem', alignItems: 'center',
                        }}>
                          <span style={{
                            fontWeight: 700,
                            color: grade === 'S' ? '#22c55e' : grade === 'A' ? '#6366f1' : grade === 'B' ? '#f59e0b' : '#94a3b8',
                          }}>{grade}</span>
                          <span style={{ color: '#94a3b8' }}>{data.won}W {data.lost}L</span>
                          <span style={{ color: data.pnl >= 0 ? '#22c55e' : '#ef4444' }}>
                            {data.pnl >= 0 ? '+' : ''}${data.pnl.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Picks List */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.4rem' }}>Recent Picks</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '400px', overflowY: 'auto' }}>
                    {(picksRecord.recent || []).map((pick, idx) => (
                      <div key={pick.historyId || idx} style={{
                        background: 'rgba(15,23,42,0.4)', borderRadius: '10px', padding: '0.6rem',
                        border: `1px solid ${pick.result === 'won' ? 'rgba(34,197,94,0.2)' : pick.result === 'lost' ? 'rgba(239,68,68,0.2)' : 'rgba(148,163,184,0.08)'}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.3rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{
                              display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '6px',
                              fontSize: '0.7rem', fontWeight: 700,
                              background: pick.result === 'won' ? 'rgba(34,197,94,0.15)' : pick.result === 'lost' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                              color: pick.result === 'won' ? '#22c55e' : pick.result === 'lost' ? '#ef4444' : '#f59e0b',
                              border: `1px solid ${pick.result === 'won' ? 'rgba(34,197,94,0.3)' : pick.result === 'lost' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                            }}>
                              {pick.result === 'won' ? '✅ WON' : pick.result === 'lost' ? '❌ LOST' : '⏳ PENDING'}
                            </span>
                            <span style={{
                              padding: '0.15rem 0.4rem', borderRadius: '5px', fontSize: '0.65rem', fontWeight: 600,
                              background: pick.grade === 'S' ? 'rgba(34,197,94,0.12)' : pick.grade === 'A' ? 'rgba(99,102,241,0.12)' : 'rgba(245,158,11,0.12)',
                              color: pick.grade === 'S' ? '#22c55e' : pick.grade === 'A' ? '#6366f1' : '#f59e0b',
                            }}>
                              {pick.grade}
                            </span>
                            <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                              {pick.numLegs}-leg @ {pick.combinedOdds}x
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {pick.pnl != null && (
                              <span style={{
                                fontSize: '0.75rem', fontWeight: 700,
                                color: pick.pnl >= 0 ? '#22c55e' : '#ef4444',
                              }}>
                                {pick.pnl >= 0 ? '+' : ''}${pick.pnl.toFixed(2)}
                              </span>
                            )}
                            <span style={{ color: '#475569', fontSize: '0.65rem' }}>
                              {new Date(pick.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        {/* Legs */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          {pick.legs.map((leg, li) => (
                            <div key={li} style={{
                              display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0',
                              fontSize: '0.7rem', color: '#94a3b8', flexWrap: 'wrap',
                            }}>
                              <span style={{ minWidth: '18px' }}>
                                {leg.result === 'won' ? '✅' : leg.result === 'lost' ? '❌' : leg.result === 'push' ? '➖' : '⏳'}
                              </span>
                              <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{leg.pick}</span>
                              <span style={{ color: '#64748b' }}>—</span>
                              <span>{leg.match}</span>
                              {leg.score && (
                                <span style={{
                                  padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.62rem',
                                  background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                                }}>
                                  {leg.score}
                                </span>
                              )}
                              <span style={{ color: '#475569' }}>@ {leg.odds?.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        {/* Progress bar for partly resolved */}
                        {pick.result === 'pending' && pick.resolvedLegs > 0 && (
                          <div style={{ marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{ flex: 1, height: '3px', background: 'rgba(148,163,184,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: '2px',
                                width: `${(pick.resolvedLegs / pick.numLegs) * 100}%`,
                                background: pick.wonLegs === pick.resolvedLegs ? '#22c55e' : '#f59e0b',
                              }} />
                            </div>
                            <span style={{ fontSize: '0.6rem', color: '#64748b' }}>
                              {pick.resolvedLegs}/{pick.numLegs} settled ({pick.wonLegs} won)
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* ── AI LEARNING INSIGHTS ─────────────────────────── */}
        {learningData && learningData.totalResolved > 0 && (
          <Card $delay="0.5s" style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🧠</span>
              <span style={{
                fontSize: '1rem', fontWeight: 700, color: '#e2e8f0',
                background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                AI Learning Engine
              </span>
              <span style={{
                marginLeft: 'auto', padding: '0.15rem 0.5rem', borderRadius: '12px',
                fontSize: '0.65rem', fontWeight: 600,
                background: learningData.adjustments ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                color: learningData.adjustments ? '#22c55e' : '#f59e0b',
                border: `1px solid ${learningData.adjustments ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
              }}>
                {learningData.adjustments ? '● Active' : '○ Gathering Data'}
              </span>
            </div>

            <div style={{
              background: 'rgba(129,140,248,0.06)', borderRadius: '10px', padding: '0.6rem 0.8rem',
              border: '1px solid rgba(129,140,248,0.15)', marginBottom: '0.75rem',
              fontSize: '0.75rem', color: '#a5b4fc', lineHeight: '1.5',
            }}>
              The AI analyzes every resolved pick to find patterns — which sports, bet types, and odds ranges perform best — then automatically adjusts future picks to be smarter.
              {learningData.totalResolved > 0 && (
                <span style={{ display: 'block', marginTop: '0.3rem', color: '#94a3b8' }}>
                  Learned from <strong style={{ color: '#e2e8f0' }}>{learningData.totalResolved}</strong> resolved picks
                  {learningData.learnedAt && ` • Last updated ${new Date(learningData.learnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
                </span>
              )}
            </div>

            {/* Learning Insights */}
            {learningData.insights && learningData.insights.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {learningData.insights.map((insight, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.4rem',
                    padding: '0.35rem 0.6rem', borderRadius: '8px',
                    background: insight.includes('profitable') || insight.includes('Best')
                      ? 'rgba(34,197,94,0.06)' : insight.includes('losing') || insight.includes('Weakest') || insight.includes('reducing')
                      ? 'rgba(239,68,68,0.06)' : 'rgba(148,163,184,0.04)',
                    border: `1px solid ${insight.includes('profitable') || insight.includes('Best')
                      ? 'rgba(34,197,94,0.12)' : insight.includes('losing') || insight.includes('Weakest')
                      ? 'rgba(239,68,68,0.12)' : 'rgba(148,163,184,0.08)'}`,
                  }}>
                    <span style={{ flexShrink: 0, fontSize: '0.7rem', marginTop: '1px' }}>
                      {insight.includes('profitable') || insight.includes('Best') ? '📈' :
                       insight.includes('losing') || insight.includes('Weakest') || insight.includes('reducing') ? '📉' :
                       insight.includes('Overall') ? '📊' : '💡'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                      {insight}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Active Adjustments Summary */}
            {learningData.adjustments && (
              <div style={{
                marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem',
              }}>
                {Object.entries(learningData.adjustments.sportMultipliers || {}).map(([sport, mult]) => (
                  <span key={sport} style={{
                    padding: '0.15rem 0.45rem', borderRadius: '6px', fontSize: '0.62rem', fontWeight: 600,
                    background: mult > 1 ? 'rgba(34,197,94,0.1)' : mult < 1 ? 'rgba(239,68,68,0.1)' : 'rgba(148,163,184,0.06)',
                    color: mult > 1 ? '#4ade80' : mult < 1 ? '#f87171' : '#94a3b8',
                    border: `1px solid ${mult > 1 ? 'rgba(34,197,94,0.2)' : mult < 1 ? 'rgba(239,68,68,0.2)' : 'rgba(148,163,184,0.1)'}`,
                  }}>
                    {sport} {mult > 1 ? '↑' : mult < 1 ? '↓' : '='}{((mult - 1) * 100).toFixed(0)}%
                  </span>
                ))}
                {Object.entries(learningData.adjustments.betTypeMultipliers || {}).map(([bt, mult]) => (
                  <span key={bt} style={{
                    padding: '0.15rem 0.45rem', borderRadius: '6px', fontSize: '0.62rem', fontWeight: 600,
                    background: mult > 1 ? 'rgba(99,102,241,0.1)' : mult < 1 ? 'rgba(239,68,68,0.1)' : 'rgba(148,163,184,0.06)',
                    color: mult > 1 ? '#a5b4fc' : mult < 1 ? '#f87171' : '#94a3b8',
                    border: `1px solid ${mult > 1 ? 'rgba(99,102,241,0.2)' : mult < 1 ? 'rgba(239,68,68,0.2)' : 'rgba(148,163,184,0.1)'}`,
                  }}>
                    {bt} {mult > 1 ? '↑' : mult < 1 ? '↓' : '='}{((mult - 1) * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            )}
          </Card>
        )}
      </FullWidthSection>
    </Grid>
  );
});

export default PicksTab;
