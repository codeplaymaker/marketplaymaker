import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Helmet } from 'react-helmet-async';

const AnalyticsCharts = lazy(() => import('./AnalyticsCharts'));

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

const StatCard = styled.div`
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 10px;
  padding: 0.75rem 0.5rem;
  text-align: center;

  @media (min-width: 768px) {
    border-radius: 12px;
    padding: 1rem;
  }
`;

const StatValue = styled.div`
  font-size: 1.15rem;
  font-weight: 800;
  color: ${(props) => props.$color || '#818cf8'};
  font-variant-numeric: tabular-nums;

  @media (min-width: 768px) {
    font-size: 1.5rem;
  }
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
    pollRef.current = setInterval(fetchAll, 5000);
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
          {['overview', 'signals', 'picks', 'markets', 'watchlist', 'alerts', 'sources', 'twitter', 'youtube', 'trades', 'analytics'].map((tab) => (
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
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Tab>
          ))}
        </TabBar>

        {/* ── OVERVIEW TAB ──────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <Grid>
            {/* ── Hero KPI Strip ── */}
            <FullWidthSection>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))',
                gap: '0.4rem',
              }}>
                {[
                  { label: 'Active Edges', value: indEdges.filter(e => (e.edgeQuality || 0) >= 35).length || '—', icon: '🔬', color: '#a5b4fc' },
                  { label: 'Markets', value: (status?.scanner?.platforms?.polymarket?.markets || 0) + (status?.scanner?.platforms?.kalshi?.markets || 0) || '—', icon: '🌐', color: '#818cf8' },
                  { label: 'Win Rate', value: trackRecord?.summary?.winRate != null ? `${trackRecord.summary.winRate}%` : picksRecord?.summary?.winRate != null ? `${picksRecord.summary.winRate}%` : '—', icon: '🎯', color: ((trackRecord?.summary?.winRate || picksRecord?.summary?.winRate || 0) >= 50 ? '#22c55e' : '#f59e0b') },
                  { label: 'P&L', value: trackRecord?.hypothetical?.totalReturn != null ? `${trackRecord.hypothetical.totalReturn >= 0 ? '+' : ''}$${trackRecord.hypothetical.totalReturn.toFixed(2)}` : performance?.totalPnL != null ? `$${performance.totalPnL.toFixed(2)}` : '—', icon: '💰', color: ((trackRecord?.hypothetical?.totalReturn || performance?.totalPnL || 0) >= 0 ? '#22c55e' : '#ef4444') },
                  { label: 'Scans', value: status?.scanner?.scanCount || 0, icon: '📡', color: '#c084fc' },
                  { label: 'Sources', value: `${[llmConfigured, connected, (status?.scanner?.platforms?.kalshi?.markets || 0) > 0, (indSourcesStatus?.polling?.sources || []).some(s => s.stats?.successes > 0), (indSourcesStatus?.expert?.sources || []).some(s => s.stats?.successes > 0)].filter(Boolean).length}/5`, icon: '🔗', color: '#34d399' },
                ].map((kpi, i) => (
                  <div key={i} style={{
                    background: 'rgba(30, 30, 50, 0.9)', borderRadius: '10px', padding: '0.6rem 0.4rem',
                    textAlign: 'center', border: '1px solid rgba(99, 102, 241, 0.12)',
                  }}>
                    <div style={{ fontSize: '0.75rem', marginBottom: '0.1rem' }}>{kpi.icon}</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: kpi.color, fontVariantNumeric: 'tabular-nums' }}>{kpi.value}</div>
                    <div style={{ fontSize: '0.55rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.05rem' }}>{kpi.label}</div>
                  </div>
                ))}
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

            {/* Scanner Control — Compact */}
            <Card $delay="0.1s" $glow={isRunning}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <LiveDot $active={isRunning} />
                <span style={{ fontWeight: 700, color: '#c7d2fe', fontSize: '0.9rem' }}>Scanner</span>
                <Badge $type={isRunning ? 'running' : 'stopped'}>
                  {isRunning ? 'RUNNING' : 'STOPPED'}
                </Badge>
                <Badge $type="simulation" style={{ fontSize: '0.6rem' }}>{mode}</Badge>
                {status?.scanner?.lastScan && (
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    Last: {new Date(status.scanner.lastScan).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <div style={{ display: 'flex', gap: '0.3rem', marginLeft: 'auto' }}>
                  {!isRunning ? (
                    <Button $variant="primary" onClick={startBot} disabled={!connected} style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>
                      ▶ Start
                    </Button>
                  ) : (
                    <Button $variant="danger" onClick={stopBot} style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>
                      ⏹ Stop
                    </Button>
                  )}
                  <Button $variant="ghost" onClick={triggerScan} disabled={!connected || scanning} style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>
                    {scanning ? '⏳' : '🔍 Scan'}
                  </Button>
                  <Button $variant="ghost" onClick={resetBot} disabled={!connected} style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>
                    🔄
                  </Button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(99,102,241,0.08)' }}>
                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Bankroll</span>
                <Input
                  id="bankroll-input"
                  type="number"
                  value={bankrollInput}
                  onChange={(e) => setBankrollInput(e.target.value)}
                  $width="80px"
                  min="10"
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}
                  aria-label="Bankroll amount in USDC"
                />
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>USDC</span>
                {status?.scanner?.scanCount > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#94a3b8' }}>
                    {status.scanner.scanCount} scans · {opportunities.length} opp{opportunities.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {scanResult && (
                <div style={{
                  marginTop: '0.5rem', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem',
                  background: scanResult.error ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                  border: `1px solid ${scanResult.error ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                  color: scanResult.error ? '#f87171' : '#34d399',
                }} role="status" aria-live="polite">
                  {scanResult.error
                    ? `❌ ${scanResult.error}`
                    : `✅ ${scanResult.marketsScanned} markets — ${scanResult.opportunitiesFound} opportunities`}
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.5rem' }}>
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

            {/* Live Activity Feed */}
            <Card $delay="0.15s">
              <CardTitle>⚡ Live Activity</CardTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {[
                  status?.scanner?.lastScan && {
                    icon: '🔍', color: '#a5b4fc',
                    text: `Scanned ${(status?.scanner?.platforms?.polymarket?.markets || 0) + (status?.scanner?.platforms?.kalshi?.markets || 0)} markets`,
                    detail: new Date(status.scanner.lastScan).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                  indEdges.filter(e => (e.edgeQuality || 0) >= 35).length > 0 && {
                    icon: '🔬', color: '#22c55e',
                    text: `${indEdges.filter(e => (e.edgeQuality || 0) >= 35).length} validated edge${indEdges.filter(e => (e.edgeQuality || 0) >= 35).length !== 1 ? 's' : ''} live`,
                    detail: `${indEdges.filter(e => (e.edgeQuality || 0) >= 55).length} B+`,
                  },
                  opportunities.length > 0 && {
                    icon: '🎯', color: '#c084fc',
                    text: `${opportunities.length} opportunit${opportunities.length !== 1 ? 'ies' : 'y'} queued`,
                    detail: `${opportunities.filter(o => o.strategy === 'NO_BETS').length} NO · ${opportunities.filter(o => o.strategy === 'ARBITRAGE').length} ARB`,
                  },
                  picksRecord?.summary?.totalPicks > 0 && {
                    icon: '🏆', color: '#818cf8',
                    text: `${picksRecord.summary.totalPicks} picks tracked`,
                    detail: `${picksRecord.summary.won || 0}W-${picksRecord.summary.lost || 0}L`,
                  },
                  learningData?.totalResolved > 0 && {
                    icon: '🧠', color: '#c084fc',
                    text: `AI learned from ${learningData.totalResolved} picks`,
                    detail: learningData.adjustments ? 'Active' : 'Training',
                  },
                  {
                    icon: '💰', color: (performance?.totalPnL || 0) >= 0 ? '#22c55e' : '#ef4444',
                    text: `P&L: ${performance?.totalPnL != null ? `$${performance.totalPnL.toFixed(2)}` : '$0.00'}`,
                    detail: `${performance?.totalTrades || 0} trades · ${positions.length} open`,
                  },
                ].filter(Boolean).map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.3rem 0.6rem', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(99,102,241,0.06)',
                  }}>
                    <span style={{ fontSize: '0.75rem', flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ fontSize: '0.75rem', color: '#cbd5e1', flex: 1 }}>{item.text}</span>
                    <span style={{ fontSize: '0.65rem', color: item.color, fontWeight: 600, flexShrink: 0 }}>{item.detail}</span>
                  </div>
                ))}
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

            {/* Strategies & Quick Actions */}
            <FullWidthSection>
              <Card $delay="0.25s">
                <CardTitle>⚡ Strategies &amp; Actions</CardTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  {[
                    { name: 'NO Bets', count: opportunities.filter(o => o.strategy === 'NO_BETS').length, color: '#34d399', icon: '🛡️', desc: 'Risk underwriting' },
                    { name: 'Arbitrage', count: opportunities.filter(o => o.strategy === 'ARBITRAGE').length, color: '#a5b4fc', icon: '🔄', desc: 'Cross-market' },
                    { name: 'Statistical', count: opportunities.filter(o => o.strategy === 'SPORTS_EDGE').length, color: '#fbbf24', icon: '📐', desc: 'Odds vs prob' },
                  ].map((s, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      background: s.count > 0 ? `${s.color}12` : 'rgba(0,0,0,0.2)',
                      border: `1px solid ${s.count > 0 ? `${s.color}30` : 'rgba(100,116,139,0.15)'}`,
                      borderRadius: '10px', padding: '0.5rem 0.75rem', flex: '1 1 auto', minWidth: '130px',
                    }}>
                      <span style={{ fontSize: '1rem' }}>{s.icon}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: s.count > 0 ? s.color : '#475569' }}>{s.count}</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: s.count > 0 ? '#e2e8f0' : '#64748b' }}>{s.name}</span>
                        </div>
                        <div style={{ fontSize: '0.6rem', color: '#64748b' }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
                  padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.15)',
                  border: '1px solid rgba(99,102,241,0.08)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Markets:</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a78bfa' }}>{status?.scanner?.platforms?.polymarket?.markets || 0}</span>
                    <span style={{ fontSize: '0.6rem', color: '#475569' }}>poly</span>
                    <span style={{ fontSize: '0.6rem', color: '#475569' }}>+</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa' }}>{status?.scanner?.platforms?.kalshi?.markets || 0}</span>
                    <span style={{ fontSize: '0.6rem', color: '#475569' }}>kalshi</span>
                  </div>
                  <div style={{ width: '1px', height: '16px', background: 'rgba(99,102,241,0.15)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Scans:</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c084fc' }}>{status?.scanner?.scanCount || 0}</span>
                  </div>
                  <div style={{ width: '1px', height: '16px', background: 'rgba(99,102,241,0.15)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Last:</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {status?.scanner?.lastScan ? new Date(status.scanner.lastScan).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                    </span>
                  </div>
                  <Button
                    $variant="success"
                    onClick={autoExecute}
                    disabled={!connected || !isRunning || opportunities.length === 0}
                    style={{ marginLeft: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}
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
              {['TOP_5', 'ALL', 'NO_BETS', 'ARBITRAGE', 'SPORTS_EDGE'].map((f) => (
                <Button
                  key={f}
                  $variant={oppsFilter === f ? 'primary' : 'ghost'}
                  onClick={() => setOppsFilter(f)}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                >
                  {f === 'TOP_5' ? '🏆 Top 5' : f === 'ALL' ? '🌐 All' : f === 'NO_BETS' ? '🟢 NO Bets' : f === 'ARBITRAGE' ? '🔵 Arbitrage' : '🟡 Spread'}
                </Button>
              ))}
            </div>

            {/* Signal Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Input
                type="text" placeholder="🔍 Search signals by market name..." value={signalSearch}
                onChange={(e) => setSignalSearch(e.target.value)}
                $width="100%" style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}
                aria-label="Search signals"
              />
              {signalSearch && (
                <Button $variant="ghost" onClick={() => setSignalSearch('')} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', flexShrink: 0 }}>✕</Button>
              )}
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
            </div>

            {/* ── Top 5 Detailed Cards ── */}
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
                        marginBottom: '0',
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
                        {opp.strategy === 'NO_BETS' ? 'NO' : opp.strategy === 'ARBITRAGE' ? 'ARB' : 'SPREAD'}
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

        {/* ── PICKS TAB (redesigned) ─────────────────────────────── */}
        {activeTab === 'picks' && (
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
        )}

        {/* ── MARKETS TAB ───────────────────────────────────────── */}
        {activeTab === 'markets' && (
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
        )}

        {/* ── YOUTUBE TAB ───────────────────────────────────────── */}
        {activeTab === 'youtube' && (
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
