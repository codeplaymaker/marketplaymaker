import React from 'react';
import {
  Card, CardTitle, Input, Button, Table, TableRow,
  EmptyState, PriceBar, PriceFill,
} from './SharedStyles';

const MarketsTab = React.memo(({ ctx }) => {
  const {
    markets, marketSearch, setMarketSearch, marketSort, setMarketSort,
    marketPlatform, setMarketPlatform, marketsShown, setMarketsShown,
    addToWatchlist, watchlistData, setTradeModal, setTradeSide, connected,
  } = ctx;

  return (
    <Card $delay="0.1s">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <CardTitle style={{ margin: 0 }}>🌐 Live Markets</CardTitle>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          {(() => { const fm = markets.filter(m => { if (marketPlatform !== 'ALL' && m.platform !== marketPlatform) return false; if (marketSearch && !(m.question || '').toLowerCase().includes(marketSearch.toLowerCase())) return false; return true; }); return `${fm.length} of ${markets.length} markets`; })()}
        </span>
      </div>

      {/* Search + Sort + Platform Filter */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Input
          type="text" placeholder="Search markets..." value={marketSearch}
          onChange={(e) => setMarketSearch(e.target.value)}
          $width="180px" style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}
          aria-label="Search markets"
        />
        <div style={{ display: 'flex', gap: '0.2rem' }}>
          {[{ k: 'ALL', l: 'All' }, { k: 'POLYMARKET', l: '🟣 Poly' }, { k: 'KALSHI', l: '🔵 Kalshi' }].map(p => (
            <Button key={p.k} $variant={marketPlatform === p.k ? 'primary' : 'ghost'} onClick={() => setMarketPlatform(p.k)}
              style={{ fontSize: '0.68rem', padding: '0.25rem 0.5rem' }}>
              {p.l}
            </Button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.15rem', marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.68rem', color: '#64748b', alignSelf: 'center', marginRight: '0.2rem' }}>Sort:</span>
          {[{ k: 'volume', l: '📊 Vol' }, { k: 'yes', l: '📈 Price' }, { k: 'liquidity', l: '💧 Liq' }].map(s => (
            <Button key={s.k} $variant={marketSort === s.k ? 'primary' : 'ghost'} onClick={() => setMarketSort(s.k)}
              style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }}>
              {s.l}
            </Button>
          ))}
        </div>
      </div>

      <Table>
        <TableRow $header $columns="2.5fr 0.7fr 0.7fr 0.8fr 0.8fr 0.7fr">
          <span>Market</span>
          <span>YES</span>
          <span>NO</span>
          <span>Volume 24h</span>
          <span>Liquidity</span>
          <span>Actions</span>
        </TableRow>

        {(() => {
          const filtered = markets
            .filter(m => {
              if (marketPlatform !== 'ALL' && m.platform !== marketPlatform) return false;
              if (marketSearch && !(m.question || '').toLowerCase().includes(marketSearch.toLowerCase())) return false;
              return true;
            })
            .sort((a, b) => {
              if (marketSort === 'yes') return (b.yesPrice || 0) - (a.yesPrice || 0);
              if (marketSort === 'liquidity') return (b.liquidity || 0) - (a.liquidity || 0);
              return (b.volume24hr || 0) - (a.volume24hr || 0);
            });
          const shown = filtered.slice(0, marketsShown);
          return shown.length === 0 ? (
            <EmptyState>
              {markets.length === 0
                ? (connected ? 'Loading markets...' : 'Connect to server to see live markets')
                : `No markets match "${marketSearch}". Try a different search.`}
            </EmptyState>
          ) : (
            <>
              {shown.map((m, i) => (
                <TableRow key={m.conditionId || i} $columns="2.5fr 0.7fr 0.7fr 0.8fr 0.8fr 0.7fr">
                  <div>
                    <div style={{ fontWeight: 500, color: '#e2e8f0', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.05rem 0.3rem', borderRadius: '3px', background: m.platform === 'KALSHI' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)', color: m.platform === 'KALSHI' ? '#60a5fa' : '#a78bfa', flexShrink: 0 }}>{m.platform === 'KALSHI' ? 'K' : 'P'}</span>
                      <span>{m.question?.length > 55 ? m.question.slice(0, 52) + '...' : m.question}</span>
                    </div>
                    <PriceBar>
                      <PriceFill $pct={(m.yesPrice || 0.5) * 100} />
                    </PriceBar>
                  </div>
                  <span style={{ color: '#34d399', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {m.yesPrice?.toFixed(2) || '—'}¢
                  </span>
                  <span style={{ color: '#f87171', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {m.noPrice?.toFixed(2) || '—'}¢
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: '#94a3b8' }}>
                    ${m.volume24hr >= 1000000 ? (m.volume24hr / 1000000).toFixed(1) + 'M' : m.volume24hr >= 1000 ? (m.volume24hr / 1000).toFixed(1) + 'K' : m.volume24hr?.toFixed(0) || '0'}
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: '#94a3b8' }}>
                    ${m.liquidity >= 1000 ? (m.liquidity / 1000).toFixed(1) + 'K' : m.liquidity?.toFixed(0) || '0'}
                  </span>
                  <span style={{ display: 'flex', gap: '0.25rem' }}>
                    <Button $variant="ghost" onClick={() => addToWatchlist(m)} style={{ fontSize: '0.7rem', padding: '0.2rem 0.35rem' }} title="Add to watchlist">
                      {watchlistData.some(w => w.conditionId === m.conditionId) ? '★' : '☆'}
                    </Button>
                    <Button $variant="ghost" onClick={() => { setTradeModal(m); setTradeSide('YES'); }} style={{ fontSize: '0.7rem', padding: '0.2rem 0.35rem' }} title="Paper trade">
                      📝
                    </Button>
                    {m.slug && (
                      <a href={`https://polymarket.com/event/${m.slug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', padding: '0.2rem 0.3rem', color: '#64748b', textDecoration: 'none' }} title="View on Polymarket">
                        ↗
                      </a>
                    )}
                  </span>
                </TableRow>
              ))}
              {filtered.length > marketsShown && (
                <div style={{ textAlign: 'center', padding: '0.75rem' }}>
                  <Button $variant="ghost" onClick={() => setMarketsShown(prev => prev + 20)} style={{ fontSize: '0.78rem', padding: '0.4rem 1.2rem' }}>
                    Show More ({filtered.length - marketsShown} remaining)
                  </Button>
                </div>
              )}
            </>
          );
        })()}
      </Table>
    </Card>
  );
});

MarketsTab.displayName = 'MarketsTab';

export default MarketsTab;
