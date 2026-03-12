import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';

/* ═══════════════════════════════════════════════════════════
   ICT ALERTS — Live Playbook Analysis Dashboard
   Ported from ICT-Playbook-Strategy-v2.pine
   Shows premium/discount zones + confluence scoring per market
   ═══════════════════════════════════════════════════════════ */

const T = {
  bg: '#09090b',
  surface: '#111113',
  surfaceHover: '#18181b',
  border: '#27272a',
  text: '#fafafa',
  textMuted: '#a1a1aa',
  textDim: '#71717a',
  accent: '#22d3ee',
  green: '#4ade80',
  red: '#f87171',
  amber: '#fbbf24',
  purple: '#c084fc',
};

/* ── API helper ── */
async function api(path) {
  const resp = await fetch(`/polybot${path}`, { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) throw new Error(`${resp.status}`);
  return resp.json();
}

/* ── Formatters ── */
const fmt = (n, d = 2) => {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: d });
  return n.toFixed(d);
};

/* ── Zone color ── */
const zoneColor = (zone) => {
  if (zone === 'PREMIUM') return T.red;
  if (zone === 'DISCOUNT') return T.green;
  return T.textDim;
};

const zoneBg = (zone) => {
  if (zone === 'PREMIUM') return 'rgba(248,113,113,0.12)';
  if (zone === 'DISCOUNT') return 'rgba(74,222,128,0.12)';
  return 'rgba(113,113,122,0.08)';
};

const biasColor = (bias) => {
  if (bias === 'BULLISH') return T.green;
  if (bias === 'BEARISH') return T.red;
  return T.textDim;
};

const alertBg = (level) => {
  if (level === 'HIGH') return 'rgba(74,222,128,0.15)';
  if (level === 'MODERATE') return 'rgba(251,191,36,0.12)';
  return 'transparent';
};

/* ═══════════════════════════════════════════════════════════
   CONFLUENCE CHECKLIST
   ═══════════════════════════════════════════════════════════ */
const FACTOR_META = [
  { key: 'structure', label: 'Structure', icon: '📐', desc: 'HH/HL or LH/LL present' },
  { key: 'fvg', label: 'FVG', icon: '📊', desc: 'Price at active Fair Value Gap' },
  { key: 'ob', label: 'Order Block', icon: '🧱', desc: 'Price at active Order Block' },
  { key: 'ote', label: 'OTE Zone', icon: '🎯', desc: 'Price in 62-79% Fib zone' },
  { key: 'liqSweep', label: 'Liq Sweep', icon: '💧', desc: 'Liquidity swept + reclaimed' },
  { key: 'eqLevel', label: 'EQH/EQL', icon: '⚖️', desc: 'Equal highs/lows present' },
  { key: 'breaker', label: 'Breaker', icon: '🔄', desc: 'Failed OB acting as S/R' },
];

