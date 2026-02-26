import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ReferenceLine,
  Cell,
} from 'recharts';

const API_BASE = process.env.REACT_APP_BOT_API || '/polybot';
const api = async (path) => {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
};

// ─── Styled Components ───────────────────────────────────────────────
const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background: rgba(30, 30, 40, 0.95);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  padding: 16px;
  ${p => p.$full && 'grid-column: 1 / -1;'}
`;

const ChartTitle = styled.h3`
  color: #e5e5e5;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const StatRow = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`;

const StatBadge = styled.div`
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 8px 12px;
  text-align: center;
  flex: 1;
  min-width: 100px;
`;

const StatLabel = styled.div`
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
`;

const StatValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${p => p.$color || '#e5e5e5'};
`;

const NoData = styled.div`
  color: #666;
  text-align: center;
  padding: 32px;
  font-size: 13px;
`;

const StressBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const StressLabel = styled.div`
  font-size: 12px;
  color: #ccc;
  width: 160px;
  flex-shrink: 0;
`;

const StressBarFill = styled.div`
  height: 20px;
  border-radius: 4px;
  background: ${p => p.$severity === 'CRITICAL' ? '#ef4444' : p.$severity === 'SEVERE' ? '#f59e0b' : p.$severity === 'WARNING' ? '#eab308' : '#22c55e'};
  width: ${p => Math.min(p.$pct, 100)}%;
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  padding-left: 6px;
  font-size: 11px;
  color: #000;
  font-weight: 600;
`;

const StressTrack = styled.div`
  flex: 1;
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
  overflow: hidden;
