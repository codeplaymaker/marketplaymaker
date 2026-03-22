import React, { useState, useMemo } from 'react';
import {
  Grid, FullWidthSection, Card, Input, Button, EmptyState,
} from './SharedStyles';

/* ── helpers ──────────────────────────────────────────────────────── */

const fmtVol = (n) => {
  if (n == null || n === 0) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};

const detectCategory = (q) => {
  if (!q) return 'Other';
  const l = q.toLowerCase();
  if (/bitcoin|btc|eth|crypto|solana|token|defi|nft/.test(l))       return 'Crypto';
  if (/president|election|trump|biden|congress|senate|governor|vote|democrat|republican|political/.test(l)) return 'Politics';
  if (/nba|nfl|mlb|nhl|soccer|football|basketball|tennis|ufc|mma|boxing|f1|formula|sport/.test(l)) return 'Sports';
  if (/\bai\b|openai|gpt|artificial|apple|google|meta|microsoft|nvidia|semiconduct/.test(l)) return 'Tech';
  if (/fed\s|rate cut|inflation|gdp|stock|s&p|nasdaq|recession|unemployment|treasury/.test(l)) return 'Finance';
  if (/elon|musk|tweet|youtube|tiktok|views|subscriber|twitter|x\.com/.test(l)) return 'Social';
  if (/war\s|ukraine|russia|china|military|nato|geopolit|missile|sanction/.test(l)) return 'Geopolitics';
  if (/weather|climate|earthquake|hurricane|tornado|temperature/.test(l)) return 'Weather';
  return 'Other';
};

const CATEGORIES = {
  All:         { icon: '🌐', color: '#a5b4fc' },
  Politics:    { icon: '🏛️', color: '#ef4444' },
  Crypto:      { icon: '₿',  color: '#f59e0b' },
  Sports:      { icon: '⚽', color: '#22c55e' },
  Tech:        { icon: '🤖', color: '#6366f1' },
  Finance:     { icon: '📈', color: '#34d399' },
  Social:      { icon: '📱', color: '#1d9bf0' },
  Geopolitics: { icon: '🌍', color: '#c084fc' },
  Weather:     { icon: '🌤️', color: '#38bdf8' },
  Other:       { icon: '📦', color: '#94a3b8' },
};

const SORT_OPTIONS = [
  { key: 'volume',    label: 'Volume',    icon: '📊' },
  { key: 'yes',       label: 'Price',     icon: '💲' },
  { key: 'liquidity', label: 'Liquidity', icon: '💧' },
];

/* ── small reusable pieces ────────────────────────────────────────── */

