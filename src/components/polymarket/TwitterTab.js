import React from 'react';
import { Grid, FullWidthSection, Card, CardTitle, Button, Input, Badge, EmptyState } from './SharedStyles';

const TwitterTab = React.memo(function TwitterTab({ ctx }) {
  const {
    twStatus, twTrending, twTrendingLoading, setTwTrendingLoading, setTwTrending, setError,
    elonImpact, twSimUser, setTwSimUser, twSimCurrent, setTwSimCurrent, twSimTarget, setTwSimTarget,
    twSimHours, setTwSimHours, twSimulating, setTwSimulating, twSimResult, setTwSimResult,
    twAnalyzeQ, setTwAnalyzeQ, twAnalyzing, setTwAnalyzing, twAnalyzeResult, setTwAnalyzeResult, api
  } = ctx;

  return (
    <Grid>
      {/* Status KPI Strip */}
      <FullWidthSection>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: '0.4rem', marginBottom: '0.5rem' }}>
          {[
            { label: 'Status', value: twStatus?.available ? 'LIVE' : 'OFF', icon: '🐦', color: twStatus?.available ? '#22c55e' : '#ef4444' },
            { label: 'Tracked', value: twStatus?.trackedAccounts || 0, icon: '👤', color: '#a5b4fc' },
            { label: 'Markets', value: twStatus?.matchedMarkets || 0, icon: '🎯', color: '#fbbf24' },
            { label: 'Nitter', value: twStatus?.nitterInstances || 5, icon: '🔗', color: '#34d399' },
            { label: 'Known', value: twStatus?.knownAccounts?.length || 5, icon: '📋', color: '#c084fc' },
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

      {/* 🔥 Trending Twitter/X Markets */}
      <FullWidthSection>
        <Card $delay="0.05s">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <CardTitle style={{ margin: 0 }}>🔥 Trending Twitter/X Markets</CardTitle>
            <Button $variant="ghost" disabled={twTrendingLoading} style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
              onClick={async () => {
                setTwTrendingLoading(true);
                try {
                  const data = await api('/polybot/intel/twitter/trending');
                  if (data?.markets) setTwTrending(data);
                } catch (err) { setError(err.message); }
                setTwTrendingLoading(false);
              }}>
              {twTrendingLoading ? '⏳ Scanning...' : '🔄 Refresh'}
            </Button>
          </div>

          {!twTrending && !twTrendingLoading && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
              Loading trending Twitter/X markets...
            </div>
          )}

          {twTrendingLoading && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#a5b4fc', fontSize: '0.85rem' }}>
              ⏳ Scanning Polymarket for Twitter-related markets and analyzing signals...
            </div>
          )}

          {twTrending?.markets?.length === 0 && !twTrendingLoading && (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.82rem' }}>
              No Twitter-related markets found on Polymarket right now.
            </div>
          )}

          {twTrending?.markets?.length > 0 && !twTrendingLoading && (
            <>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap', fontSize: '0.72rem', color: '#64748b' }}>
                <span>📊 {twTrending.total} found</span>
                <span>🔬 {twTrending.analyzed} analyzed</span>
                <span>🎯 {twTrending.markets.filter(m => m.suggestion !== 'HOLD' && m.suggestion !== 'NO DATA').length} actionable</span>
              </div>

              {twTrending.markets.filter(m => m.suggestion !== 'HOLD' && m.suggestion !== 'NO DATA').length > 0 && (
                <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(99,102,241,0.08))', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', padding: '0.6rem 0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#86efac', marginBottom: '0.35rem' }}>⭐ Top Picks</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {twTrending.markets.filter(m => m.suggestion !== 'HOLD' && m.suggestion !== 'NO DATA').slice(0, 3).map((m, i) => (
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {twTrending.markets.map((m, i) => (
                  <div key={i} style={{
                    background: m.suggestion !== 'HOLD' && m.suggestion !== 'NO DATA' ? 'rgba(30,30,50,0.95)' : 'rgba(20,20,40,0.8)',
                    borderRadius: '10px', padding: '0.65rem 0.75rem',
                    border: `1px solid ${m.suggestion === 'YES' ? 'rgba(34,197,94,0.2)' : m.suggestion === 'NO' ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.1)'}`,
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
                          <span style={{
                            background: m.suggestion === 'YES' ? 'rgba(34,197,94,0.15)' : m.suggestion === 'NO' ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.15)',
                            color: m.suggestion === 'YES' ? '#22c55e' : m.suggestion === 'NO' ? '#ef4444' : '#94a3b8',
                            borderRadius: '4px', padding: '0.1rem 0.35rem', fontWeight: 700, fontSize: '0.68rem',
                            border: `1px solid ${m.suggestion === 'YES' ? 'rgba(34,197,94,0.25)' : m.suggestion === 'NO' ? 'rgba(239,68,68,0.25)' : 'rgba(100,116,139,0.2)'}`
                          }}>
                            {m.suggestion}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: Math.abs(m.edgePct || 0) >= 10 ? '#fbbf24' : '#94a3b8', fontWeight: 600 }}>
                            Edge: {(m.edgePct || 0) > 0 ? '+' : ''}{(m.edgePct || 0).toFixed(1)}%
                          </span>
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

                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', paddingLeft: '1.45rem', marginTop: '0.3rem' }}>
                      <div style={{ fontSize: '0.7rem' }}>
                        <span style={{ color: '#64748b' }}>Market: </span>
                        <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{(m.yesPrice * 100).toFixed(0)}¢ YES</span>
                      </div>
                      <div style={{ fontSize: '0.7rem' }}>
                        <span style={{ color: '#64748b' }}>Our Prob: </span>
                        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{m.signal?.prob != null ? (m.signal.prob * 100).toFixed(1) + '%' : 'N/A'}</span>
                      </div>
                      {m.volume24hr != null && (
                        <div style={{ fontSize: '0.7rem' }}>
                          <span style={{ color: '#64748b' }}>Vol: </span>
                          <span style={{ color: '#94a3b8' }}>${m.volume24hr >= 1000 ? (m.volume24hr / 1000).toFixed(1) + 'k' : m.volume24hr}</span>
                        </div>
                      )}
                      {m.signal?.username && (
                        <div style={{ fontSize: '0.7rem' }}>
                          <span style={{ color: '#64748b' }}>Account: </span>
                          <span style={{ color: '#1d9bf0' }}>@{m.signal.username}</span>
                        </div>
                      )}
                      {m.signal?.currentCount != null && (
                        <div style={{ fontSize: '0.7rem' }}>
                          <span style={{ color: '#64748b' }}>Current: </span>
                          <span style={{ color: '#fbbf24' }}>{m.signal.currentCount} tweets</span>
                        </div>
                      )}
                      {m.signal?.targetCount != null && (
                        <div style={{ fontSize: '0.7rem' }}>
                          <span style={{ color: '#64748b' }}>Target: </span>
                          <span style={{ color: '#c084fc' }}>{m.signal.targetCount} tweets</span>
                        </div>
                      )}
                      {m.signal?.hoursRemaining != null && (
                        <div style={{ fontSize: '0.7rem' }}>
                          <span style={{ color: '#64748b' }}>Time left: </span>
                          <span style={{ color: '#94a3b8' }}>{m.signal.hoursRemaining}h</span>
                        </div>
                      )}
                      {m.endDate && (
                        <div style={{ fontSize: '0.7rem' }}>
                          <span style={{ color: '#64748b' }}>Ends: </span>
                          <span style={{ color: '#94a3b8' }}>{new Date(m.endDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {m.signal?.detail && (
                      <div style={{ fontSize: '0.7rem', color: '#64748b', paddingLeft: '1.45rem', marginTop: '0.25rem', lineHeight: 1.4 }}>
                        {m.signal.detail}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.5rem', textAlign: 'right' }}>
                Last scanned: {twTrending.timestamp ? new Date(twTrending.timestamp).toLocaleTimeString() : 'N/A'}
              </div>
            </>
          )}
        </Card>
      </FullWidthSection>

      {/* How It Works */}
      <Card $delay="0.1s">
        <CardTitle>🐦 Twitter/X Tracker</CardTitle>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          Tracks tweet counts and posting patterns for Polymarket markets like <strong style={{ color: '#e2e8f0' }}>&quot;Will Elon tweet more than 120 times this week?&quot;</strong>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
          {[
            { icon: '🔍', text: 'Scrapes Nitter instances (free) — no paid API needed' },
            { icon: '📊', text: 'Diffs total tweet count to get daily/weekly counts' },
            { icon: '📈', text: 'Statistical model: mean, std dev, z-scores → probability' },
            { icon: '🌍', text: 'Cultural events context adjusts for breaking news' },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
              <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{step.icon}</span>
              <span>{step.text}</span>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#86efac' }}>
          ✅ 100% free — uses Nitter scraping, no Twitter API key required
        </div>
      </Card>

      {/* Known Accounts Database */}
      <Card $delay="0.15s">
        <CardTitle>👤 Known Accounts</CardTitle>
        <p style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
          Pre-configured accounts with baseline tweet rate statistics
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {Object.entries({
            'elonmusk':        { name: 'Elon Musk', avg: 35, std: 12, topics: ['tech', 'space', 'politics', 'crypto', 'ai'] },
            'realdonaldtrump': { name: 'Donald Trump', avg: 15, std: 8, topics: ['politics'] },
            'joebiden':        { name: 'Joe Biden', avg: 5, std: 3, topics: ['politics'] },
            'vaborehim':       { name: 'Vitalik Buterin', avg: 8, std: 5, topics: ['crypto', 'tech'] },
            'caborehim':       { name: 'CZ (Binance)', avg: 10, std: 6, topics: ['crypto'] },
          }).map(([handle, info]) => (
            <div key={handle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.5rem 0.65rem', border: '1px solid rgba(99,102,241,0.08)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0, color: '#a5b4fc', fontWeight: 700 }}>
                {info.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.85rem' }}>{info.name}</span>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>@{handle}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                  <span>Avg: <strong style={{ color: '#a5b4fc' }}>{info.avg}/day</strong></span>
                  <span>±{info.std}</span>
                  {info.topics.map(t => (
                    <span key={t} style={{ fontSize: '0.6rem', background: 'rgba(99,102,241,0.12)', color: '#818cf8', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Elon Cultural Impact */}
      <FullWidthSection>
        <Card $delay="0.18s">
          <CardTitle>🌍 Cultural Events Impact — Elon Tweet Rate</CardTitle>
          <p style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
            Real-world events that affect Elon&apos;s tweeting frequency. Multipliers adjust the baseline tweet rate.
          </p>
          {elonImpact ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(99,102,241,0.12)', borderRadius: '10px', padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: elonImpact.tweetMultiplier > 1.3 ? '#22c55e' : elonImpact.tweetMultiplier < 0.8 ? '#ef4444' : '#fbbf24' }}>
                    {elonImpact.tweetMultiplier?.toFixed(2) || '1.00'}x
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Tweet Rate Multiplier</div>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Expected: <strong style={{ color: '#e2e8f0' }}>{Math.round((elonImpact.tweetMultiplier || 1) * 35)}/day</strong> (baseline: 35/day)
                </div>
              </div>
              {(elonImpact.triggers || []).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Active Triggers:</div>
                  {elonImpact.triggers.map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '0.35rem 0.5rem', fontSize: '0.78rem' }}>
                      <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.72rem' }}>{t.multiplier?.toFixed(1)}x</span>
                      <span style={{ color: '#e2e8f0' }}>{t.category || t.trigger}</span>
                      {t.headline && <span style={{ color: '#64748b', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>— {t.headline}</span>}
                    </div>
                  ))}
                </div>
              )}
              {(elonImpact.triggers || []).length === 0 && (
                <div style={{ color: '#64748b', fontSize: '0.78rem' }}>No unusual triggers detected — baseline activity expected</div>
              )}
            </div>
          ) : (
            <EmptyState>Loading cultural events data...</EmptyState>
          )}
        </Card>
      </FullWidthSection>

      {/* Tweet Simulator */}
      <FullWidthSection>
        <Card $delay="0.2s">
          <CardTitle>🧮 Tweet Probability Simulator</CardTitle>
          <p style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
            Calculate the probability a user reaches a tweet target — same model used for market signals.
          </p>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
            <div style={{ flex: '1 1 120px', minWidth: '100px' }}>
              <label style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block', marginBottom: '0.2rem' }}>Username</label>
              <select value={twSimUser} onChange={e => setTwSimUser(e.target.value)}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#e2e8f0', padding: '0.45rem 0.5rem', fontSize: '0.8rem' }}>
                <option value="elonmusk">@elonmusk</option>
                <option value="realdonaldtrump">@realdonaldtrump</option>
                <option value="joebiden">@joebiden</option>
                <option value="vaborehim">@vaborehim</option>
                <option value="caborehim">@caborehim</option>
              </select>
            </div>
            <div style={{ flex: '0 1 80px', minWidth: '70px' }}>
              <label style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block', marginBottom: '0.2rem' }}>Current</label>
              <Input type="number" value={twSimCurrent} onChange={e => setTwSimCurrent(e.target.value)} $width="100%" min="0" style={{ fontSize: '0.8rem', padding: '0.42rem 0.5rem' }} />
            </div>
            <div style={{ flex: '0 1 80px', minWidth: '70px' }}>
              <label style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block', marginBottom: '0.2rem' }}>Target</label>
              <Input type="number" value={twSimTarget} onChange={e => setTwSimTarget(e.target.value)} $width="100%" min="1" style={{ fontSize: '0.8rem', padding: '0.42rem 0.5rem' }} />
            </div>
            <div style={{ flex: '0 1 80px', minWidth: '70px' }}>
              <label style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block', marginBottom: '0.2rem' }}>Hours Left</label>
              <Input type="number" value={twSimHours} onChange={e => setTwSimHours(e.target.value)} $width="100%" min="1" style={{ fontSize: '0.8rem', padding: '0.42rem 0.5rem' }} />
            </div>
            <Button $variant="primary" disabled={twSimulating} style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem', height: '36px' }}
              onClick={async () => {
                setTwSimulating(true);
                try {
                  const data = await api('/polybot/intel/twitter/simulate', {
                    method: 'POST',
                    body: JSON.stringify({ username: twSimUser, currentCount: twSimCurrent, targetCount: twSimTarget, hoursRemaining: twSimHours }),
                  });
                  setTwSimResult(data);
                } catch (err) { setError(err.message); }
                setTwSimulating(false);
              }}>
              {twSimulating ? '⏳...' : '🧮 Calculate'}
            </Button>
          </div>
          {twSimResult?.result && (
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '0.75rem', border: '1px solid rgba(99,102,241,0.15)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ textAlign: 'center', padding: '0.4rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: twSimResult.result.prob >= 0.6 ? '#22c55e' : twSimResult.result.prob >= 0.4 ? '#fbbf24' : '#ef4444' }}>
                    {(twSimResult.result.prob * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Probability</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.4rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#a5b4fc' }}>{twSimResult.result.expectedRemaining || '—'}</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Expected Remaining</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.4rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#c084fc' }}>{twSimResult.result.zScore || '—'}</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Z-Score</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.4rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24' }}>{twSimResult.result.confidence || '—'}</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Confidence</div>
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>{twSimResult.result.detail}</div>
              {twSimResult.pattern && (
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.4rem' }}>
                  Pattern: {twSimResult.pattern.avgDaily}/day ±{twSimResult.pattern.stdDev} ({twSimResult.pattern.source}, {twSimResult.pattern.dataPoints || 0} data points)
                </div>
              )}
            </div>
          )}
        </Card>
      </FullWidthSection>

      {/* Live Market Question Analyzer */}
      <FullWidthSection>
        <Card $delay="0.25s">
          <CardTitle>🔬 Analyze Market Question</CardTitle>
          <p style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
            Paste a Polymarket question to see what the Twitter tracker thinks
          </p>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.5rem' }}>
            <Input
              type="text"
              placeholder="e.g. Will Elon tweet more than 120 times this week?"
              value={twAnalyzeQ}
              onChange={e => setTwAnalyzeQ(e.target.value)}
              $width="100%"
              style={{ fontSize: '0.8rem', flex: '1 1 250px', minWidth: 0 }}
            />
            <Button $variant="ghost" disabled={twAnalyzing || !twAnalyzeQ.trim()} style={{ fontSize: '0.78rem', padding: '0.4rem 0.7rem', flexShrink: 0 }}
              onClick={async () => {
                setTwAnalyzing(true);
                try {
                  const data = await api('/polybot/intel/twitter/analyze', {
                    method: 'POST',
                    body: JSON.stringify({ question: twAnalyzeQ, endDate: new Date(Date.now() + 7 * 86400000).toISOString() }),
                  });
                  setTwAnalyzeResult(data);
                } catch (err) { setError(err.message); }
                setTwAnalyzing(false);
              }}>
              {twAnalyzing ? '⏳...' : '🔬 Analyze'}
            </Button>
          </div>
          {twAnalyzeResult?.signal && (
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.65rem', border: '1px solid rgba(99,102,241,0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: twAnalyzeResult.signal.prob >= 0.6 ? '#22c55e' : twAnalyzeResult.signal.prob >= 0.4 ? '#fbbf24' : '#ef4444' }}>
                  {twAnalyzeResult.signal.prob != null ? (twAnalyzeResult.signal.prob * 100).toFixed(1) + '%' : 'N/A'}
                </span>
                <Badge $type={twAnalyzeResult.signal.confidence === 'HIGH' ? 'running' : twAnalyzeResult.signal.confidence === 'MEDIUM' ? 'simulation' : 'stopped'}>
                  {twAnalyzeResult.signal.confidence || 'LOW'}
                </Badge>
                {twAnalyzeResult.signal.isBaseline && <span style={{ fontSize: '0.68rem', color: '#fbbf24' }}>⚠️ Baseline (needs more snapshots)</span>}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>{twAnalyzeResult.signal.detail}</div>
            </div>
          )}
          {twAnalyzeResult && !twAnalyzeResult.signal && (
            <div style={{ color: '#64748b', fontSize: '0.8rem', padding: '0.5rem' }}>No match — this question may not relate to tweet counts.</div>
          )}
        </Card>
      </FullWidthSection>

      {/* Tracked Accounts (Live Data) */}
      {(twStatus?.trackedAccounts || []).length > 0 && (
        <FullWidthSection>
          <Card $delay="0.28s">
            <CardTitle>📡 Live Tracked Accounts</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {twStatus.trackedAccounts.map((acct, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.5rem 0.65rem', border: '1px solid rgba(99,102,241,0.08)', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.85rem' }}>@{acct.username}</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{acct.snapshots} snapshots</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{acct.daysCounted} days tracked</span>
                  {acct.pattern && (
                    <span style={{ fontSize: '0.72rem', color: '#a5b4fc' }}>{acct.pattern.avgDaily}/day ±{acct.pattern.stdDev}</span>
                  )}
                  {acct.lastChecked && (
                    <span style={{ fontSize: '0.65rem', color: '#475569', marginLeft: 'auto' }}>Last: {new Date(acct.lastChecked).toLocaleTimeString()}</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </FullWidthSection>
      )}
    </Grid>
  );
});

TwitterTab.displayName = 'TwitterTab';

export default TwitterTab;
