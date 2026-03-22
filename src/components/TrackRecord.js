import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { Helmet } from 'react-helmet-async';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// ─── Animations ──────────────────────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.6; }
`;
const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.1); }
  50%      { box-shadow: 0 0 40px rgba(99,102,241,0.25); }
`;

// ─── Styled Components ──────────────────────────────────────────────
const Page = styled.div`
  min-height: 100vh;
  background: #0a0a0f;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;
const HeroSection = styled.section`
  padding: 2.5rem 1rem 2rem;
  text-align: center;
  background: linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%);
  border-bottom: 1px solid rgba(99,102,241,0.1);
  @media (min-width: 768px) { padding: 4rem 2rem 3rem; }
`;
const Title = styled.h1`
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  background: linear-gradient(135deg, #fff, #a5b4fc, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 0.5rem;
  animation: ${fadeIn} 0.6s ease-out;
`;
const Subtitle = styled.p`
  color: #94a3b8;
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  max-width: 640px;
  margin: 0 auto 2rem;
  line-height: 1.6;
  animation: ${fadeIn} 0.6s ease-out 0.1s backwards;
`;
const LiveBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(34,197,94,0.1);
  border: 1px solid rgba(34,197,94,0.3);
  color: #22c55e;
  padding: 0.4rem 1rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  animation: ${fadeIn} 0.6s ease-out 0.2s backwards;
  &::before {
    content: '';
    width: 8px; height: 8px;
    background: #22c55e;
    border-radius: 50%;
    animation: ${pulse} 2s infinite;
  }
`;
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 0.75rem;
  @media (min-width: 768px) { padding: 2rem; }
`;
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin-bottom: 2rem;
  animation: ${fadeIn} 0.6s ease-out 0.3s backwards;
  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }
`;
const StatCard = styled.div`
  background: rgba(15,15,25,0.8);
  border: 1px solid rgba(99,102,241,0.15);
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  transition: all 0.3s;
  animation: ${glow} 4s infinite;
  &:hover { border-color: rgba(99,102,241,0.4); transform: translateY(-2px); }
`;
const StatValue = styled.div`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${p => p.$color || '#fff'};
  margin-bottom: 0.25rem;
`;
const StatLabel = styled.div`
  font-size: 0.8rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;
const Section = styled.section`
  margin-bottom: 2.5rem;
  animation: ${fadeIn} 0.6s ease-out ${p => p.$delay || '0.4s'} backwards;
`;
const SectionTitle = styled.h2`
  font-size: 1.4rem;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;
const Card = styled.div`
  background: rgba(15,15,25,0.8);
  border: 1px solid rgba(99,102,241,0.12);
  border-radius: 12px;
  padding: 1rem;
  overflow: hidden;
  @media (min-width: 768px) { padding: 1.5rem; }
`;
const EdgeTable = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
`;
const Th = styled.th`
  text-align: left;
  padding: 0.75rem;
  color: #64748b;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  white-space: nowrap;
`;
const Td = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  color: #cbd5e1;
  max-width: 300px;
  &:first-child {
    max-width: 350px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
const DirectionBadge = styled.span`
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  ${p => p.$dir === 'BUY_YES'
    ? css`background: rgba(34,197,94,0.12); color: #22c55e;`
    : css`background: rgba(239,68,68,0.12); color: #ef4444;`
  }
`;
const PnlValue = styled.span`
  font-weight: 600;
  color: ${p => p.$val > 0 ? '#22c55e' : p.$val < 0 ? '#ef4444' : '#64748b'};
`;
const GradeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
  ${p => {
    if (p.$grade === 'A+' || p.$grade === 'A') return css`background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3);`;
    if (p.$grade === 'B+' || p.$grade === 'B') return css`background: rgba(99,102,241,0.15); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3);`;
    if (p.$grade === 'C+' || p.$grade === 'C') return css`background: rgba(251,191,36,0.15); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3);`;
    return css`background: rgba(100,116,139,0.15); color: #94a3b8; border: 1px solid rgba(100,116,139,0.3);`;
  }}
`;
const GradeBar = styled.div`
  display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  &:last-child { border-bottom: none; }
`;
const BarTrack = styled.div`
  flex: 1; height: 8px; border-radius: 4px;
  background: rgba(255,255,255,0.05);
