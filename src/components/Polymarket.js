import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Helmet } from 'react-helmet-async';

// In production, REACT_APP_BOT_URL points to the deployed Railway bot server.
// In dev, empty string uses the local proxy (/polybot → localhost:4000/api).
const BOT_API = process.env.REACT_APP_BOT_URL || '';

// ─── Animations ──────────────────────────────────────────────────────
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 5px rgba(99, 102, 241, 0.3); }
  50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.6); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// ─── Styled Components ───────────────────────────────────────────────
const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
  color: #e2e8f0;
  padding: 2rem 1rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  @media (min-width: 768px) {
    padding: 2rem;
  }
`;

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 2rem;
  animation: ${slideUp} 0.6s ease-out;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #818cf8, #6366f1, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;

  @media (min-width: 768px) {
    font-size: 3rem;
  }
`;

const Subtitle = styled.p`
  color: #94a3b8;
  font-size: 1.1rem;
  max-width: 600px;
  margin: 0 auto;
`;

const Grid = styled.div`
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const FullWidthSection = styled.div`
  grid-column: 1 / -1;
`;

const Card = styled.div`
  background: rgba(30, 30, 50, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  animation: ${slideUp} 0.6s ease-out;
  animation-delay: ${(props) => props.$delay || '0s'};
  animation-fill-mode: both;

  &:hover {
    border-color: rgba(99, 102, 241, 0.4);
    transform: translateY(-2px);
  }

  ${(props) =>
    props.$glow &&
    css`
      animation: ${glow} 2s ease-in-out infinite;
    `}
`;

const CardTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 700;
  color: #c7d2fe;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatCard = styled.div`
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 800;
  color: ${(props) => props.$color || '#818cf8'};
  font-variant-numeric: tabular-nums;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.25rem;
`;

const Button = styled.button`
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.85rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${(props) =>
    props.$variant === 'primary' &&
    css`
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      &:hover:not(:disabled) {
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
      }
    `}

  ${(props) =>
    props.$variant === 'danger' &&
    css`
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      &:hover:not(:disabled) {
        box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
      }
    `}

  ${(props) =>
    props.$variant === 'success' &&
    css`
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
    `}

  ${(props) =>
    props.$variant === 'ghost' &&
    css`
      background: rgba(99, 102, 241, 0.1);
      color: #a5b4fc;
      border: 1px solid rgba(99, 102, 241, 0.2);
      &:hover:not(:disabled) {
        background: rgba(99, 102, 241, 0.2);
      }
    `}
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  ${(props) =>
    props.$type === 'running' &&
    css`
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    `}
  ${(props) =>
    props.$type === 'stopped' &&
    css`
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    `}
  ${(props) =>
    props.$type === 'simulation' &&
    css`
      background: rgba(251, 191, 36, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(251, 191, 36, 0.3);
    `}
  ${(props) =>
    props.$type === 'high' &&
    css`
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
    `}
  ${(props) =>
    props.$type === 'medium' &&
    css`
      background: rgba(251, 191, 36, 0.15);
      color: #fbbf24;
    `}
  ${(props) =>
    props.$type === 'low' &&
    css`
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
    `}
`;

const Input = styled.input`
  background: rgba(15, 15, 26, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  padding: 0.6rem 1rem;
  color: #e2e8f0;
  font-size: 0.9rem;
  width: ${(props) => props.$width || '120px'};
  font-variant-numeric: tabular-nums;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }
`;

const Table = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: ${(props) => props.$columns || '2fr 1fr 1fr 1fr 1fr'};
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(99, 102, 241, 0.08);
  align-items: center;
  font-size: 0.85rem;
  min-width: 600px;

  &:last-child {
    border-bottom: none;
  }

  ${(props) =>
    props.$header &&
    css`
      color: #64748b;
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    `}

  &:not(:first-child):hover {
    background: rgba(99, 102, 241, 0.05);
    border-radius: 8px;
  }
`;

const PriceBar = styled.div`
  height: 6px;
  background: rgba(99, 102, 241, 0.15);
  border-radius: 3px;
  overflow: hidden;
  width: 100%;
`;

const PriceFill = styled.div`
  height: 100%;
  width: ${(props) => props.$pct}%;
  background: ${(props) =>
    props.$pct > 70
      ? 'linear-gradient(90deg, #10b981, #34d399)'
      : props.$pct > 40
      ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
      : 'linear-gradient(90deg, #ef4444, #f87171)'};
  border-radius: 3px;
  transition: width 0.5s ease;
`;

const LiveDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(props) => (props.$active ? '#10b981' : '#ef4444')};
  animation: ${(props) => (props.$active ? pulse : 'none')} 2s infinite;
  margin-right: 0.5rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #64748b;
  font-size: 0.9rem;
`;

const LoadingBar = styled.div`
  height: 4px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 1rem;