const MetricTile = ({ label, value, sub, color = '#e2e8f0' }) => (
  <div style={{
    background: 'rgba(30,30,50,0.9)', borderRadius: '12px',
    padding: '0.65rem 0.5rem', textAlign: 'center',
    border: '1px solid rgba(99,102,241,0.12)', minWidth: 0,
  }}>
    <div style={{ fontSize: '1.15rem', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
      {value}
    </div>
    <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
      {label}
    </div>
    {sub && <div style={{ fontSize: '0.55rem', color: '#475569', marginTop: '1px' }}>{sub}</div>}
  </div>
);

const MiniPriceBar = ({ yes }) => {
  const pct = (yes || 0.5) * 100;
  return (
    <div style={{ display: 'flex', height: '5px', borderRadius: '3px', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', width: '100%' }}>
      <div style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #22c55e, #34d399)', borderRadius: '3px 0 0 3px', transition: 'width 0.3s' }} />
      <div style={{ width: `${100 - pct}%`, background: 'linear-gradient(90deg, #f87171, #ef4444)', borderRadius: '0 3px 3px 0', transition: 'width 0.3s' }} />
    </div>
  );
};

/* ── main component ───────────────────────────────────────────────── */

const MarketsTab = React.memo(({ ctx }) => {
  const {
    markets, marketSearch, setMarketSearch, marketSort, setMarketSort,
    marketPlatform, setMarketPlatform, marketsShown, setMarketsShown,
    addToWatchlist, watchlistData, setTradeModal, setTradeSide, connected,
  } = ctx;

  const [expanded, setExpanded] = useState(new Set());
  const [category, setCategory] = useState('All');
  const [sortDir, setSortDir] = useState('desc');

  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  /* ── derived stats ──────────────────────────────────────── */
  const stats = useMemo(() => {
    const poly   = markets.filter(m => m.platform !== 'KALSHI').length;
    const kalshi = markets.filter(m => m.platform === 'KALSHI').length;
    const vol    = markets.reduce((s, m) => s + (m.volume24hr || 0), 0);
    const liq    = markets.length > 0 ? markets.reduce((s, m) => s + (m.liquidity || 0), 0) / markets.length : 0;
    const watched = watchlistData.filter(w => markets.some(m => m.conditionId === w.conditionId)).length;
    return { total: markets.length, poly, kalshi, vol, liq, watched };
  }, [markets, watchlistData]);

  /* ── category counts (after platform + search filter) ───── */
  const catCounts = useMemo(() => {
    const base = markets.filter(m => {
      if (marketPlatform !== 'ALL' && m.platform !== marketPlatform) return false;
      if (marketSearch && !(m.question || '').toLowerCase().includes(marketSearch.toLowerCase())) return false;
      return true;
    });
    const c = { All: base.length };
    base.forEach(m => { const cat = detectCategory(m.question); c[cat] = (c[cat] || 0) + 1; });
    return c;
  }, [markets, marketPlatform, marketSearch]);

  /* ── filter + sort ──────────────────────────────────────── */
  const { filtered, shown } = useMemo(() => {
    let arr = markets.filter(m => {
      if (marketPlatform !== 'ALL' && m.platform !== marketPlatform) return false;
      if (marketSearch && !(m.question || '').toLowerCase().includes(marketSearch.toLowerCase())) return false;
      if (category !== 'All' && detectCategory(m.question) !== category) return false;
      return true;
    });
    const dir = sortDir === 'desc' ? -1 : 1;
    arr = [...arr].sort((a, b) => {
      if (marketSort === 'yes')       return dir * ((b.yesPrice || 0) - (a.yesPrice || 0));
      if (marketSort === 'liquidity') return dir * ((b.liquidity || 0) - (a.liquidity || 0));
      return dir * ((b.volume24hr || 0) - (a.volume24hr || 0));
    });
    return { filtered: arr, shown: arr.slice(0, marketsShown) };
  }, [markets, marketPlatform, marketSearch, category, marketSort, sortDir, marketsShown]);

  const isWatched = (id) => watchlistData.some(w => w.conditionId === id);

  /* ── context line ───────────────────────────────────────── */
  const parts = [];
  if (category !== 'All') parts.push(category);
  if (marketPlatform !== 'ALL') parts.push(marketPlatform === 'KALSHI' ? 'Kalshi' : 'Polymarket');
  if (marketSearch) parts.push(`"${marketSearch}"`);
  const filterLabel = parts.length
    ? `${filtered.length} of ${stats.total} · ${parts.join(' · ')}`
    : `${filtered.length} markets`;

  return (
    <Grid>
      {/* ── Stats Hero ────────────────────────────────────── */}
      <FullWidthSection>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: '0.4rem' }}>
          <MetricTile label="Total Markets" value={stats.total} color="#a5b4fc" />
          <MetricTile label="Polymarket" value={stats.poly} color="#a78bfa" />
          <MetricTile label="Kalshi" value={stats.kalshi} color="#60a5fa" />
          <MetricTile label="Volume 24h" value={fmtVol(stats.vol)} color="#fbbf24" />
          <MetricTile label="Avg Liquidity" value={fmtVol(stats.liq)} color="#34d399" />
          <MetricTile label="Watching" value={stats.watched} color="#f59e0b" />
        </div>
      </FullWidthSection>

      {/* ── Filters & Sort ────────────────────────────────── */}
      <FullWidthSection>
        <Card $delay="0.05s">
          {/* Search + Platform */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Input type="text" placeholder="🔍 Search markets..."
              value={marketSearch} onChange={e => setMarketSearch(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.65rem', flex: '1 1 180px', minWidth: 0 }}
              aria-label="Search markets" />
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {[{ k: 'ALL', l: '🌐 All' }, { k: 'POLYMARKET', l: '🟣 Poly' }, { k: 'KALSHI', l: '🔵 Kalshi' }].map(p => (
                <Button key={p.k} $variant={marketPlatform === p.k ? 'primary' : 'ghost'}
                  onClick={() => setMarketPlatform(p.k)}
                  style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}>
                  {p.l}
                </Button>
              ))}
            </div>
          </div>

          {/* Category chips */}
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
            {Object.entries(CATEGORIES).filter(([k]) => k === 'All' || (catCounts[k] || 0) > 0).map(([key, cfg]) => (
              <Button key={key} $variant={category === key ? 'primary' : 'ghost'}
                onClick={() => { setCategory(key); setMarketsShown(20); }}
                style={{
                  fontSize: '0.7rem', padding: '0.25rem 0.55rem',
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                  ...(category === key ? { background: `${cfg.color}18`, borderColor: `${cfg.color}40`, color: cfg.color } : {}),
                }}>
                <span>{cfg.icon}</span>{key}
                <span style={{
                  fontSize: '0.58rem', fontWeight: 700,
                  background: category === key ? `${cfg.color}22` : 'rgba(255,255,255,0.05)',
                  padding: '0.06rem 0.28rem', borderRadius: '8px',
                  color: category === key ? cfg.color : '#475569',
                }}>{catCounts[key] || 0}</span>
              </Button>
            ))}
          </div>

          {/* Sort + context */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Sort:</span>
            {SORT_OPTIONS.map(s => (
              <Button key={s.key} $variant={marketSort === s.key ? 'primary' : 'ghost'}
                onClick={() => setMarketSort(s.key)}
                style={{ fontSize: '0.68rem', padding: '0.22rem 0.5rem' }}>
                {s.icon} {s.label}
              </Button>
            ))}
            <Button $variant="ghost"
              onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
              style={{ fontSize: '0.75rem', padding: '0.22rem 0.45rem' }}
              title={sortDir === 'desc' ? 'Highest first' : 'Lowest first'}>
              {sortDir === 'desc' ? '↓' : '↑'}
            </Button>
            <span style={{ fontSize: '0.68rem', color: '#475569', marginLeft: 'auto' }}>{filterLabel}</span>
          </div>
        </Card>
      </FullWidthSection>

      {/* ── Market Cards ──────────────────────────────────── */}
      <FullWidthSection>
        {!connected && markets.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{
                background: 'rgba(30,30,50,0.5)', borderRadius: '12px', padding: '1rem',
                border: '1px solid rgba(99,102,241,0.06)',
              }}>
                <div style={{ height: '14px', width: `${55 + i * 6}%`, background: 'rgba(99,102,241,0.08)', borderRadius: '4px', marginBottom: '0.6rem' }} />
                <div style={{ height: '5px', width: '100%', background: 'rgba(99,102,241,0.04)', borderRadius: '3px', marginBottom: '0.5rem' }} />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ height: '10px', width: '55px', background: 'rgba(99,102,241,0.06)', borderRadius: '3px' }} />
                  <div style={{ height: '10px', width: '75px', background: 'rgba(99,102,241,0.06)', borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : shown.length === 0 ? (
          <Card $delay="0.1s">
            <EmptyState>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🌐</div>
              <div style={{ fontSize: '1rem', color: '#e2e8f0', fontWeight: 600, marginBottom: '0.4rem' }}>
                {markets.length === 0 ? 'Connecting to markets...' : 'No markets match your filters'}
              </div>
              <div style={{ color: '#64748b', maxWidth: '400px' }}>
                {markets.length === 0
                  ? 'Live markets from Polymarket & Kalshi will appear here once connected.'
                  : 'Try broadening your search, changing the category, or switching platforms.'}
              </div>
            </EmptyState>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {shown.map((m, i) => {
              const id = m.conditionId || `m-${i}`;
              const isExp = expanded.has(id);
              const watched = isWatched(id);
              const cat = detectCategory(m.question);
              const catCfg = CATEGORIES[cat] || CATEGORIES.Other;
              const spread = Math.abs(1 - (m.yesPrice || 0) - (m.noPrice || 0));

              return (
                <div key={id} style={{
                  background: 'rgba(30,30,50,0.7)', borderRadius: '12px',
                  border: `1px solid ${watched ? 'rgba(251,191,36,0.2)' : 'rgba(99,102,241,0.08)'}`,
                  overflow: 'hidden', transition: 'border-color 0.2s',
                }}>
                  {/* Collapsed row */}
                  <div onClick={() => toggle(id)} style={{
                    padding: '0.7rem 0.85rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                  }}>
                    {/* Platform */}
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: '4px',
                      background: m.platform === 'KALSHI' ? 'rgba(59,130,246,0.15)' : 'rgba(139,92,246,0.15)',
                      color: m.platform === 'KALSHI' ? '#60a5fa' : '#a78bfa', flexShrink: 0,
                    }}>{m.platform === 'KALSHI' ? 'K' : 'P'}</span>

                    {/* Question + price bar */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600, color: '#e2e8f0', fontSize: '0.85rem',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: isExp ? 'normal' : 'nowrap', lineHeight: 1.4,
                      }}>{m.question}</div>
                      {!isExp && <div style={{ marginTop: '0.3rem' }}><MiniPriceBar yes={m.yesPrice} /></div>}
                    </div>

                    {/* Quick stats */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#34d399', fontWeight: 700, fontSize: '0.88rem', fontVariantNumeric: 'tabular-nums' }}>
                          {((m.yesPrice || 0) * 100).toFixed(0)}¢
                        </div>
                        <div style={{ fontSize: '0.5rem', color: '#64748b' }}>YES</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#f87171', fontWeight: 700, fontSize: '0.88rem', fontVariantNumeric: 'tabular-nums' }}>
                          {((m.noPrice || 0) * 100).toFixed(0)}¢
                        </div>
                        <div style={{ fontSize: '0.5rem', color: '#64748b' }}>NO</div>
                      </div>
                      <div style={{ textAlign: 'center', minWidth: '44px' }}>
                        <div style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>
                          {fmtVol(m.volume24hr)}
                        </div>
                        <div style={{ fontSize: '0.5rem', color: '#64748b' }}>VOL</div>
                      </div>
                    </div>

                    {/* Chevron */}
                    <span style={{
                      color: '#475569', fontSize: '0.7rem', flexShrink: 0,
                      transform: isExp ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s', display: 'inline-block',
                    }}>▼</span>
                  </div>

                  {/* Expanded detail */}
                  {isExp && (
                    <div style={{ padding: '0 0.85rem 0.85rem', borderTop: '1px solid rgba(99,102,241,0.06)' }}>
                      {/* Full price bar */}
                      <div style={{ margin: '0.6rem 0' }}>
                        <MiniPriceBar yes={m.yesPrice} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b', marginTop: '0.2rem' }}>
                          <span>YES {((m.yesPrice || 0) * 100).toFixed(1)}¢</span>
                          <span>NO {((m.noPrice || 0) * 100).toFixed(1)}¢</span>
                        </div>
                      </div>

                      {/* Detail metrics grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.35rem', marginBottom: '0.6rem' }}>
                        {[
                          { l: 'Volume 24h', v: fmtVol(m.volume24hr), c: '#fbbf24' },
                          { l: 'Liquidity', v: fmtVol(m.liquidity), c: '#34d399' },
                          { l: 'Spread', v: `${(spread * 100).toFixed(1)}¢`, c: spread > 0.05 ? '#f59e0b' : '#22c55e' },
                          { l: 'Category', v: `${catCfg.icon} ${cat}`, c: catCfg.color },
                        ].map((t, ti) => (
                          <div key={ti} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.4rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: t.c }}>{t.v}</div>
                            <div style={{ fontSize: '0.55rem', color: '#64748b' }}>{t.l}</div>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <Button $variant={watched ? 'primary' : 'ghost'}
                          onClick={e => { e.stopPropagation(); addToWatchlist(m); }}
                          style={{
                            fontSize: '0.75rem', padding: '0.35rem 0.7rem',
                            ...(watched ? { background: 'rgba(251,191,36,0.15)', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)' } : {}),
                          }}>{watched ? '★ Watching' : '☆ Watch'}</Button>
                        <Button $variant="ghost"
                          onClick={e => { e.stopPropagation(); setTradeModal(m); setTradeSide('YES'); }}
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}>
                          📝 Paper Trade
                        </Button>
                        {m.slug && (
                          <a href={`https://polymarket.com/event/${m.slug}`}
                            target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{
                              fontSize: '0.75rem', padding: '0.35rem 0.7rem', color: '#64748b',
                              textDecoration: 'none', border: '1px solid rgba(100,116,139,0.2)',
                              borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            }}>
                            ↗ {m.platform === 'KALSHI' ? 'Kalshi' : 'Polymarket'}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {filtered.length > marketsShown && (
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <Button $variant="ghost" onClick={() => setMarketsShown(prev => prev + 20)}
              style={{ fontSize: '0.82rem', padding: '0.5rem 1.5rem' }}>
              Show More ({filtered.length - marketsShown} remaining)
            </Button>
          </div>
        )}
      </FullWidthSection>
    </Grid>
  );
});

MarketsTab.displayName = 'MarketsTab';

export default MarketsTab;