`;

// ─── Main Component ──────────────────────────────────────────────────
export default function AnalyticsCharts() {
  const [pnlData, setPnlData] = useState(null);
  const [stats, setStats] = useState(null);
  const [varData, setVarData] = useState(null);
  const [stressData, setStressData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [pnl, dbStats, varResult, stress] = await Promise.all([
        api('/db/pnl?days=60').catch(() => ({ available: false, series: [] })),
        api('/db/stats').catch(() => ({ available: false })),
        api('/risk/var?simulations=5000').catch(() => null),
        api('/risk/stress').catch(() => null),
      ]);
      setPnlData(pnl);
      setStats(dbStats);
      setVarData(varResult);
      setStressData(stress);
    } catch (err) {
      console.warn('Analytics fetch error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 60000); // refresh every 60s
    return () => clearInterval(iv);
  }, [fetchAll]);

  if (loading) return <NoData>Loading analytics...</NoData>;

  return (
    <Container>
      {/* ── Equity Curve ── */}
      <ChartCard $full>
        <ChartTitle>📈 Equity Curve (P&L Over Time)</ChartTitle>
        {pnlData?.series?.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={pnlData.series}>
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#666" fontSize={11} tickFormatter={d => d?.slice(5)} />
              <YAxis stroke="#666" fontSize={11} tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ background: '#1e1e2e', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`$${v.toFixed(2)}`, '']}
                labelFormatter={(l) => `Date: ${l}`}
              />
              <ReferenceLine y={0} stroke="#555" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="cumulative_pnl" stroke="#8b5cf6" fill="url(#pnlGradient)" name="Cumulative P&L" />
              <Line type="monotone" dataKey="daily_pnl" stroke="#3b82f6" dot={false} strokeWidth={1} name="Daily P&L" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <NoData>No P&L data yet. Trades will appear here once resolved.</NoData>
        )}
      </ChartCard>

      {/* ── Strategy Performance ── */}
      <ChartCard>
        <ChartTitle>🏆 Strategy Performance</ChartTitle>
        {stats?.byStrategy?.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.byStrategy} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" stroke="#666" fontSize={11} tickFormatter={v => `$${v}`} />
              <YAxis dataKey="strategy" type="category" stroke="#666" fontSize={11} width={80} />
              <Tooltip
                contentStyle={{ background: '#1e1e2e', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                formatter={(v, name) => [`$${v}`, name]}
              />
              <Bar dataKey="total_pnl" name="Total P&L">
                {stats.byStrategy.map((entry, i) => (
                  <Cell key={i} fill={entry.total_pnl >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NoData>No strategy data yet</NoData>
        )}
      </ChartCard>

      {/* ── Calibration Plot ── */}
      <ChartCard>
        <ChartTitle>🎯 Calibration Curve</ChartTitle>
        {stats?.calibration?.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="avg_predicted" name="Predicted" stroke="#666" fontSize={11}
                domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`}
              />
              <YAxis
                dataKey="actual_rate" name="Actual" stroke="#666" fontSize={11}
                domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`}
              />
              <Tooltip
                contentStyle={{ background: '#1e1e2e', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => `${(v * 100).toFixed(1)}%`}
              />
              <ReferenceLine
                segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
                stroke="#555" strokeDasharray="3 3" label=""
              />
              <Scatter data={stats.calibration} fill="#8b5cf6">
                {stats.calibration.map((entry, i) => (
                  <Cell key={i} fill={Math.abs(entry.bias) < 0.1 ? '#22c55e' : Math.abs(entry.bias) < 0.2 ? '#eab308' : '#ef4444'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <NoData>Calibration data builds as markets resolve</NoData>
        )}
      </ChartCard>

      {/* ── VaR Summary ── */}
      <ChartCard>
        <ChartTitle>⚡ Value at Risk (Monte Carlo)</ChartTitle>
        {varData && varData.simulations > 0 ? (
          <>
            <StatRow>
              <StatBadge>
                <StatLabel>VaR 95%</StatLabel>
                <StatValue $color={varData.riskLevel === 'HIGH' ? '#ef4444' : varData.riskLevel === 'MEDIUM' ? '#eab308' : '#22c55e'}>
                  ${varData.vaR95}
                </StatValue>
              </StatBadge>
              <StatBadge>
                <StatLabel>VaR 99%</StatLabel>
                <StatValue $color="#f59e0b">${varData.vaR99}</StatValue>
              </StatBadge>
              <StatBadge>
                <StatLabel>CVaR 95%</StatLabel>
                <StatValue $color="#ef4444">${varData.cvar95}</StatValue>
              </StatBadge>
            </StatRow>
            <StatRow>
              <StatBadge>
                <StatLabel>Expected P&L</StatLabel>
                <StatValue $color={varData.expectedPnL >= 0 ? '#22c55e' : '#ef4444'}>
                  ${varData.expectedPnL}
                </StatValue>
              </StatBadge>
              <StatBadge>
                <StatLabel>Max Loss</StatLabel>
                <StatValue $color="#ef4444">${varData.maxLoss}</StatValue>
              </StatBadge>
              <StatBadge>
                <StatLabel>Risk Level</StatLabel>
                <StatValue $color={varData.riskLevel === 'HIGH' ? '#ef4444' : varData.riskLevel === 'MEDIUM' ? '#eab308' : '#22c55e'}>
                  {varData.riskLevel}
                </StatValue>
              </StatBadge>
            </StatRow>
            <div style={{ fontSize: 11, color: '#666', textAlign: 'center' }}>
              {varData.simulations.toLocaleString()} simulations · {varData.positionCount} positions
            </div>
          </>
        ) : (
          <NoData>No open positions for VaR calculation</NoData>
        )}
      </ChartCard>

      {/* ── Stress Test ── */}
      <ChartCard $full>
        <ChartTitle>🧪 Stress Test Scenarios</ChartTitle>
        {stressData?.scenarios && Object.keys(stressData.scenarios).length > 0 ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: '#888' }}>Portfolio Resilience: </span>
              <span style={{
                fontWeight: 700,
                color: stressData.portfolioResilience === 'STRONG' ? '#22c55e' : stressData.portfolioResilience === 'MODERATE' ? '#eab308' : '#ef4444'
              }}>
                {stressData.portfolioResilience}
              </span>
            </div>
            {Object.entries(stressData.scenarios).map(([id, scenario]) => (
              <StressBar key={id}>
                <StressLabel>{scenario.name}</StressLabel>
                <StressTrack>
                  <StressBarFill $pct={scenario.lossPct} $severity={scenario.severity}>
                    {scenario.lossPct > 3 ? `-${scenario.lossPct}%` : ''}
                  </StressBarFill>
                </StressTrack>
                <div style={{
                  fontSize: 11, width: 60, textAlign: 'right',
                  color: scenario.severity === 'CRITICAL' ? '#ef4444' : scenario.severity === 'SEVERE' ? '#f59e0b' : '#888',
                  fontWeight: 600,
                }}>
                  -${scenario.estimatedLoss}
                </div>
              </StressBar>
            ))}
          </>
        ) : (
          <NoData>No open positions for stress testing</NoData>
        )}
      </ChartCard>

      {/* ── Trade Stats ── */}
      <ChartCard $full>
        <ChartTitle>📊 Overall Trade Statistics</ChartTitle>
        {stats?.stats ? (
          <StatRow>
            <StatBadge>
              <StatLabel>Total Trades</StatLabel>
              <StatValue>{stats.stats.total_trades}</StatValue>
            </StatBadge>
            <StatBadge>
              <StatLabel>Win Rate</StatLabel>
              <StatValue $color={stats.stats.wins / (stats.stats.total_trades || 1) > 0.5 ? '#22c55e' : '#ef4444'}>
                {stats.stats.total_trades > 0 ? `${((stats.stats.wins / stats.stats.total_trades) * 100).toFixed(1)}%` : '—'}
              </StatValue>
            </StatBadge>
            <StatBadge>
              <StatLabel>Total P&L</StatLabel>
              <StatValue $color={(stats.stats.total_pnl || 0) >= 0 ? '#22c55e' : '#ef4444'}>
                ${stats.stats.total_pnl || 0}
              </StatValue>
            </StatBadge>
            <StatBadge>
              <StatLabel>Avg P&L</StatLabel>
              <StatValue $color={(stats.stats.avg_pnl || 0) >= 0 ? '#22c55e' : '#ef4444'}>
                ${stats.stats.avg_pnl || 0}
              </StatValue>
            </StatBadge>
            <StatBadge>
              <StatLabel>Best Trade</StatLabel>
              <StatValue $color="#22c55e">${stats.stats.best_trade || 0}</StatValue>
            </StatBadge>
            <StatBadge>
              <StatLabel>Worst Trade</StatLabel>
              <StatValue $color="#ef4444">${stats.stats.worst_trade || 0}</StatValue>
            </StatBadge>
            <StatBadge>
              <StatLabel>Active Days</StatLabel>
              <StatValue>{stats.stats.active_days || 0}</StatValue>
            </StatBadge>
          </StatRow>
        ) : (
          <NoData>No trade statistics available yet</NoData>
        )}
      </ChartCard>
    </Container>
  );
}