`;
const BarFill = styled.div`
  height: 8px; border-radius: 4px;
  background: ${p => p.$color || '#6366f1'};
  width: ${p => p.$width || '0%'};
  transition: width 1s ease-out;
`;
const TabRow = styled.div`
  display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;
`;
const Tab = styled.button`
  background: ${p => p.$active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)'};
  color: ${p => p.$active ? '#a5b4fc' : '#64748b'};
  border: 1px solid ${p => p.$active ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'};
  padding: 0.5rem 1.25rem; border-radius: 8px;
  font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all 0.2s;
  &:hover { background: rgba(99,102,241,0.15); color: #a5b4fc; }
`;
const Collapsible = styled.details`
  margin-bottom: 2.5rem;
  animation: ${fadeIn} 0.6s ease-out ${p => p.$delay || '0.4s'} backwards;
  & > summary {
    cursor: pointer;
    font-size: 1.4rem;
    font-weight: 700;
    color: #e2e8f0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    list-style: none;
    &::-webkit-details-marker { display: none; }
    &::after {
      content: '\\25B8';
      transition: transform 0.2s;
      font-size: 1rem;
      color: #64748b;
      margin-left: auto;
    }
  }
  &[open] > summary::after { transform: rotate(90deg); }
`;
const CTASection = styled.section`
  text-align: center;
  padding: 3rem 2rem;
  background: linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.06) 100%);
  border-top: 1px solid rgba(99,102,241,0.1);
`;
const CTAButton = styled.button`
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white; border: none;
  padding: 0.9rem 2.5rem; border-radius: 10px;
  font-size: 1.1rem; font-weight: 600; cursor: pointer;
  transition: all 0.3s; margin-top: 1rem;
  &:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99,102,241,0.4); }
