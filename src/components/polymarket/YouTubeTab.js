import React from 'react';
import { Grid, FullWidthSection, Card, CardTitle, Button, Input, Badge } from './SharedStyles';

const YouTubeTab = React.memo(({ ctx }) => {
  const {
    ytStatus, ytTrending, ytTrendingLoading, setYtTrendingLoading,
    setYtTrending, setError, ytAnalyzeQ, setYtAnalyzeQ, ytAnalyzing,
    setYtAnalyzing, ytAnalyzeResult, setYtAnalyzeResult, api
  } = ctx;

  return (
          <Grid>
            {/* Status KPI Strip */}
            <FullWidthSection>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: '0.4rem', marginBottom: '0.5rem' }}>
                {[
                  { label: 'Status', value: ytStatus?.configured ? 'LIVE' : 'NO KEY', icon: '▶️', color: ytStatus?.configured ? '#22c55e' : '#ef4444' },
                  { label: 'Videos', value: Array.isArray(ytStatus?.trackedVideos) ? ytStatus.trackedVideos.length : (ytStatus?.trackedVideos || 0), icon: '🎬', color: '#a5b4fc' },
                  { label: 'Markets', value: ytStatus?.matchedMarkets || 0, icon: '🎯', color: '#fbbf24' },
                  { label: 'API', value: 'YT v3', icon: '🔗', color: '#34d399' },
                  { label: 'Creators', value: 10, icon: '👤', color: '#c084fc' },
                  { label: 'Cost', value: 'FREE', icon: '💰', color: '#22c55e' },
                ].map((kpi, i) => (
                  <div key={i} style={{ background: 'rgba(30, 30, 50, 0.9)', borderRadius: '10px', padding: '0.6rem 0.4rem', textAlign: 'center', border: '1px solid rgba(99, 102, 241, 0.12)' }}>
                    <div style={{ fontSize: '0.75rem', marginBottom: '0.1rem' }}>{kpi.icon}</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: kpi.color, fontVariantNumeric: 'tabular-nums' }}>{kpi.value}</div>
                    <div style={{ fontSize: '0.55rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</div>
                  </div>
                ))}
              </div>
            </FullWidthSection>

            {/* 🔥 Trending YouTube Markets — Best Suggestions */}
            <FullWidthSection>
              <Card $delay="0.05s">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <CardTitle style={{ margin: 0 }}>🔥 Trending YouTube Markets</CardTitle>
                  <Button $variant="ghost" disabled={ytTrendingLoading} style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                    onClick={async () => {
                      setYtTrendingLoading(true);
                      try {
                        const data = await api('/polybot/intel/youtube/trending');
                        if (data?.markets) setYtTrending(data);
                      } catch (err) { setError(err.message); }
                      setYtTrendingLoading(false);
                    }}>
                    {ytTrendingLoading ? '⏳ Scanning...' : '🔄 Refresh'}
                  </Button>
                </div>

                {!ytTrending && !ytTrendingLoading && (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                    Loading trending YouTube markets...
                  </div>
                )}

                {ytTrendingLoading && (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#a5b4fc', fontSize: '0.85rem' }}>
                    ⏳ Scanning Polymarket for YouTube-related markets and analyzing signals...
                  </div>
                )}

                {ytTrending?.markets?.length === 0 && !ytTrendingLoading && (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.82rem' }}>
                    No YouTube-related markets found on Polymarket right now.
                  </div>
                )}

                {ytTrending?.markets?.length > 0 && !ytTrendingLoading && (
                  <>
                    {/* Summary bar */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap', fontSize: '0.72rem', color: '#64748b' }}>
                      <span>📊 {ytTrending.total} found</span>
                      <span>🔬 {ytTrending.analyzed} analyzed</span>
                      <span>🎯 {ytTrending.markets.filter(m => m.suggestion !== 'HOLD').length} actionable</span>
                    </div>

                    {/* Best Picks Banner */}
                    {ytTrending.markets.filter(m => m.suggestion !== 'HOLD').length > 0 && (
                      <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(99,102,241,0.08))', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', padding: '0.6rem 0.75rem', marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#86efac', marginBottom: '0.35rem' }}>⭐ Top Picks</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {ytTrending.markets.filter(m => m.suggestion !== 'HOLD').slice(0, 3).map((m, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', flexWrap: 'wrap' }}>
                              <span style={{
                                background: m.suggestion === 'YES' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                                color: m.suggestion === 'YES' ? '#22c55e' : '#ef4444',
                                borderRadius: '4px', padding: '0.15rem 0.4rem', fontWeight: 700, fontSize: '0.7rem',
                                border: `1px solid ${m.suggestion === 'YES' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`
                              }}>
                                {m.suggestion} {m.edgePct > 0 ? '+' : ''}{(m.edgePct || 0).toFixed(1)}%
                              </span>
                              <span style={{ color: '#e2e8f0', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.question}
                              </span>
                              <span style={{ color: '#a5b4fc', fontWeight: 600, flexShrink: 0, fontSize: '0.75rem' }}>
                                {(m.signal?.confidence || 'LOW').toUpperCase()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* All Markets */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {ytTrending.markets.map((m, i) => (
                        <div key={i} style={{
                          background: m.suggestion !== 'HOLD' ? 'rgba(30,30,50,0.95)' : 'rgba(20,20,40,0.8)',
                          borderRadius: '10px', padding: '0.65rem 0.75rem',
                          border: `1px solid ${m.suggestion === 'YES' ? 'rgba(34,197,94,0.2)' : m.suggestion === 'NO' ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.1)'}`,
                          transition: 'border-color 0.2s'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>
                              {m.suggestion === 'YES' ? '🟢' : m.suggestion === 'NO' ? '🔴' : '⚪'}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.82rem', lineHeight: 1.4, marginBottom: '0.25rem' }}>
                                {m.question}
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                {/* Suggestion Badge */}
                                <span style={{
                                  background: m.suggestion === 'YES' ? 'rgba(34,197,94,0.15)' : m.suggestion === 'NO' ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.15)',
                                  color: m.suggestion === 'YES' ? '#22c55e' : m.suggestion === 'NO' ? '#ef4444' : '#94a3b8',
                                  borderRadius: '4px', padding: '0.1rem 0.35rem', fontWeight: 700, fontSize: '0.68rem',
                                  border: `1px solid ${m.suggestion === 'YES' ? 'rgba(34,197,94,0.25)' : m.suggestion === 'NO' ? 'rgba(239,68,68,0.25)' : 'rgba(100,116,139,0.2)'}`
                                }}>
                                  {m.suggestion}
                                </span>

                                {/* Edge */}
                                <span style={{ fontSize: '0.72rem', color: Math.abs(m.edgePct || 0) >= 10 ? '#fbbf24' : '#94a3b8', fontWeight: 600 }}>
                                  Edge: {(m.edgePct || 0) > 0 ? '+' : ''}{(m.edgePct || 0).toFixed(1)}%
                                </span>

                                {/* Confidence */}
                                <span style={{
                                  fontSize: '0.65rem', padding: '0.08rem 0.3rem', borderRadius: '3px',
                                  background: (m.signal?.confidence) === 'HIGH' ? 'rgba(34,197,94,0.1)' : (m.signal?.confidence) === 'MEDIUM' ? 'rgba(251,191,36,0.1)' : 'rgba(100,116,139,0.1)',
                                  color: (m.signal?.confidence) === 'HIGH' ? '#86efac' : (m.signal?.confidence) === 'MEDIUM' ? '#fde68a' : '#94a3b8'
                                }}>
                                  {(m.signal?.confidence || 'LOW').toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Stats Row */}
                          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', paddingLeft: '1.45rem', marginTop: '0.3rem' }}>
                            <div style={{ fontSize: '0.7rem' }}>
                              <span style={{ color: '#64748b' }}>Market: </span>
                              <span style={{ color: '#a5b4fc', fontWeight: 600 }}>
                                {(m.yesPrice * 100).toFixed(0)}¢ YES
                              </span>
                            </div>
                            <div style={{ fontSize: '0.7rem' }}>
                              <span style={{ color: '#64748b' }}>Our Prob: </span>
                              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                                {m.signal?.prob != null ? (m.signal.prob * 100).toFixed(1) + '%' : 'N/A'}
                              </span>
                            </div>
                            {m.volume24hr != null && (
                              <div style={{ fontSize: '0.7rem' }}>
                                <span style={{ color: '#64748b' }}>Vol: </span>
                                <span style={{ color: '#94a3b8' }}>${m.volume24hr >= 1000 ? (m.volume24hr / 1000).toFixed(1) + 'k' : m.volume24hr}</span>
                              </div>
                            )}
                            {m.liquidity != null && (
                              <div style={{ fontSize: '0.7rem' }}>
                                <span style={{ color: '#64748b' }}>Liq: </span>
                                <span style={{ color: '#94a3b8' }}>${m.liquidity >= 1000 ? (m.liquidity / 1000).toFixed(1) + 'k' : m.liquidity}</span>
                              </div>
                            )}
                            {m.signal?.channel && (
                              <div style={{ fontSize: '0.7rem' }}>
                                <span style={{ color: '#64748b' }}>Channel: </span>
                                <span style={{ color: '#c084fc' }}>{m.signal.channel}</span>
                              </div>
                            )}
                            {m.signal?.currentViews != null && (
                              <div style={{ fontSize: '0.7rem' }}>
                                <span style={{ color: '#64748b' }}>Views: </span>
                                <span style={{ color: '#fbbf24' }}>
                                  {m.signal.currentViews >= 1e6 ? (m.signal.currentViews / 1e6).toFixed(1) + 'M' : m.signal.currentViews.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {m.signal?.projectedViews != null && (
                              <div style={{ fontSize: '0.7rem' }}>
                                <span style={{ color: '#64748b' }}>Projected: </span>
                                <span style={{ color: '#34d399' }}>
                                  {m.signal.projectedViews >= 1e6 ? (m.signal.projectedViews / 1e6).toFixed(1) + 'M' : m.signal.projectedViews.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {m.endDate && (
                              <div style={{ fontSize: '0.7rem' }}>
                                <span style={{ color: '#64748b' }}>Ends: </span>
                                <span style={{ color: '#94a3b8' }}>{new Date(m.endDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>

                          {/* Detail text */}
                          {m.signal?.detail && (
                            <div style={{ fontSize: '0.7rem', color: '#64748b', paddingLeft: '1.45rem', marginTop: '0.25rem', lineHeight: 1.4 }}>
                              {m.signal.detail}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.5rem', textAlign: 'right' }}>
                      Last scanned: {ytTrending.timestamp ? new Date(ytTrending.timestamp).toLocaleTimeString() : 'N/A'}
                    </div>
                  </>
                )}
              </Card>
            </FullWidthSection>

            {/* How It Works */}
            <Card $delay="0.1s">
              <CardTitle>▶️ YouTube View Tracker</CardTitle>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                Tracks video view velocity for markets like <strong style={{ color: '#e2e8f0' }}>&quot;Will MrBeast&apos;s next video hit 100M views by Friday?&quot;</strong>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                {[
                  { icon: '🔍', text: 'Detects YouTube-related markets from question text' },
                  { icon: '📹', text: 'Finds relevant video via YouTube Data API v3' },
                  { icon: '📊', text: 'Polls view count → builds velocity curve over time' },
                  { icon: '📈', text: 'Extrapolates to deadline with decay-adjusted projection' },
                  { icon: '🧮', text: 'Returns data-driven probability (not guessing)' },
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                    <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{step.icon}</span>
                    <span>{step.text}</span>
                  </div>
                ))}
              </div>
              {ytStatus?.configured ? (
                <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#86efac' }}>
                  ✅ YouTube API key active — tracking {Array.isArray(ytStatus?.trackedVideos) ? ytStatus.trackedVideos.length : (ytStatus?.trackedVideos || 0)} videos
                </div>
              ) : (
                <div style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#fbbf24' }}>
                  ⚠️ No YouTube API key — using baseline estimates only. Add YOUTUBE_API_KEY to .env for real-time velocity tracking.
                </div>
              )}
            </Card>

            {/* Creator Database */}
            <Card $delay="0.15s">
              <CardTitle>👤 Creator Database</CardTitle>
              <p style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                Known creators with historical view averages for baseline estimates
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {[
                  { key: 'mrbeast', name: 'MrBeast', avg24h: '80M', avg48h: '120M' },
                  { key: 'markrober', name: 'Mark Rober', avg24h: '20M', avg48h: '35M' },
                  { key: 'airrack', name: 'Airrack', avg24h: '15M', avg48h: '25M' },
                  { key: 'dude perfect', name: 'Dude Perfect', avg24h: '15M', avg48h: '25M' },
                  { key: 'ishowspeed', name: 'IShowSpeed', avg24h: '12M', avg48h: '20M' },
                  { key: 'loganpaul', name: 'Logan Paul', avg24h: '10M', avg48h: '18M' },
                  { key: 'ryan trahan', name: 'Ryan Trahan', avg24h: '10M', avg48h: '18M' },
                  { key: 'pewdiepie', name: 'PewDiePie', avg24h: '8M', avg48h: '15M' },
                  { key: 'ksi', name: 'KSI', avg24h: '8M', avg48h: '14M' },
                  { key: 'mkbhd', name: 'MKBHD', avg24h: '5M', avg48h: '10M' },
                ].map(c => (
                  <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.45rem 0.65rem', border: '1px solid rgba(99,102,241,0.08)' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', flexShrink: 0, color: '#f87171' }}>
                      ▶
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.85rem' }}>{c.name}</span>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.78rem', color: '#a5b4fc', fontWeight: 600 }}>{c.avg24h} <span style={{ color: '#64748b', fontWeight: 400, fontSize: '0.65rem' }}>24h</span></div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{c.avg48h} in 48h</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Analyze Market Question */}
            <FullWidthSection>
              <Card $delay="0.2s">
                <CardTitle>🔬 Analyze Market Question</CardTitle>
                <p style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
                  Paste a YouTube-related Polymarket question to get a signal
                </p>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <Input
                    type="text"
                    placeholder="e.g. Will MrBeast's next video hit 100M views by Friday?"
                    value={ytAnalyzeQ}
                    onChange={e => setYtAnalyzeQ(e.target.value)}
                    $width="100%"
                    style={{ fontSize: '0.8rem', flex: '1 1 250px', minWidth: 0 }}
                  />
                  <Button $variant="ghost" disabled={ytAnalyzing || !ytAnalyzeQ.trim()} style={{ fontSize: '0.78rem', padding: '0.4rem 0.7rem', flexShrink: 0 }}
                    onClick={async () => {
                      setYtAnalyzing(true);
                      try {
                        const data = await api('/polybot/intel/youtube/analyze', {
                          method: 'POST',
                          body: JSON.stringify({ question: ytAnalyzeQ, endDate: new Date(Date.now() + 7 * 86400000).toISOString() }),
                        });
                        setYtAnalyzeResult(data);
                      } catch (err) { setError(err.message); }
                      setYtAnalyzing(false);
                    }}>
                    {ytAnalyzing ? '⏳...' : '🔬 Analyze'}
                  </Button>
                </div>
                {ytAnalyzeResult?.signal && (
                  <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '0.75rem', border: '1px solid rgba(99,102,241,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: ytAnalyzeResult.signal.prob >= 0.6 ? '#22c55e' : ytAnalyzeResult.signal.prob >= 0.4 ? '#fbbf24' : '#ef4444' }}>
                        {ytAnalyzeResult.signal.prob != null ? (ytAnalyzeResult.signal.prob * 100).toFixed(1) + '%' : 'N/A'}
                      </span>
                      <Badge $type={ytAnalyzeResult.signal.confidence === 'HIGH' ? 'running' : ytAnalyzeResult.signal.confidence === 'MEDIUM' ? 'simulation' : 'stopped'}>
                        {ytAnalyzeResult.signal.confidence || 'LOW'}
                      </Badge>
                      {ytAnalyzeResult.signal.isBaseline && <span style={{ fontSize: '0.68rem', color: '#fbbf24' }}>⚠️ Baseline (no real-time data)</span>}
                    </div>
                    {ytAnalyzeResult.signal.currentViews != null && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.4rem', marginBottom: '0.5rem' }}>
                        {[
                          { label: 'Current Views', value: ytAnalyzeResult.signal.currentViews >= 1e6 ? (ytAnalyzeResult.signal.currentViews / 1e6).toFixed(1) + 'M' : ytAnalyzeResult.signal.currentViews.toLocaleString(), color: '#a5b4fc' },
                          ytAnalyzeResult.signal.projectedViews != null && { label: 'Projected', value: ytAnalyzeResult.signal.projectedViews >= 1e6 ? (ytAnalyzeResult.signal.projectedViews / 1e6).toFixed(1) + 'M' : ytAnalyzeResult.signal.projectedViews.toLocaleString(), color: '#22c55e' },
                          ytAnalyzeResult.signal.targetViews != null && { label: 'Target', value: ytAnalyzeResult.signal.targetViews >= 1e6 ? (ytAnalyzeResult.signal.targetViews / 1e6).toFixed(1) + 'M' : ytAnalyzeResult.signal.targetViews.toLocaleString(), color: '#fbbf24' },
                          ytAnalyzeResult.signal.velocity != null && { label: 'Velocity', value: Math.round(ytAnalyzeResult.signal.velocity).toLocaleString() + '/hr', color: '#c084fc' },
                        ].filter(Boolean).map((stat, i) => (
                          <div key={i} style={{ textAlign: 'center', padding: '0.35rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: '0.6rem', color: '#64748b' }}>{stat.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>{ytAnalyzeResult.signal.detail}</div>
                    {ytAnalyzeResult.signal.videoTitle && (
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.3rem' }}>
                        Video: {ytAnalyzeResult.signal.videoTitle} {ytAnalyzeResult.signal.videoId && <span>({ytAnalyzeResult.signal.videoId})</span>}
                      </div>
                    )}
                  </div>
                )}
                {ytAnalyzeResult && !ytAnalyzeResult.signal && (
                  <div style={{ color: '#64748b', fontSize: '0.8rem', padding: '0.5rem' }}>No match — this question may not relate to YouTube views.</div>
                )}
              </Card>
            </FullWidthSection>

            {/* Tracked Videos (Live Data) */}
            {(ytStatus?.trackedVideos?.length > 0 || (Array.isArray(ytStatus?.trackedVideos) && ytStatus.trackedVideos.length > 0)) && (
              <FullWidthSection>
                <Card $delay="0.25s">
                  <CardTitle>📡 Live Tracked Videos</CardTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {(Array.isArray(ytStatus.trackedVideos) ? ytStatus.trackedVideos : []).map((vid, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.5rem 0.65rem', border: '1px solid rgba(99,102,241,0.08)', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.82rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {vid.videoId}
                        </span>
                        {vid.currentViews != null && (
                          <span style={{ fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 600 }}>
                            {vid.currentViews >= 1e6 ? (vid.currentViews / 1e6).toFixed(1) + 'M' : vid.currentViews.toLocaleString()} views
                          </span>
                        )}
                        {vid.currentVelocity != null && (
                          <span style={{ fontSize: '0.72rem', color: '#22c55e' }}>{Math.round(vid.currentVelocity).toLocaleString()}/hr</span>
                        )}
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{vid.snapshotCount} snapshots</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </FullWidthSection>
            )}
          </Grid>
  );
});

YouTubeTab.displayName = 'YouTubeTab';

export default YouTubeTab;
