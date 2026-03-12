import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Helmet } from 'react-helmet-async';
import OverviewTab from './polymarket/OverviewTab';
import PicksTab from './polymarket/PicksTab';
import SignalsTab from './polymarket/SignalsTab';
import TwitterTab from './polymarket/TwitterTab';
import YouTubeTab from './polymarket/YouTubeTab';
import MarketsTab from './polymarket/MarketsTab';
import AlphaTab from './polymarket/AlphaTab';
import useSSE from '../hooks/useSSE';
import useSocket from '../hooks/useSocket';

const AnalyticsCharts = lazy(() => import('./AnalyticsCharts'));

// In production, REACT_APP_BOT_URL points to the deployed Railway bot server.
// In dev, empty string uses the local proxy (/polybot → localhost:4000/api).
const BOT_API = process.env.REACT_APP_BOT_URL || '';

// ─── Animations ──────────────────────────────────────────────────────
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
  padding: 1rem 0.5rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  @media (min-width: 480px) {
    padding: 1.5rem 0.75rem;
  }

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
  margin-bottom: 1.25rem;
  animation: ${slideUp} 0.6s ease-out;

  @media (min-width: 768px) {
    margin-bottom: 2rem;
  }
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, #818cf8, #6366f1, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;

  @media (min-width: 480px) {
    font-size: 2rem;
  }

  @media (min-width: 768px) {
    font-size: 3rem;
  }
`;

const Subtitle = styled.p`
  color: #94a3b8;
  font-size: 0.9rem;
  max-width: 600px;
  margin: 0 auto;
  padding: 0 0.5rem;

  @media (min-width: 768px) {
    font-size: 1.1rem;
  }
`;

const Grid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    gap: 1.5rem;
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
  border-radius: 12px;
  padding: 1rem;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  animation: ${slideUp} 0.6s ease-out;
  animation-delay: ${(props) => props.$delay || '0s'};
  animation-fill-mode: both;
  overflow: hidden;

  @media (min-width: 768px) {
    border-radius: 16px;
    padding: 1.5rem;
  }

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
  padding: 0.6rem 0.75rem;
  color: #e2e8f0;
  font-size: 0.9rem;
  width: ${(props) => props.$width || '100%'};
  max-width: 100%;
  font-variant-numeric: tabular-nums;

  @media (min-width: 480px) {
    width: ${(props) => props.$width || '120px'};
  }

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }
`;

const Table = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: ${(props) => props.$columns || '2fr 1fr 1fr 1fr 1fr'};
  gap: 0.5rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid rgba(99, 102, 241, 0.08);
  align-items: center;
  font-size: 0.75rem;
  min-width: 500px;

  @media (min-width: 768px) {
    gap: 0.75rem;
    padding: 0.75rem 0;
    font-size: 0.85rem;
    min-width: 600px;
  }

  &:last-child {
    border-bottom: none;
  }

  ${(props) =>
    props.$header &&
    css`
      color: #64748b;
      font-weight: 600;
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;

      @media (min-width: 768px) {
        font-size: 0.75rem;
      }
    `}

  &:not(:first-child):hover {
    background: rgba(99, 102, 241, 0.05);
    border-radius: 8px;
  }
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
  gap: 0.15rem;
  background: rgba(15, 15, 26, 0.5);
  border-radius: 12px;
  padding: 0.25rem;
  margin-bottom: 1rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (min-width: 768px) {
    gap: 0.25rem;
  }
`;

const Tab = styled.button`
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s;
  background: ${(props) => (props.$active ? 'rgba(99, 102, 241, 0.2)' : 'transparent')};
  color: ${(props) => (props.$active ? '#a5b4fc' : '#64748b')};
  flex-shrink: 0;

  @media (min-width: 480px) {
    font-size: 0.78rem;
    padding: 0.5rem 0.9rem;
  }

  @media (min-width: 768px) {
    font-size: 0.8rem;
    padding: 0.5rem 1rem;
  }

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
      : 'rgba(251, 191, 36, 0.15)'};
  color: ${(props) =>
    props.$strategy === 'NO_BETS'
      ? '#34d399'
      : props.$strategy === 'ARBITRAGE'
      ? '#a5b4fc'
      : '#fbbf24'};
