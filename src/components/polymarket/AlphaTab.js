import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { Card, CardTitle, Badge, Button } from './SharedStyles';
import { api } from '../../lib/api';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const SubGrid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
  @media (min-width: 768px) { grid-template-columns: 1fr 1fr; }
`;

const StatCard = styled.div`
  background: rgba(30, 30, 50, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const StatLabel = styled.span`
  color: #94a3b8;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatValue = styled.span`
  color: #e2e8f0;
  font-size: 1.5rem;
  font-weight: 700;
`;

const EngineCard = styled(Card)`
  border-left: 3px solid ${p => p.$status === 'running' ? '#22c55e' : p.$status === 'error' ? '#ef4444' : '#6366f1'};
`;

const EngineHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const EngineName = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0;
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  font-size: 0.85rem;
  &:last-child { border-bottom: none; }
`;

const MetricLabel = styled.span`color: #94a3b8;`;
const MetricValue = styled.span`color: #e2e8f0; font-weight: 500;`;

const SignalList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SignalItem = styled.div`
  background: rgba(30, 30, 50, 0.6);
  border-radius: 8px;
  padding: 0.75rem;
  border-left: 3px solid ${p => p.$type === 'news' ? '#f59e0b' : p.$type === 'dip' ? '#ef4444' : p.$type === 'new_market' ? '#22c55e' : '#6366f1'};
  font-size: 0.85rem;
`;

const SignalTitle = styled.div`
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 0.25rem;
`;

const SignalMeta = styled.div`
  color: #94a3b8;
  font-size: 0.75rem;
`;

const LiveDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p => p.$connected ? '#22c55e' : '#ef4444'};
  animation: ${p => p.$connected ? pulse : 'none'} 2s ease-in-out infinite;
  margin-right: 6px;
`;

const StrategyTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  th { text-align: left; color: #94a3b8; padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: 500; }
  td { padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); color: #e2e8f0; }
  tr:hover td { background: rgba(99, 102, 241, 0.05); }
`;

const PnlValue = styled.span`
  color: ${p => p.$val > 0 ? '#22c55e' : p.$val < 0 ? '#ef4444' : '#94a3b8'};
  font-weight: 600;
`;

const HealthBar = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
`;

const HealthDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${p => p.$status === 'healthy' ? '#22c55e' : p.$status === 'degraded' ? '#f59e0b' : p.$status === 'down' ? '#ef4444' : '#64748b'};
  title: ${p => p.$name};
`;

const Section = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 0.9rem;
  font-weight: 600;
  color: #a5b4fc;
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const EnsembleModelBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
`;

const ModelName = styled.span`
  color: #94a3b8;
  font-size: 0.8rem;
  width: 140px;
  flex-shrink: 0;
`;

const WeightBar = styled.div`
  flex: 1;
  height: 8px;
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
  overflow: hidden;