`;

const LoadingFill = styled.div`
  height: 100%;
  width: 30%;
  background: linear-gradient(90deg, transparent, #6366f1, transparent);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 2px;
`;

const TabBar = styled.div`
  display: flex;
  gap: 0.25rem;
  background: rgba(15, 15, 26, 0.5);
  border-radius: 12px;
  padding: 0.25rem;
  margin-bottom: 1rem;
  overflow-x: auto;
`;

const Tab = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s;
  background: ${(props) => (props.$active ? 'rgba(99, 102, 241, 0.2)' : 'transparent')};
  color: ${(props) => (props.$active ? '#a5b4fc' : '#64748b')};

  &:hover {
    color: #a5b4fc;
    background: rgba(99, 102, 241, 0.1);
  }
`;

const Chip = styled.span`
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  background: ${(props) =>
    props.$strategy === 'NO_BETS'
      ? 'rgba(16, 185, 129, 0.15)'
      : props.$strategy === 'ARBITRAGE'
      ? 'rgba(99, 102, 241, 0.15)'
      : props.$strategy === 'ICT'
      ? 'rgba(168, 85, 247, 0.15)'
      : 'rgba(251, 191, 36, 0.15)'};
  color: ${(props) =>
    props.$strategy === 'NO_BETS'
      ? '#34d399'
      : props.$strategy === 'ARBITRAGE'
      ? '#a5b4fc'
      : props.$strategy === 'ICT'
      ? '#c084fc'
      : '#fbbf24'};
`;

// ─── API Helper ──────────────────────────────────────────────────────
const isProduction = window.location.hostname !== 'localhost';
async function api(path, options = {}) {
  try {
    // In production or when BOT_API is set, rewrite /polybot/... → /api/...
    // In local dev, keep /polybot/... for the CRA proxy
    const resolvedPath = (BOT_API || isProduction)
      ? path.replace(/^\/polybot/, '/api')
      : path;
    const res = await fetch(`${BOT_API}${resolvedPath}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }
    return res.json();
  } catch (err) {
    if (
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('Load failed') ||
      err.message?.includes('NetworkError') ||
      err.message?.includes('ECONNREFUSED')
    ) {
      throw new Error('Bot server offline. Start it with: cd bot && node server.js');
    }
    throw err;
  }
}

// ─── Main Component ──────────────────────────────────────────────────
const Polymarket = () => {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [trades, setTrades] = useState([]);
  const [positions, setPositions] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bankrollInput, setBankrollInput] = useState('1000');
  const [activeTab, setActiveTab] = useState('overview');
  const [oppsFilter, setOppsFilter] = useState('TOP_5');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [oddsApiKey, setOddsApiKey] = useState('');
  const [oddsStatus, setOddsStatus] = useState(null);
  const [oddsMatches, setOddsMatches] = useState(null);
  const pollRef = useRef(null);

  // Manual trade state
  const [tradeModal, setTradeModal] = useState(null); // market object or null
  const [tradeSide, setTradeSide] = useState('YES');
  const [tradeAmount, setTradeAmount] = useState('10');
  const [tradePending, setTradePending] = useState(false);
  const [tradeSuccess, setTradeSuccess] = useState(null);

  // Intelligence features state
  const [watchlistData, setWatchlistData] = useState([]);
  const [alertsData, setAlertsData] = useState({ alerts: [], history: [] });
  const [newAlertType, setNewAlertType] = useState('PRICE_MOVE');
  const [newAlertThreshold, setNewAlertThreshold] = useState('0.05');

  // Independent data sources state
  const [indSourcesStatus, setIndSourcesStatus] = useState(null);
  const [indEdges, setIndEdges] = useState([]);
  const [llmConfigured, setLlmConfigured] = useState(false);
  const [indAnalyzing, setIndAnalyzing] = useState(false);
  const [calibrationData, setCalibrationData] = useState(null);
  const [webhookConfig, setWebhookConfig] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [trackRecord, setTrackRecord] = useState(null);
  const [scanStatus, setScanStatus] = useState(null);
  const [accaData, setAccaData] = useState(null);
  const [accaBuilding, setAccaBuilding] = useState(false);

  // ─── Data Fetching ───────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [healthData, statusData, marketsData, oppsData, tradesData, posData, perfData, kalshiMkts, wlData, alertData] = await Promise.all([
        api('/polybot/health').catch(() => null),
        api('/polybot/bot/status').catch(() => null),
        api('/polybot/markets?limit=30').catch(() => []),
        api('/polybot/opportunities?limit=500').catch(() => []),
        api('/polybot/trades?limit=50').catch(() => []),
        api('/polybot/positions').catch(() => []),
        api('/polybot/performance').catch(() => null),
        api('/polybot/kalshi/markets?limit=30').catch(() => []),
        api('/polybot/intel/watchlist').catch(() => []),
        api('/polybot/intel/alerts').catch(() => ({ alerts: [], history: [] })),
      ]);

      setConnected(healthData?.status === 'ok');
      setStatus(statusData);
      // Merge Polymarket + Kalshi markets, tag Polymarket ones
      const polyTagged = (Array.isArray(marketsData) ? marketsData : []).map(m => ({ ...m, platform: m.platform || 'POLYMARKET' }));
      const kalshiTagged = Array.isArray(kalshiMkts) ? kalshiMkts : [];
      const merged = [...polyTagged, ...kalshiTagged].sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0));
      setMarkets(merged);
      setOpportunities(oppsData);
      setTrades(tradesData);
      setPositions(posData);
      setPerformance(perfData);
      setWatchlistData(Array.isArray(wlData) ? wlData : []);
      setAlertsData(alertData || { alerts: [], history: [] });

      // Fetch independent sources status (non-blocking, not every poll)
      api('/polybot/intel/independent/status').then(s => {
        if (s) setIndSourcesStatus(s);
        if (s?.llm?.configured) setLlmConfigured(true);
      }).catch(() => {});
      // Load cached scan results (instant — no waiting for fresh analysis)
      api('/polybot/intel/independent/cached?minQuality=0').then(data => {
        if (data?.results?.length > 0) {
          const edges = data.results.filter(r => r.edgeSignal === 'STRONG' || r.edgeSignal === 'MODERATE');
          if (edges.length > 0) setIndEdges(edges);
          setScanStatus({ lastScan: data.lastScan, nextScan: data.nextScan, scanRunning: data.scanRunning, total: data.totalCached });
        }
      }).catch(() => {});
      api('/polybot/intel/calibration').then(c => {
        if (c) setCalibrationData(c);
      }).catch(() => {});
      api('/polybot/intel/webhooks').then(w => {
        if (w) setWebhookConfig(w);
      }).catch(() => {});
      api('/polybot/intel/track-record').then(t => {
        if (t) setTrackRecord(t);
      }).catch(() => {});
      api('/polybot/accas').then(a => {
        if (a) setAccaData(a);
      }).catch(() => {});

      setError(null);
    } catch (err) {
      setConnected(false);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(fetchAll, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchAll]);

  // ─── Bot Controls ────────────────────────────────────────────────
  const startBot = async () => {
    try {
      await api('/polybot/bot/start', {
        method: 'POST',
        body: JSON.stringify({ bankroll: parseFloat(bankrollInput) || 1000 }),
      });
      fetchAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const stopBot = async () => {
    try {
      await api('/polybot/bot/stop', { method: 'POST' });
      fetchAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const triggerScan = async () => {
    setScanning(true);
    setError(null);
    setScanResult(null);
    try {
      const result = await api('/polybot/opportunities/scan', { method: 'POST' });
      setScanResult(result);
      await fetchAll();
      // Clear the success message after 5 seconds
      setTimeout(() => setScanResult(null), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  const autoExecute = async () => {
    try {
      const result = await api('/polybot/auto-execute', {
        method: 'POST',
        body: JSON.stringify({ maxTrades: 3, minScore: 50 }),
      });
      if (result.executed > 0) {
        fetchAll();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const resetBot = async () => {
    if (!window.confirm('Reset all bot data? This clears positions and trade history.')) return;
    try {
      await api('/polybot/reset', { method: 'POST' });
      fetchAll();
    } catch (err) {
      setError(err.message);
    }
  };

  // ─── Odds API Handlers ────────────────────────────────────────────
  const saveOddsKey = async () => {
    if (!oddsApiKey.trim()) return;
    try {
      const result = await api('/polybot/odds/key', {
        method: 'POST',
        body: JSON.stringify({ key: oddsApiKey.trim() }),
      });
      setOddsStatus(result);
    } catch (err) {
      setError(`Odds API: ${err.message}`);
    }
  };

  const fetchBookmakerOdds = async () => {
    try {
      const result = await api('/polybot/odds/fetch', { method: 'POST' });
      setOddsMatches(result);
      setOddsStatus(result);
      // Re-scan with bookmaker data available
      await fetchAll();
    } catch (err) {
      setError(`Odds fetch: ${err.message}`);
    }
  };

  // Fetch odds status on mount
  useEffect(() => {
    api('/polybot/odds/status').then(setOddsStatus).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Manual Paper Trade ────────────────────────────────────────────
  const placeManualTrade = async () => {
    if (!tradeModal) return;
    setTradePending(true);
    setError(null);
    try {
      const entryPrice = tradeSide === 'YES' ? tradeModal.yesPrice : tradeModal.noPrice;
      await api('/polybot/paper-trades/manual', {
        method: 'POST',
        body: JSON.stringify({
          conditionId: tradeModal.conditionId,
          market: tradeModal.question,
          side: tradeSide,
          amount: parseFloat(tradeAmount),
          entryPrice,
        }),
      });
      setTradeSuccess(`${tradeSide} trade placed: $${tradeAmount} @ ${entryPrice?.toFixed(2)}`);
      setTimeout(() => setTradeSuccess(null), 4000);
      setTradeModal(null);
      setTradeAmount('10');
      fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setTradePending(false);
    }
  };

  const isRunning = status?.scanner?.running;
  const mode = status?.mode || 'SIMULATION';

  // ─── Intelligence Handlers ───────────────────────────────────────
  const addToWatchlist = async (market) => {
    try {
      await api('/polybot/intel/watchlist', {
        method: 'POST',
        body: JSON.stringify({
          conditionId: market.conditionId,
          question: market.question,
          yesPrice: market.yesPrice,
          platform: market.platform,
          slug: market.slug,
        }),
      });
      fetchAll();
    } catch (err) {
      if (!err.message?.includes('Already')) setError(err.message);
    }
  };

  const removeFromWatchlist = async (conditionId) => {
    try {
      await api(`/polybot/intel/watchlist/${conditionId}`, { method: 'DELETE' });
      fetchAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const createNewAlert = async () => {
    try {
      await api('/polybot/intel/alerts', {
        method: 'POST',
        body: JSON.stringify({
          type: newAlertType,
          threshold: parseFloat(newAlertThreshold) || 0.05,
        }),
      });
      fetchAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteAlertById = async (alertId) => {
    try {
      await api(`/polybot/intel/alerts/${alertId}`, { method: 'DELETE' });
      fetchAll();
    } catch (err) {
      setError(err.message);
    }
  };

  // ─── Filtered Opportunities ──────────────────────────────────────
  const filteredOpps = oppsFilter === 'ALL'
    ? opportunities
    : oppsFilter === 'TOP_5'
    ? (() => {
        // Strategy-diverse Top 5: best from each active strategy, then fill by score
        const sorted = [...opportunities].sort((a, b) => (b.score || 0) - (a.score || 0));
        const strategies = ['NO_BETS', 'ARBITRAGE', 'ICT', 'SPORTS_EDGE'];
        const picked = [];
        const usedIds = new Set();
        // 1. Pick best from each strategy
        for (const strat of strategies) {
          const best = sorted.find(o => o.strategy === strat && !usedIds.has(o.conditionId));
          if (best) { picked.push(best); usedIds.add(best.conditionId); }
        }
        // 2. Fill remaining slots up to 5 by score
        for (const o of sorted) {
          if (picked.length >= 5) break;
          if (!usedIds.has(o.conditionId)) { picked.push(o); usedIds.add(o.conditionId); }
        }
        return picked;
      })()
    : opportunities.filter((o) => o.strategy === oppsFilter);

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <PageWrapper>
      <Helmet>
        <title>Market Intelligence | MarketPlayMaker</title>
        <meta name="description" content="Prediction market intelligence platform — cross-platform signals, alerts & analytics for Polymarket & Kalshi" />
      </Helmet>

      <Container>
        <Header>
          <Title>MarketPlayMaker</Title>
          <Subtitle>
            AI-powered prediction market intelligence — independent edge detection across <strong>Polymarket</strong> &amp; <strong>Kalshi</strong> using GPT-4o, Metaculus &amp; Manifold
          </Subtitle>
        </Header>

        {loading && (
          <LoadingBar>
            <LoadingFill />
          </LoadingBar>
        )}

        {error && !connected && (
          <Card $delay="0.1s" style={{ borderColor: 'rgba(251, 191, 36, 0.3)', marginBottom: '1.5rem' }}>
            <CardTitle>⚠️ Server Offline</CardTitle>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Start the intelligence server to power the dashboard:
            </p>
            <code
              style={{
                display: 'block',
                background: 'rgba(0,0,0,0.4)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                color: '#a5b4fc',
                fontSize: '0.85rem',
              }}
            >
              cd bot && npm install && npm start
            </code>
          </Card>
        )}

        {/* Navigation Tabs */}
        <TabBar>
          {['overview', 'signals', 'accas', 'markets', 'watchlist', 'alerts', 'sources', 'trades'].map((tab) => (
            <Tab key={tab} $active={activeTab === tab} onClick={() => setActiveTab(tab)}>
              {tab === 'overview' && '📊 '}
              {tab === 'signals' && '🎯 '}
              {tab === 'accas' && '🎰 '}
              {tab === 'markets' && '🌐 '}
              {tab === 'watchlist' && '⭐ '}
              {tab === 'alerts' && '🔔 '}
              {tab === 'sources' && '🧠 '}
              {tab === 'trades' && '📜 '}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Tab>
          ))}
        </TabBar>

        {/* ── OVERVIEW TAB ──────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <Grid>
            <FullWidthSection>
              <div style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                fontSize: '0.85rem',
                color: '#c4b5fd',
                lineHeight: '1.6',
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem', color: '#e2e8f0' }}>Welcome to MarketPlayMaker Intelligence</div>
                Scan {status?.scanner?.platforms?.polymarket?.markets ? `${status.scanner.platforms.polymarket.markets}+` : ''} prediction markets across Polymarket &amp; Kalshi in real time. AI-powered independent probability estimation finds genuine edges — not circular market-derived signals.
              </div>
            </FullWidthSection>

            {/* Data Source Health — at-a-glance status */}
            <FullWidthSection>
              <Card $delay="0.05s">
                <CardTitle>
                  📡 Data Pipeline
                  <span style={{ marginLeft: 'auto', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 600,
                    background: llmConfigured ? 'rgba(34, 197, 94, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                    color: llmConfigured ? '#22c55e' : '#fbbf24',
                    border: `1px solid ${llmConfigured ? 'rgba(34, 197, 94, 0.3)' : 'rgba(251, 191, 36, 0.3)'}` }}>
                    {llmConfigured ? 'ALL SOURCES LIVE' : 'CONNECTING...'}
                  </span>
                </CardTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                  {[
                    { name: 'GPT-4o', icon: '🧠', ok: llmConfigured, detail: `${indSourcesStatus?.llm?.totalCalls || 0} calls` },
                    { name: 'Metaculus', icon: '📊', ok: (indSourcesStatus?.polling?.sources || []).find(s => s.name === 'Metaculus')?.stats?.successes > 0, detail: 'Superforecasters' },
                    { name: 'Manifold', icon: '🎯', ok: (indSourcesStatus?.expert?.sources || []).find(s => s.name === 'Manifold Markets')?.stats?.successes > 0, detail: 'Cross-platform' },
                    { name: 'Polymarket', icon: '🟣', ok: connected, detail: `${status?.scanner?.platforms?.polymarket?.markets || 0} mkts` },
                    { name: 'Kalshi', icon: '🔵', ok: (status?.scanner?.platforms?.kalshi?.markets || 0) > 0, detail: `${status?.scanner?.platforms?.kalshi?.markets || 0} mkts` },
                  ].map((src, i) => (
                    <div key={i} style={{
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: '10px',
                      padding: '0.6rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      border: `1px solid ${src.ok ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.2)'}`,
                    }}>
                      <span style={{ fontSize: '1.1rem' }}>{src.icon}</span>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: src.ok ? '#e2e8f0' : '#64748b' }}>{src.name}</div>
                        <div style={{ fontSize: '0.65rem', color: src.ok ? '#22c55e' : '#64748b' }}>
                          {src.ok ? `● ${src.detail}` : '○ Offline'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </FullWidthSection>

            {/* Scanner Control Panel */}
            <Card $delay="0.1s" $glow={isRunning}>
              <CardTitle>
                <LiveDot $active={isRunning} />
                Scanner Control
                <Badge $type={isRunning ? 'running' : 'stopped'} style={{ marginLeft: 'auto' }}>
                  {isRunning ? 'RUNNING' : 'STOPPED'}
                </Badge>
              </CardTitle>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
                <label htmlFor="bankroll-input" style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Bankroll $
                </label>
                <Input
                  id="bankroll-input"
                  type="number"
                  value={bankrollInput}
                  onChange={(e) => setBankrollInput(e.target.value)}
                  $width="100px"
                  min="10"
                  aria-label="Bankroll amount in USDC"
                />
                <Badge $type="simulation">{mode}</Badge>
              </div>

              <ButtonGroup>
                {!isRunning ? (
                  <Button $variant="primary" onClick={startBot} disabled={!connected}>
                    ▶ Start Scanner
                  </Button>
                ) : (
                  <Button $variant="danger" onClick={stopBot}>
                    ⏹ Stop
                  </Button>
                )}
                <Button $variant="ghost" onClick={triggerScan} disabled={!connected || scanning}>
                  {scanning ? '⏳ Scanning...' : '🔍 Scan Now'}
                </Button>
                <Button $variant="ghost" onClick={resetBot} disabled={!connected}>
                  🔄 Reset
                </Button>
              </ButtonGroup>

              {/* Scan result toast */}
              {scanResult && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.6rem 1rem',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    background: scanResult.error
                      ? 'rgba(239, 68, 68, 0.12)'
                      : 'rgba(16, 185, 129, 0.12)',
                    border: `1px solid ${scanResult.error ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                    color: scanResult.error ? '#f87171' : '#34d399',
                  }}
                  role="status"
                  aria-live="polite"
                >
                  {scanResult.error
                    ? `❌ Scan failed: ${scanResult.error}`
                    : `✅ Scanned ${scanResult.marketsScanned} markets — found ${scanResult.opportunitiesFound} opportunities`}
                  {!scanResult.error && status?.scanner?.platforms && (
                    <span style={{ color: '#94a3b8', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                      (Poly: {status.scanner.platforms.polymarket?.markets || 0} | Kalshi: {status.scanner.platforms.kalshi?.markets || 0})
                    </span>
                  )}
                </div>
              )}
            </Card>

            {/* Top Independent Edges — the money section */}
            <Card $delay="0.12s">
              <CardTitle>
                🔬 Top Edge Signals
                <Badge $type={indEdges.filter(e => e.edgeQuality >= 35).length > 0 ? 'running' : indEdges.length > 0 ? 'simulation' : 'stopped'} style={{ marginLeft: 'auto' }}>
                  {indEdges.filter(e => e.edgeQuality >= 55).length} B+ · {indEdges.filter(e => e.edgeQuality >= 35 && e.edgeQuality < 55).length} C+ / {indEdges.length} total
                </Badge>
              </CardTitle>
              {indEdges.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                  {scanStatus?.scanRunning ? (
                    <span>⏳ Auto-scan in progress... edges will appear shortly</span>
                  ) : scanStatus?.lastScan ? (
                    <span>No edges found in last scan. Next scan {scanStatus.nextScan ? `at ${new Date(scanStatus.nextScan).toLocaleTimeString()}` : 'soon'}.</span>
                  ) : (
                    <span>⏳ First auto-scan starts ~20s after server boot. Waiting for data...</span>
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {/* Quality floor message */}
                  {indEdges.filter(e => e.edgeQuality >= 35).length === 0 && indEdges.length > 0 && (
                    <div style={{
                      background: 'rgba(251, 191, 36, 0.08)',
                      border: '1px solid rgba(251, 191, 36, 0.2)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.75rem',
                      fontSize: '0.78rem',
                      color: '#fbbf24',
                    }}>
                      ⚠️ No validated edges found yet. Edges backed by ESPN odds, crypto/stock market data, or cross-platform matches are C+ grade or higher. LLM-only edges are D grade — research only.
                    </div>
                  )}
                  {/* Show B+ edges prominently, then C/D in collapsed dimmed section */}
                  {[...indEdges]
                    .sort((a, b) => (b.edgeQuality || 0) - (a.edgeQuality || 0))
                    .filter(e => (e.edgeQuality || 0) >= 35)
                    .slice(0, 8)
                    .map((edge, i) => {
                    const absDivPct = Math.abs(edge.divergence || 0) * 100;
                    const divColor = (edge.divergence || 0) > 0 ? '#22c55e' : '#ef4444';
                    const gradeColor = edge.edgeGrade === 'A' ? '#22c55e' : edge.edgeGrade === 'B' ? '#a5b4fc' : edge.edgeGrade === 'C' ? '#fbbf24' : '#ef4444';
                    const isBPlus = (edge.edgeQuality || 0) >= 55;
                    return (
                      <div key={i} style={{
                        background: isBPlus ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0,0,0,0.2)',
                        borderRadius: '10px',
                        padding: '0.75rem',
                        border: `1px solid ${isBPlus ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.1)'}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: isBPlus ? 600 : 500, flex: 1 }}>
                            {(edge.question || '').length > 55 ? edge.question.slice(0, 52) + '...' : edge.question}
                          </span>
                          {edge.edgeQuality != null && (
                            <span style={{
                              background: `${gradeColor}22`,
                              color: gradeColor,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              border: `1px solid ${gradeColor}44`,
                            }}>
                              {edge.edgeGrade || '?'}:{edge.edgeQuality}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem' }}>
                          <span style={{ color: '#94a3b8' }}>
                            Mkt: <strong style={{ color: '#e2e8f0' }}>{edge.marketPrice != null ? (edge.marketPrice * 100).toFixed(0) + '%' : '—'}</strong>
                          </span>
                          <span style={{ color: '#94a3b8' }}>
                            Ind: <strong style={{ color: '#a5b4fc' }}>{edge.prob != null ? (edge.prob * 100).toFixed(0) + '%' : '—'}</strong>
                          </span>
                          <span style={{ color: divColor, fontWeight: 700, fontSize: '0.85rem' }}>
                            {absDivPct.toFixed(1)}pp {edge.edgeDirection === 'BUY_YES' ? '↑ YES' : edge.edgeDirection === 'BUY_NO' ? '↓ NO' : ''}
                          </span>
                          <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                              {edge.sourceCount || edge.validatedSourceCount || 0} src
                            </span>
                            <Badge $type={edge.edgeSignal === 'STRONG' ? 'running' : 'simulation'}>
                              {edge.edgeSignal}
                            </Badge>
                          </span>
                        </div>
                        {/* Source detail chips */}
                        {edge.sources && edge.sources.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.35rem' }}>
                            {edge.sources.map((src, si) => {
                              const isHardData = src.key === 'bookmaker' || src.key === 'crypto' || src.key === 'espn' || src.key === 'stock';
                              const chipColor = isHardData ? '#22c55e' : src.key === 'llm' ? '#64748b' : '#a5b4fc';
                              return (
                                <span key={si} style={{
                                  background: `${chipColor}15`,
                                  color: chipColor,
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                  border: `1px solid ${chipColor}30`,
                                }}>
                                  {src.key === 'espn' ? `🏟 ESPN ${src.detail?.split('(')[0]?.trim() || 'Odds'} · ${(src.prob * 100).toFixed(0)}%` :
                                   src.key === 'bookmaker' ? `📊 ${src.detail?.split('—')[0] || 'Bookmaker'} · ${(src.prob * 100).toFixed(0)}%` :
                                   src.key === 'crypto' ? `₿ ${src.detail?.split(',')[0] || 'Crypto'} · ${(src.prob * 100).toFixed(0)}%` :
                                   src.key === 'stock' ? `📉 ${src.detail?.split(',')[0] || 'Stock'} · ${(src.prob * 100).toFixed(0)}%` :
                                   src.key === 'polling' ? `🎯 Metaculus · ${(src.prob * 100).toFixed(0)}%` :
                                   src.key === 'expert' ? `📈 Manifold · ${(src.prob * 100).toFixed(0)}%` :
                                   src.key === 'kalshi' ? `🏛 Kalshi · ${(src.prob * 100).toFixed(0)}%` :
                                   `🤖 LLM · ${(src.prob * 100).toFixed(0)}%`}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Lower grade edges — dimmed, collapsed */}
                  {(() => {
                    const lowerEdges = [...indEdges]
                      .sort((a, b) => (b.edgeQuality || 0) - (a.edgeQuality || 0))
                      .filter(e => (e.edgeQuality || 0) < 35);
                    if (lowerEdges.length === 0) return null;
                    return (
                      <div style={{ marginTop: '0.25rem' }}>
                        <div style={{
                          fontSize: '0.7rem',
                          color: '#64748b',
                          padding: '0.4rem 0.5rem',
                          borderTop: '1px solid rgba(99, 102, 241, 0.1)',
                          marginBottom: '0.25rem',
                        }}>
                          {lowerEdges.length} lower-confidence edge{lowerEdges.length !== 1 ? 's' : ''} (D grade — LLM-only, research only)
                        </div>
                        {lowerEdges.slice(0, 3).map((edge, i) => {
                          const gradeColor = edge.edgeGrade === 'C' ? '#fbbf24' : '#ef4444';
                          return (
                            <div key={`low-${i}`} style={{
                              background: 'rgba(0,0,0,0.15)',
                              borderRadius: '8px',
                              padding: '0.5rem 0.75rem',
                              border: '1px solid rgba(100, 116, 139, 0.15)',
                              opacity: 0.6,
                              marginBottom: '0.25rem',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', flex: 1 }}>
                                  {(edge.question || '').length > 45 ? edge.question.slice(0, 42) + '...' : edge.question}
                                </span>
                                <span style={{
                                  background: `${gradeColor}18`,
                                  color: gradeColor,
                                  padding: '0.05rem 0.3rem',
                                  borderRadius: '3px',
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                }}>
                                  {edge.edgeGrade}:{edge.edgeQuality} · {edge.sourceCount || 1} src · LLM only
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {indEdges.length > 8 && (
                    <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#a5b4fc', cursor: 'pointer', padding: '0.3rem' }}
                      onClick={() => setActiveTab('sources')}>
                      +{indEdges.length - 8} more → Sources tab
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Track Record */}
            <Card $delay="0.13s">
              <CardTitle>
                📊 Track Record
                {trackRecord?.summary?.resolvedEdges > 0 && (
                  <Badge $type={trackRecord.summary.winRate >= 50 ? 'running' : 'stopped'} style={{ marginLeft: 'auto' }}>
                    {trackRecord.summary.winRate}% WIN RATE
                  </Badge>
                )}
              </CardTitle>
              {(!trackRecord || trackRecord.summary?.resolvedEdges === 0) ? (
                <div style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                  <div style={{ marginBottom: '0.5rem' }}>Tracking {trackRecord?.pending || 0} edge{trackRecord?.pending !== 1 ? 's' : ''} for resolution</div>
                  <div style={{ fontSize: '0.75rem' }}>Track record builds automatically as markets resolve</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <StatCard>
                      <StatValue $color={trackRecord.summary.totalPnLpp >= 0 ? '#22c55e' : '#ef4444'}>
                        {trackRecord.summary.totalPnLpp >= 0 ? '+' : ''}{trackRecord.summary.totalPnLpp}pp
                      </StatValue>
                      <StatLabel>Total P&amp;L</StatLabel>
                    </StatCard>
                    <StatCard>
                      <StatValue $color="#a5b4fc">
                        {trackRecord.summary.wins}W / {trackRecord.summary.losses}L
                      </StatValue>
                      <StatLabel>{trackRecord.summary.resolvedEdges} Resolved</StatLabel>
                    </StatCard>
                    <StatCard>
                      <StatValue $color={trackRecord.summary.betterRate >= 50 ? '#22c55e' : '#fbbf24'}>
                        {trackRecord.summary.betterRate || 0}%
                      </StatValue>
                      <StatLabel>Beat Market</StatLabel>
                    </StatCard>
                  </div>
                  {trackRecord.hypothetical?.totalBets > 0 && (
                    <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.15)' }}>
                      💰 Hypothetical: $10/edge × {trackRecord.hypothetical.totalBets} bets = <strong style={{ color: trackRecord.hypothetical.totalReturn >= 0 ? '#22c55e' : '#ef4444' }}>${trackRecord.hypothetical.totalReturn.toFixed(2)}</strong> ({trackRecord.hypothetical.roi}% ROI)
                    </div>
                  )}
                  {trackRecord.recent?.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Last: {trackRecord.recent.slice(0, 3).map((r, i) => (
                        <span key={i} style={{ color: r.pnlPp > 0 ? '#22c55e' : '#ef4444', marginRight: '0.5rem' }}>
                          {r.pnlPp > 0 ? '+' : ''}{r.pnlPp}pp
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Stats Overview */}
            <Card $delay="0.15s" style={{ gridColumn: 'span 1' }}>
              <CardTitle>📈 Performance</CardTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <StatCard>
                  <StatValue $color="#34d399">
                    {performance ? `$${performance.totalPnL?.toFixed(2) || '0.00'}` : '—'}
                  </StatValue>
                  <StatLabel>Total P&amp;L</StatLabel>
                </StatCard>
                <StatCard>
                  <StatValue $color="#fbbf24">
                    {performance ? `$${performance.dailyPnL?.toFixed(2) || '0.00'}` : '—'}
                  </StatValue>
                  <StatLabel>Daily P&amp;L</StatLabel>
                </StatCard>
                <StatCard>
                  <StatValue>{performance?.totalTrades || 0}</StatValue>
                  <StatLabel>Trades</StatLabel>
                </StatCard>
                <StatCard>
                  <StatValue>{positions.length}</StatValue>
                  <StatLabel>Open Positions</StatLabel>
                </StatCard>
              </div>
            </Card>

            {/* Risk Dashboard */}
            <Card $delay="0.2s">
              <CardTitle>🛡️ Risk Dashboard</CardTitle>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#94a3b8' }}>Capital Deployed</span>
                    <span style={{ color: '#e2e8f0' }}>
                      ${status?.risk?.totalDeployed?.toFixed(2) || '0.00'} / ${status?.risk?.maxDeployment?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <PriceBar>
                    <PriceFill $pct={status?.risk?.utilizationPct || 0} />
                  </PriceBar>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#94a3b8' }}>Daily Loss Limit</span>
                    <span style={{ color: '#e2e8f0' }}>
                      ${Math.abs(status?.risk?.dailyPnL || 0).toFixed(2)} / ${status?.risk?.dailyLossLimit?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <PriceBar>
                    <PriceFill
                      $pct={
                        status?.risk?.dailyLossLimit
                          ? (Math.abs(status?.risk?.dailyPnL || 0) / status.risk.dailyLossLimit) * 100
                          : 0
                      }
                    />
                  </PriceBar>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#94a3b8' }}>Positions</span>
                  <span style={{ color: '#e2e8f0' }}>
                    {status?.risk?.openPositions || 0} / {status?.risk?.maxPositions || 50}
                  </span>
                </div>
              </div>
            </Card>

            {/* Strategy Breakdown */}
            <FullWidthSection>
              <Card $delay="0.25s">
                <CardTitle>⚡ Strategy Breakdown</CardTitle>
                <StatGrid>
                  <StatCard>
                    <StatValue $color="#34d399">
                      {opportunities.filter((o) => o.strategy === 'NO_BETS').length}
                    </StatValue>
                    <StatLabel>NO Bets</StatLabel>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Risk underwriting
                    </div>
                  </StatCard>
                  <StatCard>
                    <StatValue $color="#a5b4fc">
                      {opportunities.filter((o) => o.strategy === 'ARBITRAGE').length}
                    </StatValue>
                    <StatLabel>Arbitrage</StatLabel>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Cross-market edge
                    </div>
                  </StatCard>
                  <StatCard>
                    <StatValue $color="#fbbf24">
                      {opportunities.filter((o) => o.strategy === 'SPORTS_EDGE').length}
                    </StatValue>
                    <StatLabel>Statistical Edge</StatLabel>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Odds vs probability
                    </div>
                  </StatCard>
                  <StatCard>
                    <StatValue $color="#c084fc">
                      {opportunities.filter((o) => o.strategy === 'ICT').length}
                    </StatValue>
                    <StatLabel>ICT</StatLabel>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Smart money
                    </div>
                  </StatCard>
                  <StatCard>
                    <StatValue>{status?.scanner?.scanCount || 0}</StatValue>
                    <StatLabel>Scans Run</StatLabel>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                      {status?.scanner?.lastScan
                        ? new Date(status.scanner.lastScan).toLocaleTimeString()
                        : 'Never'}
                    </div>
                  </StatCard>
                  <StatCard>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                      <StatValue $color="#a78bfa">{status?.scanner?.platforms?.polymarket?.markets || 0}</StatValue>
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>+</span>
                      <StatValue $color="#60a5fa">{status?.scanner?.platforms?.kalshi?.markets || 0}</StatValue>
                    </div>
                    <StatLabel>Markets (Poly + Kalshi)</StatLabel>
                  </StatCard>
                </StatGrid>

                {/* Auto Execute */}
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    $variant="success"
                    onClick={autoExecute}
                    disabled={!connected || !isRunning || opportunities.length === 0}
                  >
                    ⚡ Paper-Trade Top 3
                  </Button>
                </div>
              </Card>
            </FullWidthSection>
          </Grid>
        )}

        {/* ── SIGNALS TAB ──────────────────────────────────────── */}
        {activeTab === 'signals' && (
          <Card $delay="0.1s">
            <CardTitle>🎯 Live Opportunities ({filteredOpps.length})</CardTitle>

            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '10px',
              padding: '0.6rem 0.9rem',
              fontSize: '0.8rem',
              color: '#a5b4fc',
              lineHeight: '1.5',
              marginBottom: '0.75rem',
            }}>
              💡 <strong>Filter by strategy</strong> below to focus on one approach. Click a strategy to learn how it works. Opportunities are ranked by <strong>score</strong> — higher is better. Run a <strong>Scan</strong> from the Overview tab to refresh.
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              {['TOP_5', 'ALL', 'NO_BETS', 'ARBITRAGE', 'SPORTS_EDGE', 'ICT'].map((f) => (
                <Button
                  key={f}
                  $variant={oppsFilter === f ? 'primary' : 'ghost'}
                  onClick={() => setOppsFilter(f)}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                >
                  {f === 'TOP_5' ? '🏆 Top 5' : f === 'ALL' ? '🌐 All' : f === 'NO_BETS' ? '🟢 NO Bets' : f === 'ARBITRAGE' ? '🔵 Arbitrage' : f === 'ICT' ? '🔮 ICT' : '🟡 Spread'}
                </Button>
              ))}
            </div>

            {/* Strategy Info Panel */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.78rem',
              lineHeight: '1.5',
              color: '#94a3b8',
            }}>
              {oppsFilter === 'TOP_5' && (
                <>
                  <div style={{ fontWeight: 600, color: '#fcd34d', marginBottom: '0.3rem' }}>🏆 Top 5 Trades — Best Pick Per Strategy</div>
                  <div>The <strong style={{ color: '#e2e8f0' }}>5 highest-scoring opportunities</strong> across every strategy. These are the bot&apos;s strongest conviction trades based on edge size, signal confluence, liquidity, and confidence. Scroll down for detailed breakdowns including exact entry prices, position sizing, and the reasoning behind each pick.</div>
                </>
              )}
              {oppsFilter === 'ALL' && (
                <>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.3rem' }}>🌐 All Strategies</div>
                  <div>Shows every opportunity found across all 4 strategies, ranked by score. Use this view to compare the best trades regardless of strategy type. Higher scores indicate stronger signal confluence and better expected value.</div>
                </>
              )}
              {oppsFilter === 'NO_BETS' && (
                <>
                  <div style={{ fontWeight: 600, color: '#34d399', marginBottom: '0.3rem' }}>🟢 NO Bets — Systematic Risk Underwriting</div>
                  <div style={{ marginBottom: '0.4rem' }}>Sells insurance on events that are <strong style={{ color: '#e2e8f0' }}>very likely to happen</strong>. When a market shows 92%+ probability, the NO side trades at ¢1–8. This strategy buys YES (or sells NO) to collect that near-certain payout.</div>
                  <div><strong style={{ color: '#cbd5e1' }}>How it works:</strong> Uses Kelly Criterion to size positions based on edge vs. implied probability. High-confidence events (95%+) get larger allocations. You profit when the event resolves as expected — the risk is the rare upset.</div>
                </>
              )}
              {oppsFilter === 'ARBITRAGE' && (
                <>
                  <div style={{ fontWeight: 600, color: '#a5b4fc', marginBottom: '0.3rem' }}>🔵 Arbitrage — Cross-Market Mispricing</div>
                  <div style={{ marginBottom: '0.4rem' }}>Finds <strong style={{ color: '#e2e8f0' }}>pricing inconsistencies</strong> between related markets. If &ldquo;Team A wins&rdquo; + &ldquo;Team B wins&rdquo; prices add up to less than 100%, there&apos;s a guaranteed profit by betting both sides (underround). Overrounds mean selling both sides.</div>
                  <div><strong style={{ color: '#cbd5e1' }}>How it works:</strong> Groups related markets by slug pattern (e.g. same game, different outcomes). Calculates the total implied probability — if it deviates from 100%, that&apos;s the arb. Rarer but near risk-free when found.</div>
                </>
              )}
              {oppsFilter === 'SPORTS_EDGE' && (
                <>
                  <div style={{ fontWeight: 600, color: '#fbbf24', marginBottom: '0.3rem' }}>🟡 Spread Trading — Market Making & Momentum</div>
                  <div style={{ marginBottom: '0.4rem' }}>Captures the <strong style={{ color: '#e2e8f0' }}>bid-ask spread</strong> on markets with wide gaps between buyers and sellers. Also fades momentum when prices move too fast in one direction (mean reversion).</div>
                  <div><strong style={{ color: '#cbd5e1' }}>How it works:</strong> Identifies markets where the spread is 2–15% and liquidity is sufficient. Places limit orders inside the spread to capture the difference. Also detects overbought/oversold conditions from recent price movement.</div>
                </>
              )}
              {oppsFilter === 'ICT' && (
                <>
                  <div style={{ fontWeight: 600, color: '#c084fc', marginBottom: '0.3rem' }}>🔮 ICT — Smart Money Concepts</div>
                  <div style={{ marginBottom: '0.4rem' }}>Adapts <strong style={{ color: '#e2e8f0' }}>institutional trading concepts</strong> (Inner Circle Trader) to prediction markets. Detects liquidity sweeps (stop hunts), fair value gaps, order blocks, market structure shifts, and smart money accumulation/distribution.</div>
                  <div style={{ marginBottom: '0.4rem' }}><strong style={{ color: '#cbd5e1' }}>Signals:</strong> <span style={{ color: '#c084fc' }}>BOS</span> = trend continuation confirmed · <span style={{ color: '#c084fc' }}>CHoCH</span> = trend reversal · <span style={{ color: '#c084fc' }}>Sweep</span> = price hunted stops then reversed · <span style={{ color: '#c084fc' }}>FVG</span> = price gap that tends to fill · <span style={{ color: '#c084fc' }}>OB</span> = large resting institutional orders</div>
                  <div><strong style={{ color: '#cbd5e1' }}>How it works:</strong> Analyzes price history + live orderbook on top 30 markets by volume. Scores each by signal confluence (min 25 to qualify). Trades in the direction that most signals agree on — buying in discount zones, selling in premium zones.</div>
                </>
              )}
            </div>

            {/* ── Top 5 Detailed Cards ── */}
            {oppsFilter === 'TOP_5' && filteredOpps.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                {filteredOpps.map((opp, i) => {
                  const edge = opp.edge || {};
                  const model = opp.model || {};
                  const isArb = opp.strategy === 'ARBITRAGE';
                  const isICT = opp.strategy === 'ICT';
                  const isNO = opp.strategy === 'NO_BETS';
                  const isSE = opp.strategy === 'SPORTS_EDGE';
                  const entryPrice = isArb
                    ? (opp.yesPrice || opp.noPrice || opp.markets?.[0]?.yesPrice || null)
                    : isNO ? opp.noPrice : isICT ? opp.price : (opp.side === 'YES' ? opp.yesPrice : opp.noPrice);
                  const rankColors = ['#fcd34d', '#c0c0c0', '#cd7f32', '#a5b4fc', '#a5b4fc'];
                  return (
                    <div key={`top5-${i}`} style={{
                      background: 'linear-gradient(135deg, rgba(30, 30, 55, 0.95), rgba(20, 20, 40, 0.95))',
                      border: i === 0 ? '1.5px solid rgba(252, 211, 77, 0.5)' : '1px solid rgba(99, 102, 241, 0.2)',
                      borderRadius: '14px',
                      padding: '1.25rem',
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      {/* Rank badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: `linear-gradient(135deg, ${rankColors[i]}33, ${rankColors[i]}11)`,
                          border: `2px solid ${rankColors[i]}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: '1rem', color: rankColors[i],
                        }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem', lineHeight: 1.3 }}>
                            {opp.market?.length > 80 ? opp.market.slice(0, 77) + '...' : opp.market}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.3rem' }}>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              background: opp.platform === 'KALSHI' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                              color: opp.platform === 'KALSHI' ? '#60a5fa' : '#a78bfa',
                              border: `1px solid ${opp.platform === 'KALSHI' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
                              letterSpacing: '0.05em',
                            }}>{opp.platform === 'KALSHI' ? 'KALSHI' : 'POLY'}</span>
                            <Chip $strategy={opp.strategy}>
                              {isNO ? 'NO BETS' : isArb ? 'ARBITRAGE' : isICT ? 'ICT' : 'SPORTS EDGE'}
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
                        background: 'rgba(52, 211, 153, 0.08)',
                        border: '1px solid rgba(52, 211, 153, 0.25)',
                        borderRadius: '10px',
                        padding: '0.75rem 1rem',
                        marginBottom: '0.75rem',
                      }}>
                        {/* ── Strategy-specific detailed action ── */}
                        {isArb && (
                          <>
                            <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                              📋 Action: Buy YES on all {opp.markets?.length || '?'} outcomes in this event
                            </div>
                            <div style={{ color: '#a7f3d0', fontSize: '0.82rem', lineHeight: 1.5 }}>
                              {opp.riskLevel === 'LOW'
                                ? `This is a guaranteed arbitrage — the combined cost of all YES shares is less than $1.00, so exactly one outcome will resolve YES and pay $1.00.`
                                : `⚠️ INCOMPLETE coverage — only ${opp.completeness?.marketsInGroup || '?'}/${opp.completeness?.totalInEvent || '?'} outcomes tracked. Profit is NOT guaranteed if an untracked outcome wins.`}
                            </div>
                            <div style={{ color: '#86efac', fontSize: '0.82rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
                              💰 Spend ~${((1 - (edge.raw || 0)) * (opp.positionSize || 30)).toFixed(2)} across all legs → collect ${ opp.positionSize || 30} when one resolves YES → <strong style={{ color: '#34d399' }}>${(opp.expectedProfit || 0).toFixed(2)} profit</strong> ({((edge.net || 0) * 100).toFixed(1)}% return)
                            </div>
                          </>
                        )}
                        {isNO && (
                          <>
                            <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                              📋 Action: BUY NO shares @ ${entryPrice?.toFixed(4) || '—'} each
                            </div>
                            <div style={{ color: '#a7f3d0', fontSize: '0.82rem', lineHeight: 1.5 }}>
                              You&apos;re betting this event <strong>won&apos;t happen</strong>. Our model estimates {((model.estimatedNoProb || 0) * 100).toFixed(1)}% chance it resolves NO, but the market is pricing NO at only {((opp.noPrice || 0) * 100).toFixed(1)}¢ — that&apos;s an edge of {((edge.edgeAfterCosts || edge.raw || 0) * 100).toFixed(2)}% after fees.
                            </div>
                            <div style={{ color: '#86efac', fontSize: '0.82rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
                              💰 Buy ${opp.positionSize?.toFixed(2) || '—'} worth of NO shares → if the event doesn&apos;t happen, each share pays $1.00 (profit: ${(1 - (opp.noPrice || 0)).toFixed(2)}/share). Net EV: <strong style={{ color: '#34d399' }}>${(edge.netEV || 0).toFixed(2)} per $100</strong> wagered.
                            </div>
                            {model.newsData && (
                              <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                                📰 News factor: {model.newsData.headlines || 0} headlines, sentiment {(model.newsData.sentiment || 0) > 0 ? '+' : ''}{(model.newsData.sentiment || 0).toFixed(1)}
                              </div>
                            )}
                          </>
                        )}
                        {isICT && (
                          <>
                            <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                              📋 Action: BUY {opp.side || '—'} shares @ ${entryPrice?.toFixed(4) || '—'} each
                            </div>
                            <div style={{ color: '#a7f3d0', fontSize: '0.82rem', lineHeight: 1.5 }}>
                              Smart-money orderbook analysis detected {opp.signals?.length || 0} signal{(opp.signals?.length || 0) !== 1 ? 's' : ''} pointing <strong>{opp.side}</strong>:
                              {opp.signals && opp.signals.length > 0 && (
                                <span style={{ color: '#d8b4fe' }}> {opp.signals.slice(0, 2).join('; ')}</span>
                              )}
                              . Model estimates true probability at {((opp.estimatedProb || 0) * 100).toFixed(1)}% vs market price {((opp.price || 0) * 100).toFixed(1)}¢ — edge of {((opp.edgeAfterCosts || 0) * 100).toFixed(1)}% after costs.
                            </div>
                            <div style={{ color: '#86efac', fontSize: '0.82rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
                              💰 Position: ${opp.positionSize?.toFixed(2) || '—'} → if {opp.side} resolves correct, each share pays $1.00 (profit: ${(1 - (opp.price || 0)).toFixed(2)}/share). Net EV: <strong style={{ color: '#34d399' }}>${(opp.netEV || 0).toFixed(2)}</strong> per $100.
                            </div>
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
                              .{opp.bookmaker ? ` Bookmakers consensus: ${((opp.bookmaker.consensusProb || 0) * 100).toFixed(1)}% vs Polymarket ${((opp.side === 'YES' ? opp.yesPrice : opp.noPrice) * 100).toFixed(1)}% — ${Math.abs(opp.bookmaker.divergence || 0) >= 0.05 ? 'significant' : 'moderate'} divergence of ${((Math.abs(opp.bookmaker.divergence || 0)) * 100).toFixed(1)}%.` : ' Price-action patterns suggest a statistical edge.'}
                            </div>
                            <div style={{ color: '#86efac', fontSize: '0.82rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
                              💰 Position: ${opp.positionSize?.toFixed(2) || '—'} → if {opp.side} resolves correct, each share pays $1.00 (profit: ${(1 - entryPrice).toFixed(2)}/share). Net edge: <strong style={{ color: '#34d399' }}>{((edge.edgeAfterCosts || 0) * 100).toFixed(2)}%</strong> after fees.
                              {opp.bookmaker?.pinnacleProb && (
                                <span style={{ color: '#94a3b8' }}> Pinnacle (sharpest book): {((opp.bookmaker.pinnacleProb) * 100).toFixed(1)}%</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Arb legs */}
                      {isArb && opp.markets && (
                        <div style={{
                          background: 'rgba(99, 102, 241, 0.06)',
                          border: '1px solid rgba(99, 102, 241, 0.15)',
                          borderRadius: '8px',
                          padding: '0.6rem 0.8rem',
                          marginBottom: '0.75rem',
                          fontSize: '0.8rem',
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
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '0.5rem',
                        marginBottom: isICT && opp.signals ? '0.75rem' : '0',
                      }}>
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
                        {isICT && (
                          <>
                            <div style={{ background: 'rgba(192,132,252,0.06)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Edge After Costs</div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#c084fc' }}>{((opp.edgeAfterCosts || 0) * 100).toFixed(1)}%</div>
                            </div>
                            <div style={{ background: 'rgba(52,211,153,0.06)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Net EV</div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399' }}>${(opp.netEV || 0).toFixed(2)}</div>
                            </div>
                            <div style={{ background: 'rgba(99,102,241,0.06)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Est. True Prob</div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a5b4fc' }}>{((opp.estimatedProb || 0) * 100).toFixed(1)}%</div>
                            </div>
                            <div style={{ background: 'rgba(148,163,184,0.06)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Volume 24h</div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#94a3b8' }}>${(opp.volume24hr || 0) >= 1000000 ? ((opp.volume24hr / 1000000).toFixed(1) + 'M') : (opp.volume24hr || 0) >= 1000 ? ((opp.volume24hr / 1000).toFixed(1) + 'K') : (opp.volume24hr || 0).toFixed(0)}</div>
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

                      {/* ICT signals */}
                      {isICT && opp.signals && opp.signals.length > 0 && (
                        <div style={{
                          background: 'rgba(192, 132, 252, 0.06)',
                          border: '1px solid rgba(192, 132, 252, 0.15)',
                          borderRadius: '8px',
                          padding: '0.5rem 0.8rem',
                          fontSize: '0.78rem',
                          color: '#d8b4fe',
                        }}>
                          <span style={{ fontWeight: 600 }}>Signals: </span>
                          {opp.signals.join(' · ')}
                          {opp.bullishVotes != null && (
                            <span style={{ marginLeft: '0.5rem', color: '#94a3b8' }}>(Bull: {opp.bullishVotes} / Bear: {opp.bearishVotes})</span>
                          )}
                        </div>
                      )}

                      {/* Bookmaker Comparison */}
                      {opp.bookmaker && (
                        <div style={{
                          background: 'rgba(251, 191, 36, 0.06)',
                          border: '1px solid rgba(251, 191, 36, 0.2)',
                          borderRadius: '8px',
                          padding: '0.6rem 0.8rem',
                          marginTop: '0.5rem',
                          fontSize: '0.8rem',
                        }}>
                          <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: '0.3rem' }}>
                            📊 Bookmaker Comparison — {opp.bookmaker.matchedEvent}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', marginBottom: '0.3rem' }}>
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
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              Pinnacle (sharpest): {(opp.bookmaker.pinnacleProb * 100).toFixed(1)}%
                            </div>
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
                          borderRadius: '8px',
                          padding: '0.6rem 0.8rem',
                          marginTop: '0.5rem',
                          fontSize: '0.8rem',
                        }}>
                          <div style={{ fontWeight: 700, color: opp.riskLevel === 'HIGH' ? '#ef4444' : opp.riskLevel === 'MEDIUM' ? '#fbbf24' : '#34d399', marginBottom: '0.25rem' }}>
                            {opp.riskLevel === 'HIGH' ? '🔴' : opp.riskLevel === 'MEDIUM' ? '🟡' : '🟢'} Risk: {opp.riskLevel}
                          </div>
                          {opp.riskNote && (
                            <div style={{ color: '#94a3b8', fontSize: '0.75rem', lineHeight: 1.4 }}>{opp.riskNote}</div>
                          )}
                          {isArb && opp.completeness && (
                            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                              Coverage: {opp.completeness.marketsInGroup}/{opp.completeness.totalInEvent} outcomes tracked
                            </div>
                          )}
                        </div>
                      )}

                      {/* Expiry */}
                      {opp.endDate && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'right' }}>
                          Expires: {new Date(opp.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Standard Table (non-Top 5) ── */}
            {oppsFilter !== 'TOP_5' && (
            <Table>
              <TableRow $header $columns="2.5fr 0.8fr 0.8fr 0.8fr 0.6fr 0.6fr">
                <span>Market</span>
                <span>Strategy</span>
                <span>Price</span>
                <span>Size</span>
                <span>Score</span>
                <span>Confidence</span>
              </TableRow>

              {filteredOpps.length === 0 ? (
                <EmptyState>
                  {connected
                    ? isRunning
                      ? 'Scanning for opportunities...'
                      : 'Start the bot to scan for opportunities'
                    : 'Connect to bot server first'}
                </EmptyState>
              ) : (
                filteredOpps.map((opp, i) => (
                  <TableRow key={`${opp.conditionId}-${opp.strategy}-${i}`} $columns="2.5fr 0.8fr 0.8fr 0.8fr 0.6fr 0.6fr">
                    <span style={{ fontWeight: 500, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        padding: '0.05rem 0.3rem',
                        borderRadius: '3px',
                        background: opp.platform === 'KALSHI' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                        color: opp.platform === 'KALSHI' ? '#60a5fa' : '#a78bfa',
                        flexShrink: 0,
                      }}>{opp.platform === 'KALSHI' ? 'K' : 'P'}</span>
                      <span>{opp.market?.length > 55 ? opp.market.slice(0, 52) + '...' : opp.market}</span>
                    </span>
                    <span>
                      <Chip $strategy={opp.strategy}>
                        {opp.strategy === 'NO_BETS' ? 'NO' : opp.strategy === 'ARBITRAGE' ? 'ARB' : opp.strategy === 'ICT' ? 'ICT' : 'SPREAD'}
                      </Chip>
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      ${opp.yesPrice?.toFixed(3) || opp.noPrice?.toFixed(3) || opp.markets?.[0]?.yesPrice?.toFixed(3) || '—'}
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: '#a5b4fc' }}>
                      ${opp.positionSize?.toFixed(2) || '—'}
                    </span>
                    <span>
                      <span
                        style={{
                          color: opp.score >= 70 ? '#34d399' : opp.score >= 50 ? '#fbbf24' : '#f87171',
                          fontWeight: 700,
                        }}
                      >
                        {opp.score || 0}
                      </span>
                    </span>
                    <span>
                      <Badge $type={opp.confidence?.toLowerCase()}>
                        {opp.confidence || '—'}
                      </Badge>
                    </span>
                  </TableRow>
                ))
              )}
            </Table>
            )}

            {/* Top 5 empty state */}
            {oppsFilter === 'TOP_5' && filteredOpps.length === 0 && (
              <EmptyState>
                {connected
                  ? isRunning
                    ? 'Scanning for top opportunities...'
                    : 'Start the bot and run a scan to see top picks'
                  : 'Connect to bot server first'}
              </EmptyState>
            )}
          </Card>
        )}

        {/* ── ACCAS TAB ────────────────────────────────────────── */}
        {activeTab === 'accas' && (
          <Grid>
            <FullWidthSection>
              <Card $delay="0.05s">
                <CardTitle style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>🎰 +EV Accumulators (Parlays)</span>
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
                      color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '8px',
                      fontSize: '0.8rem', fontWeight: 600, cursor: accaBuilding ? 'wait' : 'pointer',
                    }}
                  >
                    {accaBuilding ? 'Building...' : '🔄 Build Accas'}
                  </button>
                </CardTitle>

                {/* Stats summary */}
                {accaData?.stats && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                    <StatCard>
                      <StatValue $color="#a5b4fc">{accaData.stats.total}</StatValue>
                      <StatLabel>Accas Found</StatLabel>
                    </StatCard>
                    <StatCard>
                      <StatValue $color="#22c55e">{accaData.stats.byGrade?.S || 0}</StatValue>
                      <StatLabel>S-Tier</StatLabel>
                    </StatCard>
                    <StatCard>
                      <StatValue $color="#6366f1">{accaData.stats.byGrade?.A || 0}</StatValue>
                      <StatLabel>A-Tier</StatLabel>
                    </StatCard>
                    <StatCard>
                      <StatValue $color="#fbbf24">{accaData.stats.byGrade?.B || 0}</StatValue>
                      <StatLabel>B-Tier</StatLabel>
                    </StatCard>
                    <StatCard>
                      <StatValue $color="#f97316">{accaData.stats.avgEV || 0}%</StatValue>
                      <StatLabel>Avg EV</StatLabel>
                    </StatCard>
                    <StatCard>
                      <StatValue $color="#34d399">{accaData.stats.crossSportCount || 0}</StatValue>
                      <StatLabel>Cross-Sport</StatLabel>
                    </StatCard>
                  </div>
                )}

                {/* Build info bar */}
                {accaData?.lastBuildTime && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <span>Built: {new Date(accaData.lastBuildTime).toLocaleString()}</span>
                    <span>•</span>
                    <span>{accaData.totalLegs || 0} legs available</span>
                    {accaData.buildStats?.hygiene && (
                      <>
                        <span>•</span>
                        <span style={{ color: '#94a3b8' }}>
                          Filtered: {accaData.buildStats.hygiene.stale || 0} stale, {accaData.buildStats.hygiene.settled || 0} settled, {accaData.buildStats.hygiene.thinMarket || 0} thin
                        </span>
                      </>
                    )}
                    {accaData.stats?.avgDataQuality && accaData.stats.avgDataQuality !== 'n/a' && (
                      <>
                        <span>•</span>
                        <span style={{ color: accaData.stats.avgDataQuality === 'excellent' ? '#22c55e' : accaData.stats.avgDataQuality === 'good' ? '#6366f1' : '#fbbf24' }}>
                          Data: {accaData.stats.avgDataQuality}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Acca cards */}
                {(!accaData?.accas || accaData.accas.length === 0) ? (
                  <EmptyState>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎰</div>
                    No accumulators built yet. Click &ldquo;Build Accas&rdquo; to scan for +EV parlays across {accaData?.totalLegs || 0} bookmaker events.
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
                      Requires bookmaker odds data. Set your Odds API key in the Sources tab if not set.
                    </div>
                  </EmptyState>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {accaData.accas.map((acca, idx) => {
                      const gradeColors = { S: '#22c55e', A: '#6366f1', B: '#fbbf24', C: '#94a3b8' };
                      const gradeColor = gradeColors[acca.grade] || '#64748b';
                      return (
                        <div key={idx} style={{
                          background: 'rgba(15, 15, 25, 0.6)',
                          border: `1px solid ${acca.grade === 'S' ? 'rgba(34,197,94,0.3)' : acca.grade === 'A' ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: '12px', padding: '1rem', position: 'relative',
                        }}>
                          {/* Header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{
                                background: `${gradeColor}22`, color: gradeColor,
                                border: `1px solid ${gradeColor}44`, borderRadius: '6px',
                                padding: '0.2rem 0.5rem', fontSize: '0.8rem', fontWeight: 700,
                              }}>
                                {acca.grade}-TIER
                              </span>
                              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                                {acca.numLegs}-Leg {acca.crossSport ? 'Cross-Sport ' : ''}Acca
                              </span>
                              {acca.dataQuality && (
                                <span style={{
                                  background: acca.dataQuality === 'excellent' ? 'rgba(34,197,94,0.1)' : acca.dataQuality === 'good' ? 'rgba(99,102,241,0.1)' : 'rgba(251,191,36,0.1)',
                                  color: acca.dataQuality === 'excellent' ? '#22c55e' : acca.dataQuality === 'good' ? '#818cf8' : '#fbbf24',
                                  border: `1px solid ${acca.dataQuality === 'excellent' ? 'rgba(34,197,94,0.2)' : acca.dataQuality === 'good' ? 'rgba(99,102,241,0.2)' : 'rgba(251,191,36,0.2)'}`,
                                  borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.7rem', fontWeight: 500,
                                }}>
                                  {acca.dataQuality}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ color: acca.evPercent >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: '1.1rem' }}>
                                  {acca.evPercent >= 0 ? '+' : ''}{acca.evPercent}% EV
                                </span>
                                {acca.evConfidence && (
                                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                                    CI: {acca.evConfidence.low > 0 ? '+' : ''}{acca.evConfidence.low}% to {acca.evConfidence.high > 0 ? '+' : ''}{acca.evConfidence.high}%
                                  </div>
                                )}
                              </div>
                              <span style={{ color: '#a5b4fc', fontWeight: 600, fontSize: '0.95rem' }}>
                                {acca.combinedOdds}x
                              </span>
                            </div>
                          </div>

                          {/* EV skepticism warning */}
                          {acca.evPercent > 15 && (
                            <div style={{
                              padding: '0.4rem 0.6rem', marginBottom: '0.6rem', borderRadius: '6px',
                              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
                              fontSize: '0.72rem', color: '#fbbf24',
                            }}>
                              ⚠️ High EV ({acca.evPercent}%) — treat with caution. Sharp bettors typically see 3-8% EV. High EV may indicate stale lines or thin market data.
                            </div>
                          )}

                          {/* Legs */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                            {acca.legs.map((leg, li) => (
                              <div key={li} style={{
                                display: 'grid', gridTemplateColumns: '1.8fr 1.2fr 0.7fr 0.9fr',
                                gap: '0.5rem', alignItems: 'center', padding: '0.4rem 0.6rem',
                                background: 'rgba(255,255,255,0.02)', borderRadius: '6px',
                                fontSize: '0.82rem',
                              }}>
                                <span style={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {leg.match}
                                </span>
                                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                                  {leg.pick}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <span style={{
                                    color: leg.betType === 'MONEYLINE' ? '#a5b4fc' : leg.betType === 'SPREAD' ? '#fbbf24' : '#34d399',
                                    fontSize: '0.72rem',
                                  }}>
                                    {leg.betType}
                                  </span>
                                  {leg.sharpConfidence && (
                                    <span style={{
                                      width: '6px', height: '6px', borderRadius: '50%',
                                      background: leg.sharpConfidence === 'high' ? '#22c55e' : leg.sharpConfidence === 'medium' ? '#fbbf24' : '#ef4444',
                                    }} title={`${leg.sharpConfidence} confidence`} />
                                  )}
                                </span>
                                <span style={{ textAlign: 'right' }}>
                                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{leg.odds}</span>
                                  <span style={{ color: '#475569', fontSize: '0.7rem', marginLeft: '0.3rem' }}>@ {leg.book}</span>
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Footer: hypothetical */}
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap',
                            padding: '0.5rem 0.75rem', background: 'rgba(99,102,241,0.06)',
                            borderRadius: '8px', fontSize: '0.8rem', gap: '0.5rem',
                          }}>
                            <span style={{ color: '#64748b' }}>
                              💰 {acca.kelly?.suggestedStake > 0
                                ? <>Kelly: <strong style={{ color: '#a5b4fc' }}>${acca.kelly.suggestedStake}</strong> ({acca.kelly.bankrollPercent}% of $1k)</>
                                : <>Min stake</>
                              } → <strong style={{ color: '#22c55e' }}>${acca.hypothetical?.payout}</strong> payout
                            </span>
                            <span style={{ color: '#64748b' }}>
                              E[profit]: <strong style={{ color: acca.hypothetical?.expectedProfit >= 0 ? '#22c55e' : '#ef4444' }}>
                                {acca.hypothetical?.expectedProfit >= 0 ? '+' : ''}${acca.hypothetical?.expectedProfit}
                              </strong>
                            </span>
                            <span style={{ color: '#475569', fontSize: '0.7rem' }}>
                              Corr: {(acca.avgCorrelation * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* How it works */}
                <div style={{
                  marginTop: '1.5rem', padding: '1rem', background: 'rgba(99,102,241,0.05)',
                  borderRadius: '8px', border: '1px solid rgba(99,102,241,0.1)',
                }}>
                  <div style={{ fontWeight: 600, color: '#a5b4fc', marginBottom: '0.5rem', fontSize: '0.85rem' }}>How +EV Accas Work (v2)</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.6 }}>
                    <strong style={{ color: '#94a3b8' }}>1. Data Hygiene</strong> — Filter stale/settled events. Only future matches with 3+ bookmakers qualify.{' '}
                    <strong style={{ color: '#94a3b8' }}>2. Sharp Lines</strong> — Remove vig using Shin method (soccer) or multiplicative method (2-way), prioritizing Pinnacle/Matchbook.{' '}
                    <strong style={{ color: '#94a3b8' }}>3. Correlation</strong> — Sport-specific coefficients with 30% safety margin (underestimating correlation = phantom +EV).{' '}
                    <strong style={{ color: '#94a3b8' }}>4. Kelly Sizing</strong> — Quarter-Kelly stake sizing, capped at 3% of bankroll per acca.{' '}
                    <strong style={{ color: '#94a3b8' }}>5. Confidence</strong> — Each EV shows a confidence interval. EV above 15% triggers a skepticism warning.{' '}
                    <strong style={{ color: '#94a3b8' }}>6. CLV Tracking</strong> — Line snapshots saved for closing line value analysis over time.
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} /> High confidence
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24' }} /> Medium confidence
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} /> Low confidence
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </FullWidthSection>
          </Grid>
        )}

        {/* ── MARKETS TAB ───────────────────────────────────────── */}
        {activeTab === 'markets' && (
          <Card $delay="0.1s">
            <CardTitle>🌐 Live Markets ({markets.length})</CardTitle>

            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '10px',
              padding: '0.6rem 0.9rem',
              fontSize: '0.8rem',
              color: '#a5b4fc',
              lineHeight: '1.5',
              marginBottom: '0.75rem',
            }}>
              💡 <strong>Browse active markets</strong> from Polymarket & Kalshi. The price bar shows the current YES probability. High volume + tight spreads = the most liquid markets. Click ⭐ to add to your watchlist.
            </div>

            <Table>
              <TableRow $header $columns="2.5fr 0.7fr 0.7fr 0.8fr 0.8fr 0.8fr">
                <span>Market</span>
                <span>YES</span>
                <span>NO</span>
                <span>Volume 24h</span>
                <span>Liquidity</span>
                <span>Actions</span>
              </TableRow>

              {markets.length === 0 ? (
                <EmptyState>
                  {connected ? 'Loading markets...' : 'Connect to server to see live markets'}
                </EmptyState>
              ) : (
                markets.map((m, i) => (
                  <TableRow key={m.conditionId || i} $columns="2.5fr 0.7fr 0.7fr 0.8fr 0.8fr 0.8fr">
                    <div>
                      <div style={{ fontWeight: 500, color: '#e2e8f0', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          padding: '0.05rem 0.3rem',
                          borderRadius: '3px',
                          background: m.platform === 'KALSHI' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                          color: m.platform === 'KALSHI' ? '#60a5fa' : '#a78bfa',
                          flexShrink: 0,
                        }}>{m.platform === 'KALSHI' ? 'K' : 'P'}</span>
                        <span>{m.question?.length > 60 ? m.question.slice(0, 57) + '...' : m.question}</span>
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
                      ${m.volume24hr >= 1000 ? (m.volume24hr / 1000).toFixed(1) + 'K' : m.volume24hr?.toFixed(0) || '0'}
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: '#94a3b8' }}>
                      ${m.liquidity >= 1000 ? (m.liquidity / 1000).toFixed(1) + 'K' : m.liquidity?.toFixed(0) || '0'}
                    </span>
                    <span style={{ display: 'flex', gap: '0.3rem' }}>
                      <Button
                        $variant="ghost"
                        onClick={() => addToWatchlist(m)}
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
                        title="Add to watchlist"
                      >
                        {watchlistData.some(w => w.conditionId === m.conditionId) ? '★' : '☆'}
                      </Button>
                      <Button
                        $variant="ghost"
                        onClick={() => { setTradeModal(m); setTradeSide('YES'); }}
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                      >
                        📝
                      </Button>
                    </span>
                  </TableRow>
                ))
              )}
            </Table>
          </Card>
        )}

        {/* ── MANUAL TRADE MODAL ────────────────────────────────── */}
        {tradeModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }} onClick={() => setTradeModal(null)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: '#1e1e2e', border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '16px', padding: '1.5rem', maxWidth: '420px', width: '100%',
            }}>
              <h3 style={{ color: '#e2e8f0', margin: '0 0 0.5rem', fontSize: '1rem' }}>
                📝 Paper Trade
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
                {tradeModal.question}
              </p>

              {/* Side selector */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <Button
                  $variant={tradeSide === 'YES' ? 'primary' : 'ghost'}
                  onClick={() => setTradeSide('YES')}
                  style={{ flex: 1, background: tradeSide === 'YES' ? 'rgba(16, 185, 129, 0.2)' : undefined, color: tradeSide === 'YES' ? '#34d399' : '#94a3b8', border: tradeSide === 'YES' ? '1px solid rgba(16, 185, 129, 0.4)' : undefined }}
                >
                  YES @ {tradeModal.yesPrice?.toFixed(2)}¢
                </Button>
                <Button
                  $variant={tradeSide === 'NO' ? 'primary' : 'ghost'}
                  onClick={() => setTradeSide('NO')}
                  style={{ flex: 1, background: tradeSide === 'NO' ? 'rgba(248, 113, 113, 0.2)' : undefined, color: tradeSide === 'NO' ? '#f87171' : '#94a3b8', border: tradeSide === 'NO' ? '1px solid rgba(248, 113, 113, 0.4)' : undefined }}
                >
                  NO @ {tradeModal.noPrice?.toFixed(2)}¢
                </Button>
              </div>

              {/* Amount input */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem' }}>
                  Amount (paper $)
                </label>
                <Input
                  type="number"
                  value={tradeAmount}
                  onChange={e => setTradeAmount(e.target.value)}
                  min="1"
                  max="1000"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Payout preview */}
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', padding: '0.6rem',
                fontSize: '0.8rem', color: '#a5b4fc', marginBottom: '1rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Entry price:</span>
                  <span>{(tradeSide === 'YES' ? tradeModal.yesPrice : tradeModal.noPrice)?.toFixed(2)}¢</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Potential payout:</span>
                  <span style={{ color: '#34d399' }}>
                    ${(parseFloat(tradeAmount || 0) / (tradeSide === 'YES' ? tradeModal.yesPrice : tradeModal.noPrice || 0.5)).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Max loss:</span>
                  <span style={{ color: '#f87171' }}>${parseFloat(tradeAmount || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button $variant="ghost" onClick={() => setTradeModal(null)} style={{ flex: 1 }}>
                  Cancel
                </Button>
                <Button
                  $variant="primary"
                  onClick={placeManualTrade}
                  disabled={tradePending || !tradeAmount || parseFloat(tradeAmount) <= 0}
                  style={{ flex: 1 }}
                >
                  {tradePending ? '⏳ Placing...' : `Place ${tradeSide} Trade`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Trade success toast */}
        {tradeSuccess && (
          <div style={{
            position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1001,
            background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '12px', padding: '0.8rem 1.2rem', color: '#34d399', fontSize: '0.85rem',
          }} role="status">
            ✅ {tradeSuccess}
          </div>
        )}

        {/* ── SOURCES TAB (Independent Data Sources) ────────────── */}
        {activeTab === 'sources' && (
          <Grid>
            {/* Platform AI — no user key needed */}
            <Card $delay="0.1s">
              <CardTitle>🧠 AI-Powered Analysis</CardTitle>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Every market is analyzed by GPT-4o in real-time to generate independent probability estimates from news and general knowledge — completely independent of market prices. This is included with the platform.
              </p>
              <div style={{ background: llmConfigured ? 'rgba(34, 197, 94, 0.1)' : 'rgba(251, 191, 36, 0.08)', border: `1px solid ${llmConfigured ? 'rgba(34, 197, 94, 0.3)' : 'rgba(251, 191, 36, 0.2)'}`, borderRadius: '10px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{llmConfigured ? '✅' : '⏳'}</span>
                  <span style={{ color: llmConfigured ? '#22c55e' : '#fbbf24', fontWeight: 700, fontSize: '0.95rem' }}>
                    {llmConfigured ? 'AI Engine Active' : 'Connecting...'}
                  </span>
                  {llmConfigured && (
                    <span style={{ marginLeft: 'auto', background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600 }}>
                      {indSourcesStatus?.llm?.provider || 'openai'} / {indSourcesStatus?.llm?.model || 'gpt-4o-mini'}
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a5b4fc' }}>{indSourcesStatus?.llm?.totalCalls || 0}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>API Calls</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#22c55e' }}>{indSourcesStatus?.llm?.cachedAnalyses || 0}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Cached</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24' }}>{indSourcesStatus?.llm?.estimatedCost || '$0.00'}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Est. Cost</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.75rem', textAlign: 'center' }}>
                  Platform-provided — no API key required
                </div>
              </div>
            </Card>

            {/* Source Status */}
            <Card $delay="0.15s">
              <CardTitle>🔬 Independent Sources Status</CardTitle>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {/* Polling Sources */}
                <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontWeight: 600, color: '#a5b4fc', marginBottom: '0.5rem' }}>📊 Public Forecasts</div>
                  {(indSourcesStatus?.polling?.sources || []).map((src, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid rgba(99, 102, 241, 0.08)' }}>
                      <div>
                        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>{src.name}</span>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{src.description}</div>
                      </div>
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 600, whiteSpace: 'nowrap',
                        background: src.status === 'active' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: src.status === 'active' ? '#22c55e' : '#ef4444',
                        border: `1px solid ${src.status === 'active' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` }}>
                        {src.status === 'active' ? '● Live' : '○ Down'}
                      </span>
                    </div>
                  ))}
                  {(indSourcesStatus?.polling?.retired || []).map((src, i) => (
                    <div key={`r-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', opacity: 0.5 }}>
                      <div>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'line-through' }}>{src.name}</span>
                        <div style={{ color: '#475569', fontSize: '0.7rem' }}>{src.reason}</div>
                      </div>
                      <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Retired</span>
                    </div>
                  ))}
                  <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    Cached: {indSourcesStatus?.polling?.cachedEntries || 0} markets • Fetches: {indSourcesStatus?.polling?.totalFetches || 0}
                  </div>
                </div>
                {/* Expert Sources */}
                <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.15)', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontWeight: 600, color: '#c084fc', marginBottom: '0.5rem' }}>🎓 Expert &amp; Cross-Platform</div>
                  {(indSourcesStatus?.expert?.sources || []).map((src, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid rgba(168, 85, 247, 0.08)' }}>
                      <div>
                        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>{src.name}</span>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{src.description}</div>
                      </div>
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 600, whiteSpace: 'nowrap',
                        background: src.status === 'active' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: src.status === 'active' ? '#22c55e' : '#ef4444',
                        border: `1px solid ${src.status === 'active' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` }}>
                        {src.status === 'active' ? '● Live' : '○ Down'}
                      </span>
                    </div>
                  ))}
                  {(indSourcesStatus?.expert?.retired || []).map((src, i) => (
                    <div key={`r-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', opacity: 0.5 }}>
                      <div>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'line-through' }}>{src.name}</span>
                        <div style={{ color: '#475569', fontSize: '0.7rem' }}>{src.reason}</div>
                      </div>
                      <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Retired</span>
                    </div>
                  ))}
                  <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    Cached: {indSourcesStatus?.expert?.cachedEntries || 0} markets • Fetches: {indSourcesStatus?.expert?.totalFetches || 0}
                  </div>
                </div>
                {/* LLM Source */}
                <div style={{ background: llmConfigured ? 'rgba(34, 197, 94, 0.08)' : 'rgba(71, 85, 105, 0.2)', border: `1px solid ${llmConfigured ? 'rgba(34, 197, 94, 0.15)' : 'rgba(71, 85, 105, 0.3)'}`, borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontWeight: 600, color: llmConfigured ? '#86efac' : '#fbbf24', marginBottom: '0.25rem' }}>🧠 AI Analysis (Platform-Provided)</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                    {llmConfigured ? `${indSourcesStatus?.llm?.provider || 'openai'} / ${indSourcesStatus?.llm?.model || 'gpt-4o-mini'} — independent probability estimation` : 'Initializing...'}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    Cached: {indSourcesStatus?.llm?.cached || 0} markets
                  </div>
                </div>
                {/* Kalshi Cross-Platform Source */}
                <div style={{ background: 'rgba(251, 146, 60, 0.08)', border: '1px solid rgba(251, 146, 60, 0.15)', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontWeight: 600, color: '#fb923c', marginBottom: '0.5rem' }}>🔄 Kalshi Cross-Platform</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    Cross-references Polymarket questions against Kalshi&apos;s regulated exchange prices for independent validation
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div style={{ textAlign: 'center', padding: '0.35rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fb923c' }}>{indSourcesStatus?.kalshi?.attempts || 0}</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Lookups</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0.35rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#22c55e' }}>{indSourcesStatus?.kalshi?.matches || 0}</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Matched</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0.35rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#a5b4fc' }}>{indSourcesStatus?.kalshi?.cachedEntries || 0}</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Cached</div>
                    </div>
                  </div>
                  {indSourcesStatus?.kalshi?.lastMatch && (
                    <div style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '0.4rem' }}>
                      Last match: {new Date(indSourcesStatus.kalshi.lastMatch).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Batch Analysis Trigger */}
            <FullWidthSection>
              <Card $delay="0.2s">
                <CardTitle>🔍 Edge Detection — Independent vs Market</CardTitle>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  Compare independent source estimates against market prices to find genuine divergences. These are NOT derived from the market — they come from ESPN sportsbook odds, crypto/stock data, forecaster crowds, and LLMs.
                </p>
                {scanStatus && (
                  <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {scanStatus.scanRunning && <span style={{ color: '#fbbf24' }}>⏳ Auto-scan running...</span>}
                    {scanStatus.lastScan && <span>Last scan: {new Date(scanStatus.lastScan).toLocaleTimeString()}</span>}
                    {scanStatus.nextScan && !scanStatus.scanRunning && <span>Next: {new Date(scanStatus.nextScan).toLocaleTimeString()}</span>}
                    <span>{scanStatus.total || 0} markets cached</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Button
                    disabled={indAnalyzing}
                    onClick={async () => {
                      setIndAnalyzing(true);
                      try {
                        const result = await api('/polybot/intel/independent/batch', {
                          method: 'POST',
                          body: JSON.stringify({ maxMarkets: 30 }),
                        });
                        if (result?.results) {
                          setIndEdges(result.results.filter(r => r.edgeSignal === 'STRONG' || r.edgeSignal === 'MODERATE'));
                        }
                      } catch (err) { setError(err.message); }
                      setIndAnalyzing(false);
                    }}
                  >
                    {indAnalyzing ? '⏳ Analyzing...' : '🔬 Run Full Analysis'}
                  </Button>
                  <span style={{ color: '#64748b', fontSize: '0.8rem', alignSelf: 'center' }}>
                    Auto-scans every 15 min · Manual scan takes ~2 min
                  </span>
                </div>

                {indEdges.length === 0 ? (
                  <EmptyState>
                    {scanStatus?.scanRunning ? '⏳ Auto-scan in progress... edges will appear when complete.' : 'No edge opportunities detected yet. Auto-scan runs every 15 minutes.'}
                  </EmptyState>
                ) : (
                  <Table>
                    <TableRow $header $columns="2fr 0.8fr 0.8fr 0.8fr 0.5fr 0.6fr">
                      <span>Market</span>
                      <span>Independent</span>
                      <span>Market Price</span>
                      <span>Divergence</span>
                      <span>Quality</span>
                      <span>Signal</span>
                    </TableRow>
                    {indEdges.map((edge, i) => {
                      const divColor = (edge.divergence || 0) > 0 ? '#22c55e' : '#ef4444';
                      const gradeColor = edge.edgeGrade === 'A' ? '#22c55e' : edge.edgeGrade === 'B' ? '#a5b4fc' : edge.edgeGrade === 'C' ? '#fbbf24' : '#ef4444';
                      return (
                        <TableRow key={i} $columns="2fr 0.8fr 0.8fr 0.8fr 0.5fr 0.6fr">
                          <span style={{ fontSize: '0.82rem', color: '#e2e8f0' }}>
                            {(edge.question || '').length > 55 ? edge.question.slice(0, 52) + '...' : edge.question}
                          </span>
                          <span style={{ color: '#a5b4fc', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            {edge.prob != null ? (edge.prob * 100).toFixed(0) + '%' : '—'}
                          </span>
                          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {edge.marketPrice != null ? (edge.marketPrice * 100).toFixed(0) + '%' : '—'}
                          </span>
                          <span style={{ color: divColor, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            {edge.divergence != null ? ((edge.divergence > 0 ? '+' : '') + (edge.divergence * 100).toFixed(1) + 'pp') : '—'}
                          </span>
                          <span>
                            {edge.edgeQuality != null ? (
                              <span style={{ color: gradeColor, fontWeight: 700, fontSize: '0.85rem' }}>
                                {edge.edgeGrade || '?'}
                                <span style={{ fontSize: '0.65rem', fontWeight: 400, opacity: 0.7 }}> {edge.edgeQuality}</span>
                              </span>
                            ) : '—'}
                          </span>
                          <span>
                            <Chip $strategy={edge.edgeSignal === 'STRONG' ? 'arbitrage' : 'sportsEdge'}>
                              {edge.edgeSignal}
                            </Chip>
                          </span>
                        </TableRow>
                      );
                    })}
                  </Table>
                )}
              </Card>
            </FullWidthSection>

            {/* Signal History Stats */}
            <Card $delay="0.25s">
              <CardTitle>📈 Signal History &amp; Track Record</CardTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#a5b4fc' }}>
                    {calibrationData?.metrics?.totalEdges || indSourcesStatus?.history?.total || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Edges</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>
                    {calibrationData?.metrics?.highQualityEdges || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>High Quality (B+)</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
                    {calibrationData?.metrics?.avgQuality || 0}/100
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Avg Quality</div>
                </div>
              </div>
              {/* Quality Distribution */}
              {calibrationData?.metrics?.qualityDistribution && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600 }}>Quality Distribution</div>
                  <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'flex-end', height: '60px' }}>
                    {['A', 'B', 'C', 'D'].map(grade => {
                      const count = calibrationData.metrics.qualityDistribution[grade] || 0;
                      const maxCount = Math.max(1, ...Object.values(calibrationData.metrics.qualityDistribution));
                      const height = Math.max(4, (count / maxCount) * 50);
                      const colors = { A: '#22c55e', B: '#a5b4fc', C: '#fbbf24', D: '#ef4444' };
                      return (
                        <div key={grade} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{count}</span>
                          <div style={{ width: '100%', height: `${height}px`, background: `${colors[grade]}33`, borderRadius: '4px 4px 0 0', border: `1px solid ${colors[grade]}55` }} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: colors[grade] }}>{grade}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#22c55e' }}>
                    {calibrationData?.metrics?.last24h || 0}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Last 24h</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#a5b4fc' }}>
                    {calibrationData?.metrics?.last7d || 0}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Last 7 Days</div>
                </div>
              </div>
              {/* Pending Resolutions / Track Record Link */}
              {trackRecord && (
                <div style={{ marginTop: '0.75rem', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#a5b4fc' }}>📊 Resolution Tracking</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                        {trackRecord.summary?.pending || 0} edges pending resolution • {trackRecord.summary?.resolved || 0} resolved
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {trackRecord.summary?.resolved > 0 && (
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: trackRecord.summary?.winRate >= 50 ? '#22c55e' : '#ef4444' }}>
                          {trackRecord.summary?.winRate?.toFixed(0) || 0}% win rate
                        </div>
                      )}
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Auto-checks every 30 min
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Discord/Webhook Alerts */}
            <Card $delay="0.28s">
              <CardTitle>🔔 Edge Alerts (Discord / Webhook)</CardTitle>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                Get notified instantly when high-quality edges are detected. Works with Discord webhooks or any URL that accepts POST requests.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <Input
                  type="url"
                  placeholder="Discord webhook URL or custom endpoint..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  $width="280px"
                  style={{ fontSize: '0.8rem' }}
                  aria-label="Webhook URL"
                />
                <Button $variant="ghost" style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                  disabled={!webhookUrl.trim()}
                  onClick={async () => {
                    try {
                      await api('/polybot/intel/webhooks', {
                        method: 'POST',
                        body: JSON.stringify({ url: webhookUrl.trim(), enabled: true }),
                      });
                      setWebhookUrl('');
                      fetchAll();
                    } catch (err) { setError(err.message); }
                  }}>
                  ➕ Add Webhook
                </Button>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 500 }}>Status</span>
                  <Badge $type={webhookConfig?.enabled && webhookConfig?.hasUrls ? 'running' : 'stopped'}>
                    {webhookConfig?.enabled && webhookConfig?.hasUrls ? '● Active' : '○ Inactive'}
                  </Badge>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {webhookConfig?.urlCount || 0} webhook{(webhookConfig?.urlCount || 0) !== 1 ? 's' : ''} configured •
                  Min quality: {webhookConfig?.minQuality || 55}/100 •
                  Min edge: {webhookConfig?.minEdge || 'STRONG'}
                </div>
              </div>
            </Card>

            {/* How It Works */}
            <Card $delay="0.3s">
              <CardTitle>💡 How Independent Sources Work</CardTitle>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#e2e8f0' }}>The Problem:</strong> Most trading signals are derived FROM market prices — making edge detection circular.
                </p>
                <p style={{ marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#e2e8f0' }}>Our Solution:</strong> Three independent data streams that estimate probabilities WITHOUT looking at this market&apos;s price:
                </p>
                <ul style={{ paddingLeft: '1.5rem', listStyle: 'disc' }}>
                  <li><strong style={{ color: '#a5b4fc' }}>LLM Analysis</strong> — AI reads news headlines and uses general knowledge to estimate probability independently</li>
                  <li><strong style={{ color: '#c084fc' }}>Metaculus Forecasts</strong> — Superforecaster crowd medians, one of the best-calibrated public sources</li>
                  <li><strong style={{ color: '#86efac' }}>Manifold Markets</strong> — Independent prediction market prices for cross-platform divergence detection</li>
                </ul>
                <p style={{ marginTop: '0.75rem', color: '#64748b', fontSize: '0.8rem' }}>
                  When independent sources significantly disagree with the market price, that&apos;s a genuine edge signal worth investigating. Wikipedia context provides factual grounding.
                </p>
              </div>
            </Card>

            {/* Bookmaker Odds API — optional add-on */}
            <Card $delay="0.35s">
              <CardTitle>📊 Bookmaker Odds (Optional)</CardTitle>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Optionally connect The Odds API to cross-reference bookmaker lines against prediction market prices. Free tier: 500 requests/month.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <Input
                  type="password"
                  placeholder="Enter Odds API key..."
                  value={oddsApiKey}
                  onChange={(e) => setOddsApiKey(e.target.value)}
                  $width="200px"
                  style={{ fontSize: '0.8rem' }}
                  aria-label="The Odds API key"
                />
                <Button $variant="ghost" onClick={saveOddsKey} disabled={!oddsApiKey.trim()} style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}>
                  💾 Save Key
                </Button>
                <Button $variant="ghost" onClick={fetchBookmakerOdds} disabled={!oddsStatus?.hasKey} style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}>
                  🔄 Fetch Odds
                </Button>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {oddsStatus?.hasKey ? (
                  <span style={{ color: '#34d399' }}>
                    ✅ Key active ({oddsStatus.keyPreview}) — {oddsStatus.cachedEvents || 0} events cached
                    {oddsStatus.requestsRemaining != null && ` — ${oddsStatus.requestsRemaining} API credits left`}
                    {oddsMatches?.polymarketMatches > 0 && ` — ${oddsMatches.polymarketMatches} Polymarket matches found`}
                  </span>
                ) : (
                  <span>Get a free key at <a href="https://the-odds-api.com" target="_blank" rel="noopener noreferrer" style={{ color: '#fbbf24' }}>the-odds-api.com</a> (500 req/month free)</span>
                )}
              </div>
            </Card>
          </Grid>
        )}

        {/* ── TRADES TAB ────────────────────────────────────────── */}
        {activeTab === 'trades' && (
          <Card $delay="0.1s">
            <CardTitle>📜 Trade History ({trades.length})</CardTitle>

            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '10px',
              padding: '0.6rem 0.9rem',
              fontSize: '0.8rem',
              color: '#a5b4fc',
              lineHeight: '1.5',
              marginBottom: '0.75rem',
            }}>
              💡 <strong>Review your paper trades</strong> here. Each row shows the strategy, side (YES/NO), position size, and fill status. All trades are simulated — no real funds. Use <strong>Paper-Trade Top 3</strong> on the Overview tab to generate trades.
            </div>

            <Table>
              <TableRow $header $columns="1.2fr 2fr 0.8fr 0.8fr 0.8fr 0.8fr">
                <span>Time</span>
                <span>Market</span>
                <span>Strategy</span>
                <span>Side</span>
                <span>Size</span>
                <span>Status</span>
              </TableRow>

              {trades.length === 0 ? (
                <EmptyState>No trades yet. Start the scanner and paper-trade to track signals.</EmptyState>
              ) : (
                trades.map((t, i) => (
                  <TableRow key={t.id || i} $columns="1.2fr 2fr 0.8fr 0.8fr 0.8fr 0.8fr">
                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                      {t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : '—'}
                    </span>
                    <span style={{ fontWeight: 500 }}>
                      {t.market?.length > 50 ? t.market.slice(0, 47) + '...' : t.market}
                    </span>
                    <span>
                      <Chip $strategy={t.strategy}>{t.strategy?.replace('_', ' ') || '—'}</Chip>
                    </span>
                    <span style={{ color: t.side === 'NO' ? '#f87171' : '#34d399', fontWeight: 600 }}>
                      {t.side || '—'}
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>${t.positionSize?.toFixed(2) || '0.00'}</span>
                    <span>
                      <Badge $type={t.status === 'FILLED' ? 'running' : 'stopped'}>
                        {t.status || '—'}
                      </Badge>
                    </span>
                  </TableRow>
                ))
              )}
            </Table>
          </Card>
        )}

        {/* ── WATCHLIST TAB ─────────────────────────────────────── */}
        {activeTab === 'watchlist' && (
          <Card $delay="0.1s">
            <CardTitle>⭐ Your Watchlist ({watchlistData.length})</CardTitle>

            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '10px',
              padding: '0.6rem 0.9rem',
              fontSize: '0.8rem',
              color: '#a5b4fc',
              lineHeight: '1.5',
              marginBottom: '0.75rem',
            }}>
              💡 <strong>Track markets you care about.</strong> Add markets from the Markets tab and see price changes, active signals, and volume in one personalized view. Click ✖ to remove.
            </div>

            <Table>
              <TableRow $header $columns="2fr 0.5fr 0.8fr 0.8fr 0.8fr 0.8fr 0.5fr">
                <span>Market</span>
                <span>Platform</span>
                <span>Added At</span>
                <span>Current</span>
                <span>Change</span>
                <span>Signals</span>
                <span></span>
              </TableRow>

              {watchlistData.length === 0 ? (
                <EmptyState>No markets watched yet. Go to the Markets tab and click ⭐ to add.</EmptyState>
              ) : (
                watchlistData.map((w, i) => (
                  <TableRow key={w.conditionId || i} $columns="2fr 0.5fr 0.8fr 0.8fr 0.8fr 0.8fr 0.5fr">
                    <span style={{ fontWeight: 500 }}>
                      {w.market?.length > 50 ? w.market.slice(0, 47) + '...' : w.market}
                    </span>
                    <span>
                      <Badge $type={w.platform === 'KALSHI' ? 'kalshi' : 'running'}>
                        {w.platform === 'KALSHI' ? 'KAL' : 'POLY'}
                      </Badge>
                    </span>
                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                      ${w.priceAtAdd?.toFixed(2) || '—'}
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {w.currentPrice != null ? `${(w.currentPrice * 100).toFixed(0)}¢` : '—'}
                    </span>
                    <span style={{
                      color: w.priceChange > 0 ? '#34d399' : w.priceChange < 0 ? '#f87171' : '#94a3b8',
                      fontWeight: 600,
                    }}>
                      {w.priceChangePct != null ? `${w.priceChangePct > 0 ? '+' : ''}${(w.priceChangePct * 100).toFixed(1)}%` : '—'}
                    </span>
                    <span>
                      {w.signalCount > 0 ? (
                        <Badge $type="running">{w.signalCount} signal{w.signalCount !== 1 ? 's' : ''}</Badge>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>None</span>
                      )}
                    </span>
                    <span>
                      <Button
                        $variant="ghost"
                        onClick={() => removeFromWatchlist(w.conditionId)}
                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                      >
                        ✖
                      </Button>
                    </span>
                  </TableRow>
                ))
              )}
            </Table>
          </Card>
        )}

        {/* ── ALERTS TAB ──────────────────────────────────────── */}
        {activeTab === 'alerts' && (
          <Grid>
            {/* Create Alert */}
            <Card $delay="0.1s">
              <CardTitle>🔔 Create Alert</CardTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Alert Type</label>
                  <select
                    value={newAlertType}
                    onChange={(e) => setNewAlertType(e.target.value)}
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(99,102,241,0.3)',
                      borderRadius: '8px',
                      color: '#e2e8f0',
                      padding: '0.5rem',
                      width: '100%',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="PRICE_MOVE">Price Movement</option>
                    <option value="DIVERGENCE">Bookmaker Divergence</option>
                    <option value="NEW_SIGNAL">High-Score Signal</option>
                    <option value="VOLUME_SPIKE">Volume Spike</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Threshold</label>
                  <Input
                    type="number"
                    value={newAlertThreshold}
                    onChange={(e) => setNewAlertThreshold(e.target.value)}
                    step="0.01"
                    min="0.01"
                    $width="100%"
                    placeholder="e.g. 0.05 = 5%"
                  />
                  <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                    {newAlertType === 'PRICE_MOVE' && 'Price change % (e.g. 0.05 = 5%)'}
                    {newAlertType === 'DIVERGENCE' && 'Min divergence between platforms (e.g. 0.05 = 5%)'}
                    {newAlertType === 'NEW_SIGNAL' && 'Min signal score threshold (0-1, e.g. 0.7 = score 70+)'}
                    {newAlertType === 'VOLUME_SPIKE' && 'Volume increase ratio (e.g. 0.5 = 50% spike)'}
                  </span>
                </div>
                <Button $variant="primary" onClick={createNewAlert}>
                  + Create Alert
                </Button>
              </div>
            </Card>

            {/* Active Alerts */}
            <Card $delay="0.15s" style={{ gridColumn: 'span 2' }}>
              <CardTitle>Active Alerts ({alertsData.alerts?.length || 0})</CardTitle>
              {(!alertsData.alerts || alertsData.alerts.length === 0) ? (
                <EmptyState>No active alerts. Create one to get notified when conditions are met.</EmptyState>
              ) : (
                <Table>
                  <TableRow $header $columns="1fr 1.5fr 0.8fr 0.8fr 0.5fr">
                    <span>Type</span>
                    <span>Market</span>
                    <span>Threshold</span>
                    <span>Fired</span>
                    <span></span>
                  </TableRow>
                  {alertsData.alerts.map((a) => (
                    <TableRow key={a.id} $columns="1fr 1.5fr 0.8fr 0.8fr 0.5fr">
                      <span>
                        <Chip $strategy={a.type}>{a.type.replace('_', ' ')}</Chip>
                      </span>
                      <span style={{ fontSize: '0.85rem' }}>
                        {a.market ? (a.market.length > 40 ? a.market.slice(0, 37) + '...' : a.market) : 'All markets'}
                      </span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{(a.threshold * 100).toFixed(0)}%</span>
                      <span style={{ color: '#94a3b8' }}>{a.firedCount}x</span>
                      <span>
                        <Button
                          $variant="ghost"
                          onClick={() => deleteAlertById(a.id)}
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                        >
                          ✖
                        </Button>
                      </span>
                    </TableRow>
                  ))}
                </Table>
              )}
            </Card>

            {/* Alert History */}
            <FullWidthSection>
              <Card $delay="0.2s">
                <CardTitle>📜 Alert History</CardTitle>
                {(!alertsData.history || alertsData.history.length === 0) ? (
                  <EmptyState>No alerts fired yet. They&apos;ll appear here when conditions are met during scans.</EmptyState>
                ) : (
                  <Table>
                    <TableRow $header $columns="1fr 0.8fr 2.5fr 1fr">
                      <span>Time</span>
                      <span>Type</span>
                      <span>Message</span>
                      <span>Market</span>
                    </TableRow>
                    {alertsData.history.map((h, i) => (
                      <TableRow key={i} $columns="1fr 0.8fr 2.5fr 1fr">
                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                          {h.firedAt ? new Date(h.firedAt).toLocaleTimeString() : '—'}
                        </span>
                        <span>
                          <Chip $strategy={h.type}>{h.type.replace('_', ' ')}</Chip>
                        </span>
                        <span style={{ fontSize: '0.82rem', color: '#e2e8f0' }}>
                          {h.message?.length > 80 ? h.message.slice(0, 77) + '...' : h.message}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          {h.market?.length > 30 ? h.market.slice(0, 27) + '...' : h.market}
                        </span>
                      </TableRow>
                    ))}
                  </Table>
                )}
              </Card>
            </FullWidthSection>
          </Grid>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '2rem', color: '#475569', fontSize: '0.75rem' }}>
          <p>Intelligence mode — analytics & signals only, no real funds at risk. Powered by Polymarket CLOB API & Kalshi API.</p>
          <p style={{ marginTop: '0.25rem' }}>
            Data from{' '}
            <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>
              polymarket.com
            </a>
            {' | '}
            <a href="https://gamma-api.polymarket.com" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>
              Gamma API
            </a>
          </p>
        </div>
      </Container>
    </PageWrapper>
  );
};

export default Polymarket;