`;
const Loader = styled.div`
  display: flex; align-items: center; justify-content: center;
  min-height: 60vh; color: #64748b; font-size: 1.1rem;
  &::after {
    content: ''; width: 24px; height: 24px;
    border: 3px solid rgba(99,102,241,0.3);
    border-top-color: #6366f1; border-radius: 50%;
    margin-left: 1rem; animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
const EmptyState = styled.div`
  text-align: center; padding: 3rem; color: #64748b;
  font-size: 0.95rem; line-height: 1.6;
`;
const Footer = styled.footer`
  text-align: center; padding: 2rem; color: #475569;
  font-size: 0.8rem; border-top: 1px solid rgba(255,255,255,0.05);
`;
const TimelineRow = styled.div`
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.4rem 0; font-size: 0.85rem;
`;
const TimelineDate = styled.span`
  color: #64748b; min-width: 90px;
  font-family: 'SF Mono', monospace; font-size: 0.8rem;
`;
const TimelineBar = styled.div`
  flex: 1; height: 6px; border-radius: 3px;
  background: rgba(99,102,241,0.3);
  width: ${p => p.$width || '0%'};
  max-width: ${p => p.$width || '0%'};
  transition: width 1s ease-out;
`;
const TimelineCount = styled.span`
  color: #a5b4fc; font-weight: 600;
  min-width: 30px; text-align: right;
`;

// ─── Custom Tooltip for Chart ────────────────────────────────────────
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: 8, padding: '0.6rem 0.85rem', fontSize: '0.8rem',
    }}>
      <div style={{ color: '#94a3b8', marginBottom: 2 }}>{d.date}</div>
      <div style={{ color: d.cumPnL >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
        {d.cumPnL >= 0 ? '+' : ''}${d.cumPnL?.toFixed(2)}
      </div>
      {d.strategy && (
        <div style={{ color: '#64748b', fontSize: '0.7rem', marginTop: 2 }}>
          {d.won ? '\u2705' : '\u274C'} {d.strategy}
        </div>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────
export default function TrackRecord() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [edgeTab, setEdgeTab] = useState('active');

  const botPrefix = useMemo(() => {
    return process.env.NODE_ENV === 'production' ? '/api' : '/polybot';
  }, []);

  useEffect(() => {
    fetch(`${botPrefix}/public/track-record`)
      .then(r => { if (!r.ok) throw new Error('Failed to load'); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [botPrefix]);

  if (loading) return <Page><Loader>Loading track record</Loader></Page>;
  if (error) return <Page><EmptyState>Unable to load track record. Try again later.</EmptyState></Page>;

  const { summary, gradeDistribution, activeEdges, resolvedEdges, timeline, strategyPerformance, paperPerformance } = data;

  // Edge detection stats
  const totalEdges = summary?.totalEdges || 0;
  const edgeResolved = summary?.resolvedEdges || resolvedEdges?.length || 0;
  const edgePending = summary?.pending || activeEdges?.length || 0;
  const edgeWinRate = summary?.winRate || 0;
  const edgePnL = summary?.totalPnLpp || 0;
  const betterRate = summary?.betterRate || 0;

  // Paper trader stats
  const pp = paperPerformance;
  const hasPaper = !!pp;
  const sp = strategyPerformance;
  const hasStrategy = sp?.patterns?.length > 0;

  // Grade distribution
  const gradeOrder = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D'];
  const sortedGrades = gradeOrder.filter(g => gradeDistribution?.[g]);
  const maxGradeCount = Math.max(...Object.values(gradeDistribution || {}), 1);

  // Timeline
  const timelineEntries = Object.entries(timeline || {}).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);
  const maxDayEdges = Math.max(...timelineEntries.map(([,v]) => v.recorded), 1);

  // Hero stats — prefer paper trader data (concrete $), fall back to edge data
  const heroTrades = pp?.resolvedCount || sp?.totalTrades || edgeResolved || 0;
  const heroWinRate = pp?.winRate || sp?.overallWinRate || edgeWinRate || 0;
  const heroPnL = pp?.totalPnL ?? sp?.totalPnL ?? 0;
  const heroROI = pp?.roi ?? 0;

  return (
    <Page>
      <Helmet>
        <title>AI Trading Performance | MarketPlayMaker</title>
        <meta name="description" content={`MarketPlayMaker AI: ${heroTrades} trades, ${heroWinRate.toFixed(1)}% win rate, ${heroPnL >= 0 ? '+' : ''}$${heroPnL.toFixed(2)} P&L. Live, verified performance across Polymarket and Kalshi.`} />
        <meta property="og:title" content="AI Trading Performance | MarketPlayMaker" />
        <meta property="og:description" content={`${heroTrades} trades | ${heroWinRate.toFixed(1)}% win rate | ${heroPnL >= 0 ? '+' : ''}$${heroPnL.toFixed(2)} P&L - Self-learning AI trading on prediction markets.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://marketplaymaker.com/track-record" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI Trading Performance | MarketPlayMaker" />
        <meta name="twitter:description" content={`${heroTrades} trades | ${heroWinRate.toFixed(1)}% WR | ${heroPnL >= 0 ? '+' : ''}$${heroPnL.toFixed(2)} - Live AI performance`} />
      </Helmet>

      {/* ─── Hero ─── */}
      <HeroSection>
        <Title>Live AI Performance</Title>
        <Subtitle>
          Our self-learning AI trades prediction markets in real-time &mdash; adapting strategies, blocking losers, and compounding winners automatically.
        </Subtitle>
        <LiveBadge>
          LIVE &mdash; {heroTrades} trades resolved
        </LiveBadge>
      </HeroSection>

      <Container>

        {/* ═══ SECTION 1: HEADLINE P&L STATS (Paper Trader) ═══ */}
        {hasPaper && (
          <StatsGrid>
            <StatCard>
              <StatValue $color={heroPnL >= 0 ? '#22c55e' : '#ef4444'}>
                {heroPnL >= 0 ? '+' : ''}${heroPnL.toFixed(2)}
              </StatValue>
              <StatLabel>Total P&amp;L</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue $color={heroWinRate >= 55 ? '#22c55e' : heroWinRate >= 45 ? '#fbbf24' : '#ef4444'}>
                {heroWinRate.toFixed(1)}%
              </StatValue>
              <StatLabel>Win Rate ({pp.wins}W / {pp.losses}L)</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue $color={heroROI >= 0 ? '#22c55e' : '#ef4444'}>
                {heroROI >= 0 ? '+' : ''}{heroROI}%
              </StatValue>
              <StatLabel>ROI</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue $color="#a5b4fc">${pp.simBankroll?.toFixed(2)}</StatValue>
              <StatLabel>Bankroll (${pp.startingBankroll} start)</StatLabel>
            </StatCard>
            {pp.sharpeRatio != null && (
              <StatCard>
                <StatValue $color={pp.sharpeRatio >= 1 ? '#22c55e' : pp.sharpeRatio >= 0.5 ? '#fbbf24' : '#94a3b8'}>
                  {pp.sharpeRatio}
                </StatValue>
                <StatLabel>Sharpe Ratio</StatLabel>
              </StatCard>
            )}
            {pp.maxDrawdown != null && (
              <StatCard>
                <StatValue $color={pp.maxDrawdown < 20 ? '#22c55e' : '#fbbf24'}>
                  ${pp.maxDrawdown.toFixed(2)}
                </StatValue>
                <StatLabel>Max Drawdown</StatLabel>
              </StatCard>
            )}
          </StatsGrid>
        )}

        {/* Fallback if no paper data — show edge stats */}
        {!hasPaper && (
          <StatsGrid>
            <StatCard>
              <StatValue $color="#a5b4fc">{totalEdges}</StatValue>
              <StatLabel>Edges Tracked</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue $color="#22c55e">{edgePending}</StatValue>
              <StatLabel>Active</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue $color="#f59e0b">{edgeResolved}</StatValue>
              <StatLabel>Resolved</StatLabel>
            </StatCard>
            {edgeResolved > 0 && (
              <>
                <StatCard>
                  <StatValue $color={edgeWinRate >= 50 ? '#22c55e' : '#ef4444'}>{edgeWinRate}%</StatValue>
                  <StatLabel>Win Rate</StatLabel>
                </StatCard>
                <StatCard>
                  <StatValue $color={edgePnL >= 0 ? '#22c55e' : '#ef4444'}>
                    {edgePnL >= 0 ? '+' : ''}{edgePnL}pp
                  </StatValue>
                  <StatLabel>Edge P&amp;L</StatLabel>
                </StatCard>
              </>
            )}
          </StatsGrid>
        )}

        {/* ═══ SECTION 2: EQUITY CURVE ═══ */}
        {pp?.pnlCurve?.length > 2 && (
          <Section $delay="0.3s">
            <SectionTitle>{'\uD83D\uDCC8'} Equity Curve</SectionTitle>
            <Card style={{ padding: '1rem 0.5rem 0.5rem' }}>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={pp.pnlCurve} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#475569', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#475569', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `$${v}`}
                    width={50}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="cumPnL"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#pnlGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#22c55e', stroke: '#0a0a0f', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#475569', marginTop: '0.5rem' }}>
                Cumulative P&amp;L from {pp.pnlCurve.length} resolved trades
              </div>
            </Card>
          </Section>
        )}

        {/* ═══ SECTION 3: BANKROLL GROWTH CARD ═══ */}
        {hasPaper && pp.bankrollReturn !== 0 && (
          <Section $delay="0.35s">
            <Card style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
              borderColor: 'rgba(99,102,241,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '1rem',
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                  Bankroll Growth
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#e2e8f0' }}>
                  ${pp.startingBankroll} &rarr; ${pp.simBankroll?.toFixed(2)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Return</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: pp.bankrollReturn >= 0 ? '#22c55e' : '#ef4444' }}>
                  {pp.bankrollReturn >= 0 ? '+' : ''}{pp.bankrollReturn}%
                </div>
              </div>
              {pp.profitFactor > 0 && pp.profitFactor < 999 && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Profit Factor</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: pp.profitFactor >= 1.5 ? '#22c55e' : pp.profitFactor >= 1 ? '#fbbf24' : '#ef4444' }}>
                    {pp.profitFactor}x
                  </div>
                </div>
              )}
            </Card>
          </Section>
        )}

        {/* ═══ SECTION 4: STRATEGY PERFORMANCE TABLE (Pattern Memory) ═══ */}
        {hasStrategy && (
          <Section $delay="0.4s">
            <SectionTitle>{'\uD83E\uDDE0'} AI Strategy Performance</SectionTitle>
            <Card>
              <EdgeTable>
                <Table>
                  <thead>
                    <tr>
                      <Th>Strategy</Th>
                      <Th>Side</Th>
                      <Th>W</Th>
                      <Th>L</Th>
                      <Th>Win Rate</Th>
                      <Th>P&amp;L</Th>
                      <Th>Streak</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {sp.patterns.map((p, i) => {
                      const [rawStrategy, side] = p.pattern.includes(':')
                        ? p.pattern.split(':')
                        : [p.pattern.split('_').slice(0, -1).join('_'), p.pattern.split('_').pop()];
                      const displayNames = {
                        'autoScan': 'Auto Scanner', 'WHALE_DETECTION': 'Whale Detection',
                        'MOMENTUM': 'Momentum', 'ARBITRAGE': 'Arbitrage',
                        'BTC_BOT': 'BTC Bot', 'PROVEN_EDGE': 'Proven Edge', 'NO_BETS': 'No Bets',
                      };
                      const strategy = displayNames[rawStrategy] || rawStrategy.replace(/_/g, ' ');
                      const statusColor = p.blocked ? '#ef4444' : p.winRate >= 60 ? '#22c55e' : '#fbbf24';
                      const statusText = p.blocked ? 'Blocked' : p.winRate >= 60 ? 'Active' : 'Watch';
                      return (
                        <tr key={i} style={{ opacity: p.blocked ? 0.5 : 1 }}>
                          <Td style={{ fontWeight: 600, color: '#e2e8f0' }}>{strategy}</Td>
                          <Td>
                            <DirectionBadge $dir={side === 'YES' ? 'BUY_YES' : 'BUY_NO'}>{side}</DirectionBadge>
                          </Td>
                          <Td style={{ color: '#22c55e', fontWeight: 600 }}>{p.wins}</Td>
                          <Td style={{ color: p.losses > 0 ? '#ef4444' : '#64748b', fontWeight: 600 }}>{p.losses}</Td>
                          <Td>
                            <span style={{
                              color: p.winRate >= 70 ? '#22c55e' : p.winRate >= 50 ? '#fbbf24' : '#ef4444',
                              fontWeight: 700, fontSize: '0.9rem',
                            }}>
                              {p.winRate?.toFixed(0)}%
                            </span>
                          </Td>
                          <Td>
                            <PnlValue $val={p.totalPnL}>
                              {p.totalPnL >= 0 ? '+' : ''}${p.totalPnL?.toFixed(2)}
                            </PnlValue>
                          </Td>
                          <Td style={{
                            fontFamily: "'SF Mono', monospace",
                            color: p.streak >= 3 ? '#22c55e' : p.streak <= -2 ? '#ef4444' : '#94a3b8',
                          }}>
                            {p.streak > 0 ? `${p.streak}W` : p.streak < 0 ? `${Math.abs(p.streak)}L` : '\u2014'}
                          </Td>
                          <Td>
                            <span style={{
                              display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '4px',
                              fontSize: '0.7rem', fontWeight: 600,
                              background: statusColor + '18', color: statusColor,
                              border: `1px solid ${statusColor}40`,
                            }}>{statusText}</span>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </EdgeTable>
              <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#475569', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                The AI learns from every trade &mdash; automatically boosting winning strategies and blocking losing patterns in real-time.
              </div>
            </Card>
          </Section>
        )}

        {/* ═══ SECTION 5: CONFIDENCE BREAKDOWN ═══ */}
        {pp?.byConfidence && Object.keys(pp.byConfidence).length > 0 && (
          <Section $delay="0.45s">
            <SectionTitle>{'\uD83C\uDFAF'} Performance by Confidence</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {['HIGH', 'MEDIUM', 'LOW'].filter(c => pp.byConfidence[c]).map(conf => {
                const d = pp.byConfidence[conf];
                const confColor = conf === 'HIGH' ? '#22c55e' : conf === 'MEDIUM' ? '#fbbf24' : '#94a3b8';
                return (
                  <Card key={conf} style={{ borderColor: confColor + '30' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{
                        padding: '0.15rem 0.6rem', borderRadius: 4, fontSize: '0.75rem',
                        fontWeight: 700, background: confColor + '18', color: confColor,
                        border: `1px solid ${confColor}40`,
                      }}>{conf}</span>
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{d.trades} trades</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: d.winRate >= 55 ? '#22c55e' : '#fbbf24' }}>
                          {d.winRate}%
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Win Rate</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: d.pnl >= 0 ? '#22c55e' : '#ef4444' }}>
                          {d.pnl >= 0 ? '+' : ''}${d.pnl?.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>P&amp;L</div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Section>
        )}

        {/* ═══ SECTION 6: EDGE DETECTION (Collapsible) ═══ */}
        <Collapsible $delay="0.5s">
          <summary>{'\uD83D\uDCCA'} Edge Detection System ({totalEdges} edges tracked)</summary>

          {/* Edge Stats */}
          {totalEdges > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(15,15,25,0.6)', borderRadius: 8, padding: '0.75rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#a5b4fc' }}>{totalEdges}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Tracked</div>
              </div>
              <div style={{ background: 'rgba(15,15,25,0.6)', borderRadius: 8, padding: '0.75rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#22c55e' }}>{edgePending}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Active</div>
              </div>
              <div style={{ background: 'rgba(15,15,25,0.6)', borderRadius: 8, padding: '0.75rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f59e0b' }}>{edgeResolved}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Resolved</div>
              </div>
              {edgeResolved > 0 && (
                <>
                  <div style={{ background: 'rgba(15,15,25,0.6)', borderRadius: 8, padding: '0.75rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: edgeWinRate >= 50 ? '#22c55e' : '#ef4444' }}>{edgeWinRate}%</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Edge WR</div>
                  </div>
                  <div style={{ background: 'rgba(15,15,25,0.6)', borderRadius: 8, padding: '0.75rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: betterRate >= 50 ? '#22c55e' : '#fbbf24' }}>{betterRate}%</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Beat Market</div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Grade Distribution */}
          {sortedGrades.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.75rem' }}>Grade Distribution</h3>
              <Card>
                {sortedGrades.map(grade => (
                  <GradeBar key={grade}>
                    <GradeBadge $grade={grade}>{grade}</GradeBadge>
                    <BarTrack>
                      <BarFill
                        $width={`${(gradeDistribution[grade] / maxGradeCount) * 100}%`}
                        $color={grade.startsWith('A') ? '#22c55e' : grade.startsWith('B') ? '#6366f1' : grade.startsWith('C') ? '#fbbf24' : '#64748b'}
                      />
                    </BarTrack>
                    <span style={{ color: '#94a3b8', minWidth: '30px', textAlign: 'right', fontWeight: 600 }}>
                      {gradeDistribution[grade]}
                    </span>
                  </GradeBar>
                ))}
              </Card>
            </div>
          )}

          {/* Timeline */}
          {timelineEntries.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.75rem' }}>Activity Timeline</h3>
              <Card>
                {timelineEntries.map(([day, counts]) => (
                  <TimelineRow key={day}>
                    <TimelineDate>{day}</TimelineDate>
                    <TimelineBar $width={`${(counts.recorded / maxDayEdges) * 100}%`} />
                    <TimelineCount>{counts.recorded}</TimelineCount>
                  </TimelineRow>
                ))}
              </Card>
            </div>
          )}

          {/* Edge Tables */}
          <TabRow>
            <Tab $active={edgeTab === 'active'} onClick={() => setEdgeTab('active')}>
              Active ({activeEdges?.length || 0})
            </Tab>
            <Tab $active={edgeTab === 'resolved'} onClick={() => setEdgeTab('resolved')}>
              Resolved ({resolvedEdges?.length || 0})
            </Tab>
          </TabRow>
          <Card>
            {edgeTab === 'active' && (
              <EdgeTable>
                {(!activeEdges || activeEdges.length === 0)
                  ? <EmptyState>No active edges currently being tracked</EmptyState>
                  : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Market</Th><Th>Grade</Th><Th>Direction</Th>
                          <Th>Our Prob</Th><Th>Market</Th><Th>Divergence</Th><Th>Tracked</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeEdges.slice(0, 50).map((e, i) => (
                          <tr key={i}>
                            <Td title={e.question}>{e.question?.slice(0, 55)}{e.question?.length > 55 ? '\u2026' : ''}</Td>
                            <Td><GradeBadge $grade={e.edgeGrade}>{e.edgeGrade}</GradeBadge></Td>
                            <Td><DirectionBadge $dir={e.edgeDirection}>{e.edgeDirection?.replace('BUY_', '')}</DirectionBadge></Td>
                            <Td>{(e.ourProb * 100).toFixed(0)}%</Td>
                            <Td>{(e.marketPrice * 100).toFixed(0)}&cent;</Td>
                            <Td style={{ color: Math.abs(e.divergence) > 15 ? '#22c55e' : '#94a3b8' }}>
                              {e.divergence > 0 ? '+' : ''}{e.divergence?.toFixed(1)}pp
                            </Td>
                            <Td style={{ fontSize: '0.8rem', color: '#64748b' }}>{timeAgo(e.recordedAt)}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
              </EdgeTable>
            )}
            {edgeTab === 'resolved' && (
              <EdgeTable>
                {(!resolvedEdges || resolvedEdges.length === 0)
                  ? <EmptyState>No markets have resolved yet.</EmptyState>
                  : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Market</Th><Th>Grade</Th><Th>Direction</Th>
                          <Th>Result</Th><Th>P&amp;L</Th><Th>Beat Market?</Th><Th>Resolved</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {resolvedEdges.map((e, i) => (
                          <tr key={i}>
                            <Td title={e.question}>{e.question?.slice(0, 55)}{e.question?.length > 55 ? '\u2026' : ''}</Td>
                            <Td><GradeBadge $grade={e.edgeGrade}>{e.edgeGrade}</GradeBadge></Td>
                            <Td><DirectionBadge $dir={e.edgeDirection}>{e.edgeDirection?.replace('BUY_', '')}</DirectionBadge></Td>
                            <Td>{e.outcome}</Td>
                            <Td><PnlValue $val={e.pnlPp}>{e.pnlPp > 0 ? '+' : ''}{e.pnlPp}pp</PnlValue></Td>
                            <Td>{e.weWereBetter ? '\u2705' : '\u274C'}</Td>
                            <Td style={{ fontSize: '0.8rem', color: '#64748b' }}>{timeAgo(e.resolvedAt)}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
              </EdgeTable>
            )}
          </Card>
        </Collapsible>

        {/* ═══ SECTION 7: HOW IT WORKS ═══ */}
        <Section $delay="0.55s">
          <SectionTitle>{'\uD83D\uDD2C'} How It Works</SectionTitle>
          <Card>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {[
                { icon: '\uD83C\uDFC8', name: 'ESPN Live Odds', desc: 'Real-time sports probabilities from game lines and spreads' },
                { icon: '\uD83D\uDCCA', name: 'Bookmaker Consensus', desc: 'Aggregated odds from 15+ sportsbooks via The Odds API' },
                { icon: '\u20BF', name: 'Crypto Market Data', desc: 'On-chain signals, whale movements, and price momentum' },
                { icon: '\uD83D\uDCC8', name: 'Stock Correlations', desc: 'Yahoo Finance data for policy & economic event markets' },
                { icon: '\uD83D\uDDF3\uFE0F', name: 'Polling Aggregation', desc: 'Metaculus forecasts and Wikipedia current events' },
                { icon: '\uD83E\uDDE0', name: 'Expert Consensus', desc: 'Manifold Markets crowd wisdom and academic forecasts' },
                { icon: '\uD83C\uDFDB\uFE0F', name: 'Kalshi Exchange', desc: 'Regulated prediction exchange for cross-platform arbitrage' },
                { icon: '\uD83E\uDD16', name: 'GPT-4o Intelligence', desc: 'LLM analysis combining all signals into calibrated probabilities' },
              ].map((s, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '0.75rem', padding: '0.75rem',
                  borderRadius: '8px', background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#e2e8f0' }}>{s.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Section>

      </Container>

      {/* ─── CTA ─── */}
      <CTASection>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 0.5rem' }}>
          Want Access to Live Signals?
        </h2>
        <p style={{ color: '#94a3b8', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
          Get real-time AI edge signals, strategy alerts, and automated scanning delivered to your dashboard.
        </p>
        <CTAButton onClick={() => navigate('/signup')}>
          Get Started &rarr;
        </CTAButton>
      </CTASection>

      <Footer>
        <div>MarketPlayMaker &mdash; AI-Powered Prediction Market Intelligence</div>
        <div style={{ marginTop: '0.5rem' }}>
          Last updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : '\u2014'}
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#334155' }}>
          Past performance does not guarantee future results. Track record reflects paper trading, not real money.
        </div>
      </Footer>
    </Page>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '\u2014';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