`;

const WeightFill = styled.div`
  height: 100%;
  width: ${p => p.$pct}%;
  background: linear-gradient(90deg, #6366f1, #a78bfa);
  border-radius: 4px;
  transition: width 0.5s ease;
`;

const WeightLabel = styled.span`
  color: #e2e8f0;
  font-size: 0.8rem;
  width: 50px;
  text-align: right;
`;

export default function AlphaTab({ wsEvents = [], wsConnected = false }) {
  const [alphaStatus, setAlphaStatus] = useState(null);
  const [infraDashboard, setInfraDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [alphaRes, infraRes] = await Promise.allSettled([
        api('/polybot/alpha/status'),
        api('/polybot/infra/dashboard'),
      ]);
      if (alphaRes.status === 'fulfilled') setAlphaStatus(alphaRes.value);
      if (infraRes.status === 'fulfilled') setInfraDashboard(infraRes.value);
    } catch (e) { /* offline */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 30000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const engines = alphaStatus ? [
    { key: 'newMarketDetector', name: '🆕 New Market Detector', data: alphaStatus.newMarketDetector },
    { key: 'newsReactor', name: '🚨 News Reactor', data: alphaStatus.newsReactor },
    { key: 'panicDipDetector', name: '🔻 Panic Dip Detector', data: alphaStatus.panicDipDetector },
    { key: 'calibrationCollector', name: '📊 Calibration Collector', data: alphaStatus.calibrationCollector },
    { key: 'executionPipeline', name: '⚡ Execution Pipeline', data: alphaStatus.executionPipeline },
  ] : [];

  const optimizer = infraDashboard?.optimizer;
  const ensemble = infraDashboard?.ensemble;
  const health = infraDashboard?.health;
  const newsStreamStatus = infraDashboard?.newsStream;
  const wsStats = infraDashboard?.ws;
  const disk = infraDashboard?.disk;

  if (loading) return <Card><CardTitle>Loading Alpha Dashboard...</CardTitle></Card>;

  return (
    <>
      {/* ─── Live Feed Status ─────────────────────────────────── */}
      <Card>
        <CardTitle>
          <LiveDot $connected={wsConnected} />
          System Status {wsConnected ? '(Live)' : '(Polling)'}
        </CardTitle>
        <SubGrid>
          <StatCard>
            <StatLabel>Alpha Engines</StatLabel>
            <StatValue>{engines.filter(e => e.data?.available !== false).length}/{engines.length}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Components Healthy</StatLabel>
            <StatValue style={{ color: '#22c55e' }}>
              {health?.summary?.healthy || 0}/{health?.summary?.total || 0}
            </StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>WS Clients</StatLabel>
            <StatValue>{wsStats?.clientCount || 0}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Disk Usage</StatLabel>
            <StatValue>{disk?.totalSizeMB?.toFixed(1) || '?'}MB</StatValue>
          </StatCard>
        </SubGrid>
      </Card>

      {/* ─── Alpha Engines ───────────────────────────────────── */}
      <Section>
        <SectionTitle>Alpha Engines</SectionTitle>
        <SubGrid>
          {engines.map(engine => (
            <EngineCard key={engine.key} $status={engine.data?.running ? 'running' : engine.data?.available === false ? 'error' : 'idle'}>
              <EngineHeader>
                <EngineName>{engine.name}</EngineName>
                <Badge $type={engine.data?.running ? 'running' : engine.data?.available === false ? 'stopped' : 'simulation'}>
                  {engine.data?.running ? 'Running' : engine.data?.available === false ? 'Offline' : 'Idle'}
                </Badge>
              </EngineHeader>
              {engine.data && Object.entries(engine.data).filter(([k]) => !['available', 'running'].includes(k)).slice(0, 5).map(([k, v]) => (
                <MetricRow key={k}>
                  <MetricLabel>{k.replace(/([A-Z])/g, ' $1').trim()}</MetricLabel>
                  <MetricValue>{typeof v === 'number' ? v.toLocaleString() : typeof v === 'object' ? JSON.stringify(v).slice(0, 40) : String(v).slice(0, 40)}</MetricValue>
                </MetricRow>
              ))}
            </EngineCard>
          ))}
        </SubGrid>
      </Section>

      {/* ─── Component Health Grid ───────────────────────────── */}
      {health && (
        <Card>
          <CardTitle>🏥 Component Health</CardTitle>
          <HealthBar>
            {(health.components || []).map(c => (
              <div key={c.name} title={`${c.name}: ${c.status}`} style={{ cursor: 'help' }}>
                <HealthDot $status={c.status} $name={c.name} />
              </div>
            ))}
          </HealthBar>
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            {health.summary?.healthy || 0} healthy · {health.summary?.degraded || 0} degraded · {health.summary?.down || 0} down
          </div>
          {(health.components || []).filter(c => c.status !== 'healthy').length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              {(health.components || []).filter(c => c.status !== 'healthy').map(c => (
                <MetricRow key={c.name}>
                  <MetricLabel>{c.name}</MetricLabel>
                  <MetricValue>
                    <Badge $type={c.status === 'down' ? 'stopped' : 'low'}>{c.status}</Badge>
                    {c.consecutiveErrors > 0 && ` (${c.consecutiveErrors} errors)`}
                  </MetricValue>
                </MetricRow>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ─── Strategy Optimizer ───────────────────────────────── */}
      {optimizer && optimizer.strategies?.length > 0 && (
        <Card>
          <CardTitle>🎲 Strategy Optimizer (Thompson Sampling)</CardTitle>
          <StrategyTable>
            <thead>
              <tr>
                <th>Strategy</th>
                <th>Trades</th>
                <th>Win Rate</th>
                <th>P&L</th>
                <th>Sharpe</th>
                <th>Allocation</th>
              </tr>
            </thead>
            <tbody>
              {optimizer.strategies.sort((a, b) => (b.pnl30d || 0) - (a.pnl30d || 0)).map(s => (
                <tr key={s.name}>
                  <td>{s.name?.replace(/_/g, ' ')}</td>
                  <td>{s.tradeCount || 0}</td>
                  <td>{s.winRate7d != null ? `${s.winRate7d.toFixed(0)}%` : '-'}</td>
                  <td><PnlValue $val={s.pnl30d || 0}>${(s.pnl30d || 0).toFixed(2)}</PnlValue></td>
                  <td>{s.sharpe7d != null ? s.sharpe7d.toFixed(2) : '-'}</td>
                  <td>{s.allocation != null ? `${s.allocation.toFixed(2)}x` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </StrategyTable>
          <Button style={{ marginTop: '0.5rem' }} onClick={async () => {
            try { await api('/polybot/infra/optimizer/optimize', { method: 'POST' }); fetchData(); } catch (e) { /* ignore */ }
          }}>
            Run Optimization
          </Button>
        </Card>
      )}

      {/* ─── Probability Ensemble ─────────────────────────────── */}
      {ensemble && ensemble.models?.length > 0 && (
        <Card>
          <CardTitle>🧠 Probability Ensemble</CardTitle>
          <MetricRow>
            <MetricLabel>Total Predictions</MetricLabel>
            <MetricValue>{ensemble.totalPredictions || 0}</MetricValue>
          </MetricRow>
          <MetricRow>
            <MetricLabel>Avg Brier Score</MetricLabel>
            <MetricValue>{ensemble.avgBrierScore != null ? ensemble.avgBrierScore.toFixed(4) : '-'}</MetricValue>
          </MetricRow>
          <div style={{ marginTop: '0.75rem' }}>
            <SectionTitle style={{ fontSize: '0.8rem' }}>Model Weights</SectionTitle>
            {ensemble.models.map(m => (
              <EnsembleModelBar key={m.name}>
                <ModelName>{m.name?.replace(/_/g, ' ')}</ModelName>
                <WeightBar>
                  <WeightFill $pct={(m.weight || 0) * 100} />
                </WeightBar>
                <WeightLabel>{((m.weight || 0) * 100).toFixed(0)}%</WeightLabel>
              </EnsembleModelBar>
            ))}
          </div>
        </Card>
      )}

      {/* ─── News Stream ──────────────────────────────────────── */}
      {newsStreamStatus && (
        <Card>
          <CardTitle>📰 News Stream</CardTitle>
          <SubGrid>
            <StatCard>
              <StatLabel>Sources Active</StatLabel>
              <StatValue>{Object.keys(newsStreamStatus.stats?.lastPollTimes || {}).length}/{newsStreamStatus.sourceCount || 0}</StatValue>
            </StatCard>
            <StatCard>
              <StatLabel>Articles Fetched</StatLabel>
              <StatValue>{newsStreamStatus.stats?.totalFetched || 0}</StatValue>
            </StatCard>
            <StatCard>
              <StatLabel>Breaking Detected</StatLabel>
              <StatValue>{newsStreamStatus.stats?.breakingDetected || 0}</StatValue>
            </StatCard>
            <StatCard>
              <StatLabel>Duplicates Skipped</StatLabel>
              <StatValue>{newsStreamStatus.stats?.duplicatesSkipped || 0}</StatValue>
            </StatCard>
          </SubGrid>
        </Card>
      )}

      {/* ─── Live Signal Feed ─────────────────────────────────── */}
      <Card>
        <CardTitle>⚡ Live Signal Feed</CardTitle>
        {wsEvents.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: '0.85rem', padding: '1rem 0' }}>
            No signals yet. Events will appear here in real-time.
          </div>
        ) : (
          <SignalList>
            {wsEvents.slice(0, 20).map((event, i) => (
              <SignalItem key={i} $type={
                event.type === 'news:break' ? 'news' :
                event.type === 'panicdip:alert' ? 'dip' :
                event.type === 'newmarket:alert' ? 'new_market' : 'signal'
              }>
                <SignalTitle>
                  {event.type === 'trade:executed' && '📈 '}
                  {event.type === 'signal:detected' && '🎯 '}
                  {event.type === 'news:break' && '🔴 '}
                  {event.type === 'panicdip:alert' && '🔻 '}
                  {event.type === 'newmarket:alert' && '🆕 '}
                  {event.type === 'scan:complete' && '📊 '}
                  {event.data?.market || event.data?.question || event.data?.title || event.data?.headline || event.type}
                </SignalTitle>
                <SignalMeta>
                  {event.data?.edge && `Edge: ${(event.data.edge * 100).toFixed(1)}% `}
                  {event.data?.side && `| ${event.data.side} `}
                  {event.data?.score && `| Score: ${event.data.score} `}
                  · {new Date(event.timestamp).toLocaleTimeString()}
                </SignalMeta>
              </SignalItem>
            ))}
          </SignalList>
        )}
      </Card>
    </>
  );
}