`;

// ─── API Helper ──────────────────────────────────────────────────────
const isProduction = window.location.hostname !== 'localhost';
async function api(path, options = {}) {
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // In production or when BOT_API is set, rewrite /polybot/... → /api/...
      // In local dev, keep /polybot/... for the CRA proxy
      const resolvedPath = (BOT_API || isProduction)
        ? path.replace(/^\/polybot/, '/api')
        : path;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout per request
      const res = await fetch(`${BOT_API}${resolvedPath}`, {
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        ...options,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      return res.json();
    } catch (err) {
      if (attempt < maxRetries && (
        err.name === 'AbortError' ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('Load failed') ||
        err.message?.includes('ERR_CONNECTION') ||
        err.message?.includes('NetworkError')
      )) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1))); // backoff: 500ms, 1000ms
        continue;
      }
      if (
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('Load failed') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('ECONNREFUSED') ||
        err.name === 'AbortError'
      ) {
        throw new Error('Bot server offline. Start it with: cd bot && node server.js');
      }
      throw err;
    }
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
  const [picksRecord, setPicksRecord] = useState(null);
  const [picksResolving, setPicksResolving] = useState(false);
  const [learningData, setLearningData] = useState(null);

  // Tab UI state
  const [marketSearch, setMarketSearch] = useState('');
  const [marketSort, setMarketSort] = useState('volume');
  const [marketPlatform, setMarketPlatform] = useState('ALL');
  const [tradeFilter, setTradeFilter] = useState('all');
  const [signalSearch, setSignalSearch] = useState('');
  const [picksGradeFilter, setPicksGradeFilter] = useState('ALL');
  const [alertMarket, setAlertMarket] = useState('');
  const [marketsShown, setMarketsShown] = useState(20);

  // YouTube & Twitter tracker state
  const [ytStatus, setYtStatus] = useState(null);
  const [ytAnalyzeQ, setYtAnalyzeQ] = useState('');
  const [ytAnalyzeResult, setYtAnalyzeResult] = useState(null);
  const [ytAnalyzing, setYtAnalyzing] = useState(false);
  const [ytTrending, setYtTrending] = useState(null);
  const [ytTrendingLoading, setYtTrendingLoading] = useState(false);
  const [twStatus, setTwStatus] = useState(null);
  const [twTrending, setTwTrending] = useState(null);
  const [twTrendingLoading, setTwTrendingLoading] = useState(false);
  const [twSimUser, setTwSimUser] = useState('elonmusk');
  const [twSimCurrent, setTwSimCurrent] = useState('60');
  const [twSimTarget, setTwSimTarget] = useState('120');
  const [twSimHours, setTwSimHours] = useState('168');
  const [twSimResult, setTwSimResult] = useState(null);
  const [twSimulating, setTwSimulating] = useState(false);
  const [twAnalyzeQ, setTwAnalyzeQ] = useState('');
  const [twAnalyzeResult, setTwAnalyzeResult] = useState(null);
  const [twAnalyzing, setTwAnalyzing] = useState(false);
  const [, setCulturalStatus] = useState(null);
  const [elonImpact, setElonImpact] = useState(null);

  // ─── Data Fetching (chunked to prevent connection overload) ──────
  const fetchingRef = useRef(false);         // dedup guard
  const slowPollCountRef = useRef(0);        // slow-poll counter
  const SLOW_POLL_EVERY = 6;                 // non-critical data every 6th tick (30s at 5s interval)

  // Critical data — small, fast, needed every tick
  const fetchCritical = useCallback(async () => {
    const [healthData, statusData, posData, perfData] = await Promise.all([
      api('/polybot/health').catch(() => null),
      api('/polybot/bot/status').catch(() => null),
      api('/polybot/positions').catch(() => []),
      api('/polybot/performance').catch(() => null),
    ]);
    setConnected(healthData?.status === 'ok');
    setStatus(statusData);
    setPositions(posData);
    setPerformance(perfData);
  }, []);

  // Medium data — markets, opps, trades (every tick but capped)
  const fetchMarkets = useCallback(async () => {
    const [marketsData, oppsData, tradesData, kalshiMkts] = await Promise.all([
      api('/polybot/markets?limit=30').catch(() => []),
      api('/polybot/opportunities?limit=50').catch(() => []),
      api('/polybot/trades?limit=50').catch(() => []),
      api('/polybot/kalshi/markets?limit=30').catch(() => []),
    ]);
    const polyTagged = (Array.isArray(marketsData) ? marketsData : []).map(m => ({ ...m, platform: m.platform || 'POLYMARKET' }));
    const kalshiTagged = Array.isArray(kalshiMkts) ? kalshiMkts : [];
    const merged = [...polyTagged, ...kalshiTagged].sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0));
    setMarkets(merged);
    setOpportunities(oppsData);
    setTrades(tradesData);
  }, []);

  // Slow data — intel, calibration, etc. (every ~30s)
  const fetchIntel = useCallback(async () => {
    const [wlData, alertData] = await Promise.all([
      api('/polybot/intel/watchlist').catch(() => []),
      api('/polybot/intel/alerts').catch(() => ({ alerts: [], history: [] })),
    ]);
    setWatchlistData(Array.isArray(wlData) ? wlData : []);
    setAlertsData(alertData || { alerts: [], history: [] });

    // Non-blocking wave 2: intel details
    api('/polybot/intel/independent/status').then(s => {
      if (s) setIndSourcesStatus(s);
      if (s?.llm?.configured) setLlmConfigured(true);
    }).catch(() => {});
    api('/polybot/intel/independent/cached?minQuality=0').then(data => {
      if (data?.results?.length > 0) {
        const edges = data.results.filter(r => r.edgeSignal === 'STRONG' || r.edgeSignal === 'MODERATE');
        if (edges.length > 0) setIndEdges(edges);
        setScanStatus({ lastScan: data.lastScan, nextScan: data.nextScan, scanRunning: data.scanRunning, total: data.totalCached });
      }
    }).catch(() => {});

    // Non-blocking wave 3: analytics (staggered 200ms to avoid burst)
    setTimeout(() => {
      api('/polybot/intel/calibration').then(c => { if (c) setCalibrationData(c); }).catch(() => {});
      api('/polybot/intel/webhooks').then(w => { if (w) setWebhookConfig(w); }).catch(() => {});
      api('/polybot/intel/track-record').then(t => { if (t) setTrackRecord(t); }).catch(() => {});
    }, 200);
    setTimeout(() => {
      api('/polybot/accas').then(a => { if (a) setAccaData(a); }).catch(() => {});
      api('/polybot/picks/track-record').then(r => { if (r) setPicksRecord(r); }).catch(() => {});
      api('/polybot/picks/learning').then(l => { if (l) setLearningData(l); }).catch(() => {});
    }, 400);

    // Non-blocking wave 4: tracker status (staggered 600ms)
    setTimeout(() => {
      api('/polybot/intel/youtube/status').then(d => { if (d) setYtStatus(d); }).catch(() => {});
      api('/polybot/intel/youtube/trending').then(d => { if (d?.markets) setYtTrending(d); }).catch(() => {});
      api('/polybot/intel/twitter/status').then(d => { if (d) setTwStatus(d); }).catch(() => {});
      api('/polybot/intel/twitter/trending').then(d => { if (d?.markets) setTwTrending(d); }).catch(() => {});
      api('/polybot/intel/cultural/status').then(d => { if (d) setCulturalStatus(d); }).catch(() => {});
      api('/polybot/intel/cultural/elon-impact').then(d => { if (d && !d.error) setElonImpact(d); }).catch(() => {});
    }, 600);
  }, []);

  // Main poll tick — deduped, chunked
  const fetchAll = useCallback(async () => {
    if (fetchingRef.current) return;          // skip if previous still in-flight
    fetchingRef.current = true;
    try {
      await fetchCritical();                  // wave 1: health + status (4 reqs)
      await fetchMarkets();                   // wave 2: markets + opps (4 reqs)
      slowPollCountRef.current += 1;
      if (slowPollCountRef.current >= SLOW_POLL_EVERY) {
        slowPollCountRef.current = 0;
        fetchIntel();                         // wave 3: intel (fire-and-forget, ~11 reqs staggered)
      }
      setError(null);
    } catch (err) {
      setConnected(false);
      setError(err.message);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [fetchCritical, fetchMarkets, fetchIntel]);

  // ─── SSE: real-time push events from bot server ──────────────────
  const { lastEvent, connected: sseConnected } = useSSE({
    onEvent: useCallback((evt) => {
      // Trigger targeted refresh based on event type
      switch (evt.type) {
        case 'scan:complete':
          fetchMarkets();
          break;
        case 'trade:new':
        case 'trade:closed':
          fetchCritical();
          fetchMarkets();
          break;
        case 'edge:detected':
          fetchMarkets();
          break;
        case 'status:update':
          fetchCritical();
          break;
        case 'alert:fired':
          fetchIntel();
          break;
        default:
          break;
      }
    }, [fetchCritical, fetchMarkets, fetchIntel]),
  });

  // ─── WebSocket: bidirectional real-time via Socket.IO ────────────
  const { connected: wsConnected, events: wsEvents, lastTrade } = useSocket();

  // Refresh on WS trade events
  useEffect(() => {
    if (lastTrade) { fetchCritical(); fetchMarkets(); }
  }, [lastTrade, fetchCritical, fetchMarkets]);

  useEffect(() => {
    // Initial load: fetch everything including intel
    const init = async () => {
      fetchingRef.current = true;
      try {
        await fetchCritical();
        await fetchMarkets();
        await fetchIntel();
        setError(null);
      } catch (err) {
        setConnected(false);
        setError(err.message);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };
    init();
    // SSE handles real-time updates; poll at 30s as fallback only
    pollRef.current = setInterval(fetchAll, 30000);
    return () => clearInterval(pollRef.current);
  }, [fetchAll, fetchCritical, fetchMarkets, fetchIntel]);

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
  const filteredOpps = (() => {
    // Apply text search first
    const searchFiltered = signalSearch
      ? opportunities.filter(o => (o.market || '').toLowerCase().includes(signalSearch.toLowerCase()))
      : opportunities;

    if (oppsFilter === 'ALL') return searchFiltered;
    if (oppsFilter === 'TOP_5') {
      // Strategy-diverse Top 5: best from each active strategy, then fill by score
      const sorted = [...searchFiltered].sort((a, b) => (b.score || 0) - (a.score || 0));
      const strategies = ['NO_BETS', 'ARBITRAGE', 'SPORTS_EDGE'];
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
    }
    return searchFiltered.filter((o) => o.strategy === oppsFilter);
  })();

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
          {['overview', 'signals', 'picks', 'markets', 'watchlist', 'alerts', 'sources', 'twitter', 'youtube', 'trades', 'analytics', 'alpha'].map((tab) => (
            <Tab key={tab} $active={activeTab === tab} onClick={() => setActiveTab(tab)}>
              {tab === 'overview' && '📊 '}
              {tab === 'signals' && '🎯 '}
              {tab === 'picks' && '🏆 '}
              {tab === 'markets' && '🌐 '}
              {tab === 'watchlist' && '⭐ '}
              {tab === 'alerts' && '🔔 '}
              {tab === 'sources' && '🧠 '}
              {tab === 'twitter' && '🐦 '}
              {tab === 'youtube' && '▶️ '}
              {tab === 'trades' && '📜 '}
              {tab === 'analytics' && '📉 '}
              {tab === 'alpha' && '⚡ '}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Tab>
          ))}
        </TabBar>

        {/* ── OVERVIEW TAB ──────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <OverviewTab ctx={{
            indEdges, status, trackRecord, picksRecord, performance, connected, isRunning, mode,
            bankrollInput, setBankrollInput, opportunities, scanning, scanResult, scanStatus,
            indSourcesStatus, llmConfigured, learningData, positions,
            startBot, stopBot, triggerScan, autoExecute, resetBot, setActiveTab,
            sseConnected, lastEvent,
          }} />
        )}

        {/* ── SIGNALS TAB ──────────────────────────────────────── */}
        {activeTab === 'signals' && (
          <SignalsTab ctx={{
            filteredOpps, oppsFilter, setOppsFilter, connected, isRunning,
            signalSearch, setSignalSearch, addToWatchlist, setTradeModal, setTradeSide,
          }} />
        )}

        {/* ── PICKS TAB (redesigned) ─────────────────────────────── */}
        {activeTab === 'picks' && (
          <PicksTab ctx={{
            picksGradeFilter, setPicksGradeFilter,
            accaData, setAccaData, accaBuilding, setAccaBuilding,
            picksRecord, setPicksRecord, picksResolving, setPicksResolving,
            learningData, api,
          }} />
        )}


        {/* ── MARKETS TAB ───────────────────────────────────────── */}
        {activeTab === 'markets' && (
          <MarketsTab ctx={{
            markets, marketSearch, setMarketSearch, marketSort, setMarketSort,
            marketPlatform, setMarketPlatform, marketsShown, setMarketsShown,
            addToWatchlist, watchlistData, setTradeModal, setTradeSide, connected,
          }} />
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.5rem', marginTop: '0.75rem' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))', gap: '0.4rem' }}>
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

            {/* Source Reliability Summary */}
            <FullWidthSection>
              <Card $delay="0.18s">
                <CardTitle>📊 Source Reliability</CardTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.4rem' }}>
                  {[
                    ...(indSourcesStatus?.polling?.sources || []).map(s => ({
                      name: s.name, type: 'poll',
                      successes: s.stats?.successes || 0,
                      failures: s.stats?.failures || 0,
                      status: s.status,
                    })),
                    ...(indSourcesStatus?.expert?.sources || []).map(s => ({
                      name: s.name, type: 'expert',
                      successes: s.stats?.successes || 0,
                      failures: s.stats?.failures || 0,
                      status: s.status,
                    })),
                    {
                      name: 'GPT-4o AI', type: 'llm',
                      successes: indSourcesStatus?.llm?.totalCalls || 0,
                      failures: 0,
                      status: llmConfigured ? 'active' : 'down',
                    },
                  ].map((src, i) => {
                    const total = src.successes + src.failures;
                    const reliability = total > 0 ? ((src.successes / total) * 100).toFixed(0) : '—';
                    return (
                      <div key={i} style={{
                        background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '0.55rem 0.65rem',
                        border: `1px solid ${src.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.15)'}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: src.status === 'active' ? '#e2e8f0' : '#64748b' }}>{src.name}</span>
                          <span style={{ fontSize: '0.6rem', color: src.status === 'active' ? '#22c55e' : '#64748b' }}>{src.status === 'active' ? '●' : '○'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: reliability === '—' ? '#64748b' : Number(reliability) >= 90 ? '#22c55e' : Number(reliability) >= 70 ? '#fbbf24' : '#f87171' }}>
                            {reliability}{reliability !== '—' ? '%' : ''}
                          </span>
                          <span style={{ fontSize: '0.6rem', color: '#64748b' }}>reliability</span>
                        </div>
                        <div style={{ fontSize: '0.62rem', color: '#475569', marginTop: '0.15rem' }}>
                          {src.successes}✓ {src.failures > 0 ? `${src.failures}✗` : ''} {total > 0 ? `· ${total} total` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </FullWidthSection>

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
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
                  <>
                    {/* Desktop table — hidden on mobile */}
                    <Table className="edge-table-desktop">
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
                    {/* Mobile cards — hidden on desktop */}
                    <div className="edge-cards-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {indEdges.map((edge, i) => {
                        const divColor = (edge.divergence || 0) > 0 ? '#22c55e' : '#ef4444';
                        const gradeColor = edge.edgeGrade === 'A' ? '#22c55e' : edge.edgeGrade === 'B' ? '#a5b4fc' : edge.edgeGrade === 'C' ? '#fbbf24' : '#ef4444';
                        return (
                          <div key={i} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '0.65rem 0.75rem', border: `1px solid ${edge.edgeSignal === 'STRONG' ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)'}` }}>
                            <div style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 500, marginBottom: '0.4rem', lineHeight: 1.3 }}>
                              {(edge.question || '').length > 80 ? edge.question.slice(0, 77) + '...' : edge.question}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Ind: <strong style={{ color: '#a5b4fc' }}>{edge.prob != null ? (edge.prob * 100).toFixed(0) + '%' : '—'}</strong></span>
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Mkt: <strong>{edge.marketPrice != null ? (edge.marketPrice * 100).toFixed(0) + '%' : '—'}</strong></span>
                              <span style={{ fontSize: '0.78rem', color: divColor, fontWeight: 700 }}>
                                {edge.divergence != null ? ((edge.divergence > 0 ? '+' : '') + (edge.divergence * 100).toFixed(1) + 'pp') : '—'}
                              </span>
                              {edge.edgeQuality != null && (
                                <span style={{ color: gradeColor, fontWeight: 700, fontSize: '0.78rem' }}>
                                  {edge.edgeGrade || '?'}
                                </span>
                              )}
                              <Chip $strategy={edge.edgeSignal === 'STRONG' ? 'arbitrage' : 'sportsEdge'}>
                                {edge.edgeSignal}
                              </Chip>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </Card>
            </FullWidthSection>

            {/* Signal History Stats */}
            <Card $delay="0.25s">
              <CardTitle>📈 Signal History &amp; Track Record</CardTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ textAlign: 'center', padding: '0.4rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#a5b4fc' }}>
                    {calibrationData?.metrics?.totalEdges || indSourcesStatus?.history?.total || 0}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Total Edges</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.4rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#22c55e' }}>
                    {calibrationData?.metrics?.highQualityEdges || 0}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>High Quality (B+)</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.4rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f59e0b' }}>
                    {calibrationData?.metrics?.avgQuality || 0}/100
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Avg Quality</div>
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
                  $width="100%"
                  style={{ fontSize: '0.8rem', flex: '1 1 200px', minWidth: 0 }}
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
                  $width="100%"
                  style={{ fontSize: '0.8rem', flex: '1 1 160px', minWidth: 0 }}
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

        {/* ── TWITTER TAB ───────────────────────────────────────── */}
        {activeTab === 'twitter' && (
          <TwitterTab ctx={{
            twStatus, twTrending, twTrendingLoading, setTwTrendingLoading, setTwTrending,
            setError, elonImpact, twSimUser, setTwSimUser, twSimCurrent, setTwSimCurrent,
            twSimTarget, setTwSimTarget, twSimHours, setTwSimHours, twSimulating,
            setTwSimulating, twSimResult, setTwSimResult, twAnalyzeQ, setTwAnalyzeQ,
            twAnalyzing, setTwAnalyzing, twAnalyzeResult, setTwAnalyzeResult, api,
          }} />
        )}
        {/* ── YOUTUBE TAB ───────────────────────────────────────── */}
        {activeTab === 'youtube' && (
          <YouTubeTab ctx={{
            ytStatus, ytTrending, ytTrendingLoading, setYtTrendingLoading, setYtTrending,
            setError, ytAnalyzeQ, setYtAnalyzeQ, ytAnalyzing, setYtAnalyzing,
            ytAnalyzeResult, setYtAnalyzeResult, api,
          }} />
        )}
        {/* ── TRADES TAB ────────────────────────────────────────── */}
        {activeTab === 'trades' && (
          <Grid>
            {/* Performance Summary Strip */}
            <FullWidthSection>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: '0.4rem', marginBottom: '0.5rem' }}>
                {[
                  { label: 'Total Trades', value: trades.length, icon: '📊', color: '#a5b4fc' },
                  { label: 'Filled', value: trades.filter(t => t.status === 'FILLED').length, icon: '✅', color: '#22c55e' },
                  { label: 'Deployed', value: `$${trades.reduce((s, t) => s + (t.positionSize || 0), 0).toFixed(0)}`, icon: '💵', color: '#fbbf24' },
                  { label: 'Avg Size', value: trades.length > 0 ? `$${(trades.reduce((s, t) => s + (t.positionSize || 0), 0) / trades.length).toFixed(2)}` : '$0', icon: '📐', color: '#c084fc' },
                  { label: 'Strategies', value: [...new Set(trades.map(t => t.strategy).filter(Boolean))].length, icon: '🎯', color: '#34d399' },
                  { label: 'P&L', value: `${(performance?.totalPnL || 0) >= 0 ? '+' : ''}$${(performance?.totalPnL || 0).toFixed(2)}`, icon: '📈', color: (performance?.totalPnL || 0) >= 0 ? '#22c55e' : '#ef4444' },
                ].map((kpi, i) => (
                  <div key={i} style={{ background: 'rgba(30, 30, 50, 0.9)', borderRadius: '10px', padding: '0.55rem 0.4rem', textAlign: 'center', border: '1px solid rgba(99, 102, 241, 0.12)' }}>
                    <div style={{ fontSize: '0.7rem', marginBottom: '0.1rem' }}>{kpi.icon}</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: kpi.color, fontVariantNumeric: 'tabular-nums' }}>{kpi.value}</div>
                    <div style={{ fontSize: '0.55rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</div>
                  </div>
                ))}
              </div>
            </FullWidthSection>

            <FullWidthSection>
              <Card $delay="0.1s">
                {/* Header with filter & export */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <CardTitle style={{ margin: 0 }}>📜 Trade History</CardTitle>
                  <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                    {['all', 'today', 'week'].map(f => (
                      <Button key={f} $variant={tradeFilter === f ? 'primary' : 'ghost'} onClick={() => setTradeFilter(f)}
                        style={{ fontSize: '0.68rem', padding: '0.25rem 0.55rem' }}>
                        {f === 'all' ? 'All' : f === 'today' ? 'Today' : '7d'}
                      </Button>
                    ))}
                    <Button $variant="ghost" style={{ fontSize: '0.68rem', padding: '0.25rem 0.55rem' }}
                      onClick={() => { const csv = trades.map(t => `${t.timestamp||''},"${(t.market||'').replace(/"/g,'')}",${t.strategy||''},${t.side||''},${t.positionSize||0},${t.status||''}`).join('\n'); navigator.clipboard?.writeText(`Time,Market,Strategy,Side,Size,Status\n${csv}`).then(() => alert('Copied to clipboard!')); }}>
                      📋 Export
                    </Button>
                  </div>
                </div>

                {/* Strategy Breakdown Bar */}
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  {[{ k: 'NO_BETS', l: 'NO', c: '#34d399' }, { k: 'ARBITRAGE', l: 'ARB', c: '#a5b4fc' }, { k: 'SPORTS_EDGE', l: 'SPREAD', c: '#fbbf24' }].map(s => {
                    const count = trades.filter(t => t.strategy === s.k).length;
                    return (
                      <div key={s.k} style={{ background: count > 0 ? `${s.c}10` : 'rgba(0,0,0,0.2)', border: `1px solid ${count > 0 ? `${s.c}30` : 'rgba(100,116,139,0.15)'}`, borderRadius: '8px', padding: '0.3rem 0.55rem', fontSize: '0.7rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: s.c }}>{count}</span>
                        <span style={{ color: count > 0 ? '#e2e8f0' : '#64748b' }}>{s.l}</span>
                      </div>
                    );
                  })}
                  {trades.length > 0 && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.6rem', fontSize: '0.72rem', color: '#64748b', alignItems: 'center' }}>
                      <span>YES: <strong style={{ color: '#34d399' }}>{trades.filter(t => t.side === 'YES').length}</strong></span>
                      <span>NO: <strong style={{ color: '#f87171' }}>{trades.filter(t => t.side === 'NO').length}</strong></span>
                    </div>
                  )}
                </div>

                <Table>
                  <TableRow $header $columns="1.1fr 2.2fr 0.7fr 0.5fr 0.7fr 0.6fr">
                    <span>Time</span>
                    <span>Market</span>
                    <span>Strategy</span>
                    <span>Side</span>
                    <span>Size</span>
                    <span>Status</span>
                  </TableRow>

                  {(() => {
                    const now = new Date();
                    const filtered = trades.filter(t => {
                      if (tradeFilter === 'all') return true;
                      if (!t.timestamp) return false;
                      const d = new Date(t.timestamp);
                      if (tradeFilter === 'today') return d.toDateString() === now.toDateString();
                      if (tradeFilter === 'week') return (now - d) < 7 * 24 * 60 * 60 * 1000;
                      return true;
                    });
                    return filtered.length === 0 ? (
                      <EmptyState>
                        {trades.length === 0
                          ? <span>No trades yet. Use <strong>Paper-Trade Top 3</strong> on the Overview tab or manually trade from the Markets tab.</span>
                          : `No trades for ${tradeFilter === 'today' ? 'today' : 'this week'}. Try a different filter.`}
                      </EmptyState>
                    ) : (
                      filtered.map((t, i) => (
                        <TableRow key={t.id || i} $columns="1.1fr 2.2fr 0.7fr 0.5fr 0.7fr 0.6fr">
                          <span style={{ color: '#64748b', fontSize: '0.72rem', fontVariantNumeric: 'tabular-nums' }}>
                            {t.timestamp ? new Date(t.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                          <span style={{ fontWeight: 500, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ fontSize: '0.55rem', fontWeight: 700, padding: '0.05rem 0.25rem', borderRadius: '3px', background: t.platform === 'KALSHI' ? 'rgba(59,130,246,0.15)' : 'rgba(139,92,246,0.15)', color: t.platform === 'KALSHI' ? '#60a5fa' : '#a78bfa', flexShrink: 0 }}>{t.platform === 'KALSHI' ? 'K' : 'P'}</span>
                            <span>{t.market?.length > 48 ? t.market.slice(0, 45) + '...' : t.market}</span>
                          </span>
                          <span><Chip $strategy={t.strategy}>{t.strategy === 'NO_BETS' ? 'NO' : t.strategy === 'ARBITRAGE' ? 'ARB' : 'SPRD'}</Chip></span>
                          <span style={{ color: t.side === 'NO' ? '#f87171' : '#34d399', fontWeight: 600, fontSize: '0.82rem' }}>{t.side || '—'}</span>
                          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>${t.positionSize?.toFixed(2) || '0.00'}</span>
                          <span><Badge $type={t.status === 'FILLED' ? 'running' : 'stopped'}>{t.status || '—'}</Badge></span>
                        </TableRow>
                      ))
                    );
                  })()}
                </Table>
              </Card>
            </FullWidthSection>
          </Grid>
        )}

        {/* ── WATCHLIST TAB ─────────────────────────────────────── */}
        {activeTab === 'watchlist' && (
          <Grid>
            {/* Watchlist Summary Strip */}
            <FullWidthSection>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.4rem', marginBottom: '0.5rem' }}>
                {[
                  { label: 'Watching', value: watchlistData.length, icon: '⭐', color: '#fbbf24' },
                  { label: 'With Signals', value: watchlistData.filter(w => w.signalCount > 0).length, icon: '🎯', color: '#22c55e' },
                  { label: 'Price Up', value: watchlistData.filter(w => (w.priceChange || 0) > 0).length, icon: '📈', color: '#34d399' },
                  { label: 'Price Down', value: watchlistData.filter(w => (w.priceChange || 0) < 0).length, icon: '📉', color: '#f87171' },
                  { label: 'Polymarket', value: watchlistData.filter(w => w.platform !== 'KALSHI').length, icon: '🟣', color: '#a78bfa' },
                  { label: 'Kalshi', value: watchlistData.filter(w => w.platform === 'KALSHI').length, icon: '🔵', color: '#60a5fa' },
                ].map((kpi, i) => (
                  <div key={i} style={{ background: 'rgba(30, 30, 50, 0.9)', borderRadius: '10px', padding: '0.55rem 0.4rem', textAlign: 'center', border: '1px solid rgba(99, 102, 241, 0.12)' }}>
                    <div style={{ fontSize: '0.7rem', marginBottom: '0.1rem' }}>{kpi.icon}</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: kpi.color, fontVariantNumeric: 'tabular-nums' }}>{kpi.value}</div>
                    <div style={{ fontSize: '0.55rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</div>
                  </div>
                ))}
              </div>
            </FullWidthSection>

            <FullWidthSection>
              <Card $delay="0.1s">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <CardTitle style={{ margin: 0 }}>⭐ Watchlist</CardTitle>
                  <Button $variant="ghost" onClick={() => setActiveTab('markets')} style={{ fontSize: '0.72rem', padding: '0.3rem 0.7rem' }}>
                    + Add from Markets
                  </Button>
                </div>

                {watchlistData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⭐</div>
                    <div style={{ fontSize: '1rem', color: '#e2e8f0', fontWeight: 600, marginBottom: '0.4rem' }}>No markets watched yet</div>
                    <div style={{ color: '#64748b', maxWidth: '350px', margin: '0 auto', fontSize: '0.85rem', marginBottom: '1rem' }}>
                      Track the markets you care about. You&apos;ll see live prices, changes, and any active signals.
                    </div>
                    <Button $variant="primary" onClick={() => setActiveTab('markets')} style={{ fontSize: '0.85rem' }}>
                      Browse Markets →
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {watchlistData.map((w, i) => {
                      const changeUp = (w.priceChange || 0) > 0;
                      const changeDown = (w.priceChange || 0) < 0;
                      return (
                        <div key={w.conditionId || i} style={{
                          background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '0.65rem 0.75rem',
                          border: `1px solid ${w.signalCount > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.08)'}`,
                          display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap',
                        }}>
                          {/* Direction arrow */}
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                            background: changeUp ? 'rgba(34,197,94,0.12)' : changeDown ? 'rgba(239,68,68,0.12)' : 'rgba(100,116,139,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
                          }}>
                            {changeUp ? '↑' : changeDown ? '↓' : '→'}
                          </div>
                          {/* Market info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                              <span style={{ fontSize: '0.55rem', fontWeight: 700, padding: '0.05rem 0.25rem', borderRadius: '3px', background: w.platform === 'KALSHI' ? 'rgba(59,130,246,0.15)' : 'rgba(139,92,246,0.15)', color: w.platform === 'KALSHI' ? '#60a5fa' : '#a78bfa' }}>{w.platform === 'KALSHI' ? 'K' : 'P'}</span>
                              <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {w.market?.length > 55 ? w.market.slice(0, 52) + '...' : w.market}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', fontSize: '0.75rem' }}>
                              <span style={{ color: '#64748b' }}>Added: <strong style={{ color: '#94a3b8' }}>{w.priceAtAdd ? `${(w.priceAtAdd * 100).toFixed(0)}¢` : '—'}</strong></span>
                              <span style={{ color: '#64748b' }}>Now: <strong style={{ color: '#e2e8f0' }}>{w.currentPrice != null ? `${(w.currentPrice * 100).toFixed(0)}¢` : '—'}</strong></span>
                              <span style={{ color: changeUp ? '#22c55e' : changeDown ? '#ef4444' : '#64748b', fontWeight: 700 }}>
                                {w.priceChangePct != null ? `${w.priceChangePct > 0 ? '+' : ''}${(w.priceChangePct * 100).toFixed(1)}%` : '—'}
                              </span>
                              {w.signalCount > 0 && (
                                <Badge $type="running">{w.signalCount} signal{w.signalCount !== 1 ? 's' : ''}</Badge>
                              )}
                            </div>
                          </div>
                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                            <Button $variant="ghost" onClick={() => { const m = markets.find(mk => mk.conditionId === w.conditionId); if (m) { setTradeModal(m); setTradeSide('YES'); } }} style={{ fontSize: '0.68rem', padding: '0.2rem 0.4rem' }} title="Paper trade">📝</Button>
                            <Button $variant="ghost" onClick={() => removeFromWatchlist(w.conditionId)} style={{ fontSize: '0.68rem', padding: '0.2rem 0.4rem', color: '#f87171' }} title="Remove">✖</Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </FullWidthSection>
          </Grid>
        )}

        {/* ── ALERTS TAB ──────────────────────────────────────── */}
        {activeTab === 'alerts' && (
          <Grid>
            {/* Alert Summary Strip */}
            <FullWidthSection>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.4rem', marginBottom: '0.5rem' }}>
                {[
                  { label: 'Active', value: alertsData.alerts?.length || 0, icon: '🔔', color: '#fbbf24' },
                  { label: 'Total Fired', value: (alertsData.alerts || []).reduce((s, a) => s + (a.firedCount || 0), 0), icon: '⚡', color: '#c084fc' },
                  { label: 'History', value: alertsData.history?.length || 0, icon: '📜', color: '#a5b4fc' },
                  { label: 'Price Alerts', value: (alertsData.alerts || []).filter(a => a.type === 'PRICE_MOVE').length, icon: '📊', color: '#34d399' },
                  { label: 'Signal Alerts', value: (alertsData.alerts || []).filter(a => a.type === 'NEW_SIGNAL').length, icon: '🎯', color: '#22c55e' },
                ].map((kpi, i) => (
                  <div key={i} style={{ background: 'rgba(30, 30, 50, 0.9)', borderRadius: '10px', padding: '0.55rem 0.4rem', textAlign: 'center', border: '1px solid rgba(99, 102, 241, 0.12)' }}>
                    <div style={{ fontSize: '0.7rem', marginBottom: '0.1rem' }}>{kpi.icon}</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: kpi.color, fontVariantNumeric: 'tabular-nums' }}>{kpi.value}</div>
                    <div style={{ fontSize: '0.55rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</div>
                  </div>
                ))}
              </div>
            </FullWidthSection>

            {/* Create Alert — Full Width */}
            <FullWidthSection>
              <Card $delay="0.1s">
                <CardTitle>🔔 Create Alert</CardTitle>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 140px', minWidth: '140px' }}>
                    <label style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block', marginBottom: '0.2rem' }}>Type</label>
                    <select value={newAlertType} onChange={(e) => setNewAlertType(e.target.value)}
                      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#e2e8f0', padding: '0.45rem 0.5rem', width: '100%', fontSize: '0.8rem' }}>
                      <option value="PRICE_MOVE">📊 Price Movement</option>
                      <option value="DIVERGENCE">🔀 Bookmaker Divergence</option>
                      <option value="NEW_SIGNAL">🎯 High-Score Signal</option>
                      <option value="VOLUME_SPIKE">📈 Volume Spike</option>
                    </select>
                  </div>
                  <div style={{ flex: '1 1 100px', minWidth: '100px' }}>
                    <label style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block', marginBottom: '0.2rem' }}>Threshold</label>
                    <Input type="number" value={newAlertThreshold} onChange={(e) => setNewAlertThreshold(e.target.value)}
                      step="0.01" min="0.01" $width="100%" placeholder="0.05 = 5%" style={{ fontSize: '0.8rem', padding: '0.42rem 0.5rem' }} />
                  </div>
                  <div style={{ flex: '1 1 180px', minWidth: '180px' }}>
                    <label style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block', marginBottom: '0.2rem' }}>Market (optional)</label>
                    <Input type="text" value={alertMarket} onChange={(e) => setAlertMarket(e.target.value)}
                      $width="100%" placeholder="All markets" style={{ fontSize: '0.8rem', padding: '0.42rem 0.5rem' }} />
                  </div>
                  <Button $variant="primary" onClick={() => { createNewAlert(); setAlertMarket(''); }} style={{ fontSize: '0.8rem', padding: '0.45rem 1rem', height: '36px' }}>
                    + Create
                  </Button>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.4rem' }}>
                  {newAlertType === 'PRICE_MOVE' && '🔹 Fires when any market price moves by the threshold % (e.g. 0.05 = 5%)'}
                  {newAlertType === 'DIVERGENCE' && '🔹 Fires when bookmaker vs market divergence exceeds threshold'}
                  {newAlertType === 'NEW_SIGNAL' && '🔹 Fires when a signal with score above threshold is detected'}
                  {newAlertType === 'VOLUME_SPIKE' && '🔹 Fires when 24h volume spikes above ratio (e.g. 0.5 = 50% spike)'}
                </div>
              </Card>
            </FullWidthSection>

            {/* Active Alerts */}
            <FullWidthSection>
              <Card $delay="0.15s">
                <CardTitle>Active Alerts ({alertsData.alerts?.length || 0})</CardTitle>
                {(!alertsData.alerts || alertsData.alerts.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔔</div>
                    <div style={{ fontSize: '0.95rem', color: '#e2e8f0', fontWeight: 600, marginBottom: '0.3rem' }}>No active alerts</div>
                    <div style={{ color: '#64748b', fontSize: '0.82rem' }}>Create your first alert above to get notified when market conditions match.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {alertsData.alerts.map((a) => {
                      const typeIcons = { PRICE_MOVE: '📊', DIVERGENCE: '🔀', NEW_SIGNAL: '🎯', VOLUME_SPIKE: '📈' };
                      return (
                        <div key={a.id} style={{
                          display: 'flex', alignItems: 'center', gap: '0.6rem',
                          background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '0.55rem 0.75rem',
                          border: '1px solid rgba(99,102,241,0.08)',
                        }}>
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}>{typeIcons[a.type] || '🔔'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <Chip $strategy={a.type}>{a.type.replace(/_/g, ' ')}</Chip>
                              <span style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>
                                {a.market ? (a.market.length > 35 ? a.market.slice(0, 32) + '...' : a.market) : 'All markets'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.15rem' }}>
                              Threshold: {(a.threshold * 100).toFixed(0)}% · Fired: {a.firedCount}x
                            </div>
                          </div>
                          <Button $variant="ghost" onClick={() => deleteAlertById(a.id)} style={{ padding: '0.25rem 0.4rem', fontSize: '0.7rem', color: '#f87171', flexShrink: 0 }}>✖</Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </FullWidthSection>

            {/* Alert History */}
            <FullWidthSection>
              <Card $delay="0.2s">
                <CardTitle>📜 Alert History ({alertsData.history?.length || 0})</CardTitle>
                {(!alertsData.history || alertsData.history.length === 0) ? (
                  <EmptyState>No alerts fired yet. They&apos;ll appear here when conditions are met during scans.</EmptyState>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {alertsData.history.map((h, i) => {
                      const typeIcons = { PRICE_MOVE: '📊', DIVERGENCE: '🔀', NEW_SIGNAL: '🎯', VOLUME_SPIKE: '📈' };
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.4rem 0.6rem', borderRadius: '8px',
                          background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(99,102,241,0.06)',
                        }}>
                          <span style={{ fontSize: '0.75rem', flexShrink: 0 }}>{typeIcons[h.type] || '🔔'}</span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                            {h.firedAt ? new Date(h.firedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {h.message || '—'}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8', flexShrink: 0 }}>
                            {h.market?.length > 20 ? h.market.slice(0, 17) + '...' : h.market}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </FullWidthSection>
          </Grid>
        )}

        {/* ── ANALYTICS TAB ──────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Loading charts...</div>}>
            <AnalyticsCharts />
          </Suspense>
        )}

        {/* ── ALPHA TAB ──────────────────────────────────────── */}
        {activeTab === 'alpha' && (
          <AlphaTab wsEvents={wsEvents} wsConnected={wsConnected} />
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