function ConfluenceChecklist({ factors }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
      {FACTOR_META.map(f => {
        const hit = factors?.[f.key];
        return (
          <div
            key={f.key}
            title={f.desc}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              padding: '0.2rem 0.45rem',
              borderRadius: '6px',
              fontSize: '0.68rem',
              fontWeight: 600,
              background: hit ? 'rgba(74,222,128,0.12)' : 'rgba(39,39,42,0.5)',
              color: hit ? T.green : T.textDim,
              border: `1px solid ${hit ? 'rgba(74,222,128,0.2)' : 'rgba(39,39,42,0.4)'}`,
              cursor: 'default',
              transition: 'all 0.2s',
            }}
          >
            <span>{f.icon}</span>
            <span>{f.label}</span>
            <span>{hit ? '✓' : '—'}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MARKET CARD
   ═══════════════════════════════════════════════════════════ */

function MarketCard({ m }) {
  const [expanded, setExpanded] = useState(false);

  if (m.error) {
    return (
      <div style={{
        background: T.surface, borderRadius: '12px', padding: '1rem 1.25rem',
        border: `1px solid ${T.border}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: T.text, fontSize: '0.95rem' }}>{m.symbol}</span>
          <span style={{ color: T.red, fontSize: '0.75rem' }}>Offline</span>
        </div>
        <div style={{ color: T.textDim, fontSize: '0.72rem', marginTop: '0.3rem' }}>{m.error}</div>
      </div>
    );
  }

  const pd = m.premiumDiscount || {};
  const conf = m.confluence || { score: 0, max: 7, factors: {} };
  const struct = m.structure || {};
  const liq = m.liquidity || {};
  const ote = m.ote || {};

  return (
    <div
      style={{
        background: alertBg(m.alertLevel) || T.surface,
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        border: `1px solid ${m.alertLevel === 'HIGH' ? 'rgba(74,222,128,0.25)' : m.alertLevel === 'MODERATE' ? 'rgba(251,191,36,0.2)' : T.border}`,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* ── Header Row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontWeight: 800, color: T.text, fontSize: '1rem', letterSpacing: '-0.02em' }}>
            {m.symbol}
          </span>
          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
            ${fmt(m.lastPrice)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {/* Bias badge */}
          <span style={{
            fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem',
            borderRadius: '999px', color: biasColor(m.bias),
            background: m.bias === 'BULLISH' ? 'rgba(74,222,128,0.12)' : m.bias === 'BEARISH' ? 'rgba(248,113,113,0.12)' : 'rgba(39,39,42,0.5)',
            border: `1px solid ${biasColor(m.bias)}22`,
          }}>
            {m.bias === 'BULLISH' ? '▲ BULL' : m.bias === 'BEARISH' ? '▼ BEAR' : '— NEUTRAL'}
          </span>
          {/* Zone badge */}
          <span style={{
            fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem',
            borderRadius: '999px', color: zoneColor(pd.zone),
            background: zoneBg(pd.zone),
            border: `1px solid ${zoneColor(pd.zone)}22`,
          }}>
            {pd.zone || 'N/A'} {pd.pct != null ? `${pd.pct}%` : ''}
          </span>
        </div>
      </div>

      {/* ── Confluence bar ── */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.7rem', color: T.textMuted, fontWeight: 600 }}>
            Confluence
          </span>
          <span style={{
            fontSize: '0.72rem', fontWeight: 800,
            color: conf.score >= 4 ? T.green : conf.score >= 2 ? T.amber : T.textDim,
          }}>
            {conf.score}/{conf.max}
          </span>
        </div>
        <div style={{
          height: '4px', background: 'rgba(39,39,42,0.6)', borderRadius: '2px', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: '2px',
            width: `${(conf.score / conf.max) * 100}%`,
            background: conf.score >= 4 ? T.green : conf.score >= 2 ? T.amber : T.textDim,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* ── Info strip ── */}
      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.68rem', color: T.textMuted, flexWrap: 'wrap' }}>
        <span>Structure: <strong style={{ color: struct.isHH && struct.isHL ? T.green : struct.isLL && struct.isLH ? T.red : T.textDim }}>{struct.state || '—'}</strong></span>
        <span>FVGs: <strong style={{ color: m.activeFVGs > 0 ? T.green : T.textDim }}>{m.activeFVGs ?? 0}</strong></span>
        <span>OBs: <strong style={{ color: m.activeOBs > 0 ? T.accent : T.textDim }}>{m.activeOBs ?? 0}</strong></span>
        <span>OTE: <strong style={{ color: ote.inZone ? T.purple : T.textDim }}>{ote.inZone ? 'IN ZONE' : ote.active ? 'Active' : '—'}</strong></span>
        {liq.hasEQH && <span style={{ color: T.amber }}>⚖️ EQH</span>}
        {liq.hasEQL && <span style={{ color: T.amber }}>⚖️ EQL</span>}
        {liq.bullLiqSweep && <span style={{ color: T.green }}>💧 BSL Swept</span>}
        {liq.bearLiqSweep && <span style={{ color: T.red }}>💧 SSL Swept</span>}
      </div>

      {/* ── Expanded: Confluence checklist ── */}
      {expanded && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: `1px solid ${T.border}` }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.4rem' }}>
            Confluence Factors
          </div>
          <ConfluenceChecklist factors={conf.factors} score={conf.score} max={conf.max} />

          {/* OTE details */}
          {ote.active && (
            <div style={{ marginTop: '0.6rem', fontSize: '0.68rem', color: T.textDim }}>
              <span style={{ fontWeight: 600, color: T.purple }}>OTE Zone: </span>
              ${fmt(ote.zoneLow)} — ${fmt(ote.zoneHigh)}
              <span style={{ marginLeft: '0.5rem' }}>Sweet: ${fmt(ote.sweetSpot)}</span>
            </div>
          )}

          {/* Swing range */}
          <div style={{ marginTop: '0.4rem', fontSize: '0.68rem', color: T.textDim }}>
            <span style={{ fontWeight: 600 }}>Range: </span>
            ${fmt(pd.swingLow)} — ${fmt(pd.swingHigh)}
            <span style={{ marginLeft: '0.5rem' }}>EQ: ${fmt(pd.equilibrium)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUMMARY STRIP
   ═══════════════════════════════════════════════════════════ */

function SummaryStrip({ summary, count }) {
  const kpis = [
    { label: 'Markets', value: count, color: T.accent, icon: '🌐' },
    { label: 'Premium', value: summary.premium, color: T.red, icon: '🔴' },
    { label: 'Discount', value: summary.discount, color: T.green, icon: '🟢' },
    { label: 'Bullish', value: summary.bullish, color: T.green, icon: '▲' },
    { label: 'Bearish', value: summary.bearish, color: T.red, icon: '▼' },
    { label: 'High Conf', value: summary.highConf, color: T.amber, icon: '⚡' },
  ];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
      gap: '0.4rem', marginBottom: '1.5rem',
    }}>
      {kpis.map((k, i) => (
        <div key={i} style={{
          background: T.surface, borderRadius: '10px', padding: '0.6rem 0.4rem',
          textAlign: 'center', border: `1px solid ${T.border}`,
        }}>
          <div style={{ fontSize: '0.65rem', marginBottom: '0.1rem' }}>{k.icon}</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: k.color, fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
          <div style={{ fontSize: '0.55rem', color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function ICTAlerts() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [interval, setInterval_] = useState('1h');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api(`/ict/analyze?interval=${interval}`);
      setData(result);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message === '502' ? 'Bot server offline — run: cd bot && npm start' : `Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [interval]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(fetchData, 60_000);
    return () => window.clearInterval(id);
  }, [autoRefresh, fetchData]);

  const INTERVALS = ['15m', '30m', '1h', '4h', '1d'];

  return (
    <div style={{
      background: T.bg, minHeight: '100vh', color: T.text,
      fontFamily: "'Inter', -apple-system, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>
      <Helmet>
        <title>ICT Alerts — MarketPlayMaker</title>
      </Helmet>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        {/* ── Header ── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h1 style={{
                fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em',
                margin: '0 0 0.25rem', color: T.text,
              }}>
                ICT Playbook Alerts
              </h1>
              <p style={{ color: T.textMuted, fontSize: '0.82rem', margin: 0 }}>
                Live premium/discount zones &amp; confluence scoring — ported from the Pine Script engine
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              {/* Interval selector */}
              {INTERVALS.map(iv => (
                <button
                  key={iv}
                  onClick={() => setInterval_(iv)}
                  style={{
                    padding: '0.3rem 0.6rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '0.72rem', fontWeight: 600, fontFamily: "'Inter', sans-serif",
                    background: iv === interval ? T.accent : T.surface,
                    color: iv === interval ? '#000' : T.textMuted,
                    transition: 'all 0.15s',
                  }}
                >
                  {iv}
                </button>
              ))}

              {/* Refresh button */}
              <button
                onClick={fetchData}
                disabled={loading}
                style={{
                  padding: '0.3rem 0.6rem', borderRadius: '6px', border: `1px solid ${T.border}`,
                  cursor: loading ? 'wait' : 'pointer', fontSize: '0.72rem', fontWeight: 600,
                  background: T.surface, color: T.textMuted, fontFamily: "'Inter', sans-serif",
                  marginLeft: '0.25rem',
                }}
              >
                {loading ? '⟳' : '↻'} Refresh
              </button>
            </div>
          </div>

          {/* Status bar */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.6rem', fontSize: '0.68rem', color: T.textDim }}>
            {lastRefresh && (
              <span>Updated: {lastRefresh.toLocaleTimeString()}</span>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ accentColor: T.accent }}
              />
              Auto-refresh (60s)
            </label>
          </div>
        </div>

        {/* ── Error state ── */}
        {error && (
          <div style={{
            background: T.surface, borderRadius: '12px', padding: '1.5rem',
            border: `1px solid rgba(251,191,36,0.3)`, marginBottom: '1.5rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📡</div>
            <div style={{ color: T.amber, fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.3rem' }}>Connection Issue</div>
            <div style={{ color: T.textMuted, fontSize: '0.8rem' }}>{error}</div>
            <code style={{
              display: 'block', background: 'rgba(0,0,0,0.4)', padding: '0.5rem 0.75rem',
              borderRadius: '8px', color: '#a5b4fc', fontSize: '0.78rem', marginTop: '0.75rem',
            }}>
              cd bot &amp;&amp; npm start
            </code>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && !data && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: T.textDim }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
            Analyzing markets...
          </div>
        )}

        {/* ── Data ── */}
        {data && (
          <>
            <SummaryStrip summary={data.summary} count={data.count} />

            {/* High confluence alert banner */}
            {data.summary.highConf > 0 && (
              <div style={{
                background: 'rgba(74,222,128,0.08)', border: `1px solid rgba(74,222,128,0.2)`,
                borderRadius: '10px', padding: '0.65rem 1rem', marginBottom: '1rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <span style={{ fontSize: '1.1rem' }}>⚡</span>
                <span style={{ color: T.green, fontWeight: 700, fontSize: '0.82rem' }}>
                  {data.summary.highConf} market{data.summary.highConf > 1 ? 's' : ''} with high confluence (3+ factors)
                </span>
              </div>
            )}

            {/* Market cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {data.results.map((m, i) => (
                <MarketCard key={m.binanceSymbol || m.symbol || i} m={m} />
              ))}
            </div>

            {/* Legend */}
            <div style={{
              marginTop: '2rem', padding: '1rem', background: T.surface,
              borderRadius: '10px', border: `1px solid ${T.border}`,
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.textMuted, marginBottom: '0.5rem' }}>
                How It Works
              </div>
              <div style={{ fontSize: '0.68rem', color: T.textDim, lineHeight: 1.7 }}>
                <strong style={{ color: T.green }}>DISCOUNT</strong> = Price below 38% of swing range (buy zone) &nbsp;|&nbsp;
                <strong style={{ color: T.red }}>PREMIUM</strong> = Price above 62% of swing range (sell zone) &nbsp;|&nbsp;
                <strong style={{ color: T.textMuted }}>EQUILIBRIUM</strong> = 38-62% (no-trade zone)
                <br />
                <strong>Confluence</strong> scores 0-7 factors: Structure, FVG, Order Block, OTE Zone, Liquidity Sweep, EQH/EQL, Breaker Block.
                Higher score = stronger setup. Click a card to expand the checklist.
                <br />
                <em>Engine ported from ICT Playbook Pine Script v3 — same logic, live on your dashboard.</em>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
