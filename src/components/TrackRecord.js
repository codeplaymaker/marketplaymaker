import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { Helmet } from 'react-helmet-async';

// ─── Animations ──────────────────────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.1); }
  50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.25); }
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

  @media (min-width: 768px) {
    padding: 4rem 2rem 3rem;
  }
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
  max-width: 600px;
  margin: 0 auto 2rem;
  line-height: 1.6;
  animation: ${fadeIn} 0.6s ease-out 0.1s backwards;
`;

const LiveBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
  padding: 0.4rem 1rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  animation: ${fadeIn} 0.6s ease-out 0.2s backwards;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    background: #22c55e;
    border-radius: 50%;
    animation: ${pulse} 2s infinite;
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 0.75rem;

  @media (min-width: 768px) {
    padding: 2rem;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin-bottom: 2rem;
  animation: ${fadeIn} 0.6s ease-out 0.3s backwards;

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
`;

const StatCard = styled.div`
  background: rgba(15, 15, 25, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  transition: all 0.3s;
  animation: ${glow} 4s infinite;

  &:hover {
    border-color: rgba(99, 102, 241, 0.4);
    transform: translateY(-2px);
  }
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
  background: rgba(15, 15, 25, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: 12px;
  padding: 1rem;
  overflow: hidden;

  @media (min-width: 768px) {
    padding: 1.5rem;
  }
`;

const GradeBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);

  &:last-child { border-bottom: none; }
`;

const GradeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
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

const BarFill = styled.div`
  height: 8px;
  border-radius: 4px;
  background: ${p => p.$color || '#6366f1'};
  width: ${p => p.$width || '0%'};
  transition: width 1s ease-out;
`;

const BarTrack = styled.div`
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.05);
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

const CTASection = styled.section`
  text-align: center;
  padding: 3rem 2rem;
  background: linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.06) 100%);
  border-top: 1px solid rgba(99,102,241,0.1);
`;

const CTAButton = styled.button`
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  padding: 0.9rem 2.5rem;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 1rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(99,102,241,0.4);
  }
`;

const TabRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const Tab = styled.button`
  background: ${p => p.$active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)'};
  color: ${p => p.$active ? '#a5b4fc' : '#64748b'};
  border: 1px solid ${p => p.$active ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'};
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(99,102,241,0.15);
    color: #a5b4fc;
  }
`;

const TimelineRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 0;
  font-size: 0.85rem;
`;

const TimelineDate = styled.span`
  color: #64748b;
  min-width: 90px;
  font-family: 'SF Mono', monospace;
  font-size: 0.8rem;
`;

const TimelineBar = styled.div`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(99,102,241,0.3);
  width: ${p => p.$width || '0%'};
  max-width: ${p => p.$width || '0%'};
  transition: width 1s ease-out;
`;

const TimelineCount = styled.span`
  color: #a5b4fc;
  font-weight: 600;
  min-width: 30px;
  text-align: right;
`;

const Loader = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: #64748b;
  font-size: 1.1rem;

  &::after {
    content: '';
    width: 24px;
    height: 24px;
    border: 3px solid rgba(99,102,241,0.3);
    border-top-color: #6366f1;
    border-radius: 50%;
    margin-left: 1rem;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.6;
`;

const Footer = styled.footer`
  text-align: center;
  padding: 2rem;
  color: #475569;
  font-size: 0.8rem;
  border-top: 1px solid rgba(255,255,255,0.05);
`;

// ─── Component ──────────────────────────────────────────────────────
export default function TrackRecord() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('active');

  // Determine API base
  const apiBase = useMemo(() => {
    if (process.env.NODE_ENV === 'production') return '';
    return '';
  }, []);

  useEffect(() => {
    fetch(`${apiBase}/api/public/track-record`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load track record');
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [apiBase]);

  if (loading) return <Page><Loader>Loading track record</Loader></Page>;
  if (error) return <Page><EmptyState>Unable to load track record. Try again later.</EmptyState></Page>;

  const { summary, hypothetical, gradeDistribution, activeEdges, resolvedEdges, timeline } = data;
  const totalEdges = summary?.totalEdges || 0;
  const resolvedCount = summary?.resolvedEdges || resolvedEdges?.length || 0;
  const pendingCount = summary?.pending || activeEdges?.length || 0;
  const winRate = summary?.winRate || 0;
  const wins = summary?.wins || 0;
  const losses = summary?.losses || 0;
  const totalPnL = summary?.totalPnLpp || 0;
  const betterRate = summary?.betterRate || 0;

  const maxGradeCount = Math.max(...Object.values(gradeDistribution || {}), 1);
  const gradeOrder = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D'];
  const sortedGrades = gradeOrder.filter(g => gradeDistribution?.[g]);

  const timelineEntries = Object.entries(timeline || {}).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);
  const maxDayEdges = Math.max(...timelineEntries.map(([,v]) => v.recorded), 1);

  return (
    <Page>
      <Helmet>
        <title>Track Record | MarketPlayMaker</title>
        <meta name="description" content="Live track record of MarketPlayMaker's AI-powered prediction market edge detection system. See our real-time accuracy, P&L, and calibration data." />
      </Helmet>

      {/* ─── Hero ─── */}
      <HeroSection>
        <Title>Live Track Record</Title>
        <Subtitle>
          Real-time performance of our 8-source AI edge detection engine across Polymarket, Kalshi, and prediction markets.
        </Subtitle>
        <LiveBadge>
          LIVE — {totalEdges} edges tracked
        </LiveBadge>
      </HeroSection>

      <Container>
        {/* ─── Summary Stats ─── */}
        <StatsGrid>
          <StatCard>
            <StatValue $color="#a5b4fc">{totalEdges}</StatValue>
            <StatLabel>Total Edges Tracked</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue $color="#22c55e">{pendingCount}</StatValue>
            <StatLabel>Active / Pending</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue $color="#f59e0b">{resolvedCount}</StatValue>
            <StatLabel>Resolved</StatLabel>
          </StatCard>
          {resolvedCount > 0 && (
            <>
              <StatCard>
                <StatValue $color={winRate >= 50 ? '#22c55e' : '#ef4444'}>{winRate}%</StatValue>
                <StatLabel>Win Rate ({wins}W / {losses}L)</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue $color={totalPnL >= 0 ? '#22c55e' : '#ef4444'}>
                  {totalPnL >= 0 ? '+' : ''}{totalPnL}pp
                </StatValue>
                <StatLabel>Total P&amp;L</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue $color={betterRate >= 50 ? '#22c55e' : '#fbbf24'}>{betterRate}%</StatValue>
                <StatLabel>Beat Market Price</StatLabel>
              </StatCard>
            </>
          )}
        </StatsGrid>

        {/* ─── Hypothetical ROI (if resolved) ─── */}
        {hypothetical?.totalBets > 0 && (
          <Section $delay="0.35s">
            <Card style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))', borderColor: 'rgba(99,102,241,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Hypothetical: $10 per edge</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: hypothetical.totalReturn >= 0 ? '#22c55e' : '#ef4444' }}>
                    ${hypothetical.totalReturn >= 0 ? '+' : ''}{hypothetical.totalReturn.toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>ROI</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: hypothetical.roi >= 0 ? '#22c55e' : '#ef4444' }}>
                    {hypothetical.roi >= 0 ? '+' : ''}{hypothetical.roi}%
                  </div>
                </div>
              </div>
            </Card>
          </Section>
        )}

        {/* ─── Edge Grade Distribution ─── */}
        {sortedGrades.length > 0 && (
          <Section $delay="0.45s">
            <SectionTitle>🎯 Edge Grade Distribution</SectionTitle>
            <Card>
              {sortedGrades.map(grade => (
                <GradeBar key={grade}>
                  <GradeBadge $grade={grade}>{grade}</GradeBadge>
                  <BarTrack>
                    <BarFill
                      $width={`${(gradeDistribution[grade] / maxGradeCount) * 100}%`}
                      $color={
                        grade.startsWith('A') ? '#22c55e' :
                        grade.startsWith('B') ? '#6366f1' :
                        grade.startsWith('C') ? '#fbbf24' : '#64748b'
                      }
                    />
                  </BarTrack>
                  <span style={{ color: '#94a3b8', minWidth: '30px', textAlign: 'right', fontWeight: 600 }}>
                    {gradeDistribution[grade]}
                  </span>
                </GradeBar>
              ))}
            </Card>
          </Section>
        )}

        {/* ─── Activity Timeline ─── */}
        {timelineEntries.length > 0 && (
          <Section $delay="0.5s">
            <SectionTitle>📅 Activity Timeline</SectionTitle>
            <Card>
              {timelineEntries.map(([day, counts]) => (
                <TimelineRow key={day}>
                  <TimelineDate>{day}</TimelineDate>
                  <TimelineBar $width={`${(counts.recorded / maxDayEdges) * 100}%`} />
                  <TimelineCount>{counts.recorded} edge{counts.recorded !== 1 ? 's' : ''}</TimelineCount>
                </TimelineRow>
              ))}
            </Card>
          </Section>
        )}

        {/* ─── Edge Tables ─── */}
        <Section $delay="0.55s">
          <SectionTitle>📋 Edge History</SectionTitle>
          <TabRow>
            <Tab $active={tab === 'active'} onClick={() => setTab('active')}>
              Active ({activeEdges?.length || 0})
            </Tab>
            <Tab $active={tab === 'resolved'} onClick={() => setTab('resolved')}>
              Resolved ({resolvedEdges?.length || 0})
            </Tab>
          </TabRow>

          <Card>
            {tab === 'active' && (
              <EdgeTable>
                {(!activeEdges || activeEdges.length === 0) ? (
                  <EmptyState>No active edges currently being tracked</EmptyState>
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <Th>Market</Th>
                        <Th>Grade</Th>
                        <Th>Direction</Th>
                        <Th>Our Prob</Th>
                        <Th>Market</Th>
                        <Th>Divergence</Th>
                        <Th>Sources</Th>
                        <Th>Tracked</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeEdges.slice(0, 50).map((e, i) => (
                        <tr key={i}>
                          <Td title={e.question}>{e.question?.slice(0, 60)}{e.question?.length > 60 ? '...' : ''}</Td>
                          <Td><GradeBadge $grade={e.edgeGrade}>{e.edgeGrade}</GradeBadge></Td>
                          <Td><DirectionBadge $dir={e.edgeDirection}>{e.edgeDirection?.replace('BUY_', '')}</DirectionBadge></Td>
                          <Td>{(e.ourProb * 100).toFixed(0)}%</Td>
                          <Td>{(e.marketPrice * 100).toFixed(0)}¢</Td>
                          <Td style={{ color: Math.abs(e.divergence) > 15 ? '#22c55e' : '#94a3b8' }}>
                            {e.divergence > 0 ? '+' : ''}{e.divergence?.toFixed(1)}pp
                          </Td>
                          <Td>{e.sourceCount}</Td>
                          <Td style={{ fontSize: '0.8rem', color: '#64748b' }}>{timeAgo(e.recordedAt)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </EdgeTable>
            )}

            {tab === 'resolved' && (
              <EdgeTable>
                {(!resolvedEdges || resolvedEdges.length === 0) ? (
                  <EmptyState>
                    No markets have resolved yet. Track record builds automatically as prediction markets settle.
                  </EmptyState>
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <Th>Market</Th>
                        <Th>Grade</Th>
                        <Th>Direction</Th>
                        <Th>Result</Th>
                        <Th>P&amp;L</Th>
                        <Th>Beat Market?</Th>
                        <Th>Resolved</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {resolvedEdges.map((e, i) => (
                        <tr key={i}>
                          <Td title={e.question}>{e.question?.slice(0, 60)}{e.question?.length > 60 ? '...' : ''}</Td>
                          <Td><GradeBadge $grade={e.edgeGrade}>{e.edgeGrade}</GradeBadge></Td>
                          <Td><DirectionBadge $dir={e.edgeDirection}>{e.edgeDirection?.replace('BUY_', '')}</DirectionBadge></Td>
                          <Td>{e.outcome}</Td>
                          <Td><PnlValue $val={e.pnlPp}>{e.pnlPp > 0 ? '+' : ''}{e.pnlPp}pp</PnlValue></Td>
                          <Td>{e.weWereBetter ? '✅' : '❌'}</Td>
                          <Td style={{ fontSize: '0.8rem', color: '#64748b' }}>{timeAgo(e.resolvedAt)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </EdgeTable>
            )}
          </Card>
        </Section>

        {/* ─── Data Sources Info ─── */}
        <Section $delay="0.6s">
          <SectionTitle>🔬 How It Works</SectionTitle>
          <Card>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {[
                { icon: '🏈', name: 'ESPN Live Odds', desc: 'Real-time sports probabilities from game lines and spreads' },
                { icon: '📊', name: 'Bookmaker Consensus', desc: 'Aggregated odds from 15+ sportsbooks via The Odds API' },
                { icon: '₿', name: 'Crypto Market Data', desc: 'On-chain signals, whale movements, and price momentum' },
                { icon: '📈', name: 'Stock Correlations', desc: 'Yahoo Finance data for policy & economic event markets' },
                { icon: '🗳️', name: 'Polling Aggregation', desc: 'Metaculus forecasts and Wikipedia current events' },
                { icon: '🧠', name: 'Expert Consensus', desc: 'Manifold Markets crowd wisdom and academic forecasts' },
                { icon: '🏛️', name: 'Kalshi Exchange', desc: 'Regulated prediction exchange for cross-platform arbitrage' },
                { icon: '🤖', name: 'GPT-4o Intelligence', desc: 'LLM analysis combining all signals into calibrated probabilities' },
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
          Want Access to Live Edges?
        </h2>
        <p style={{ color: '#94a3b8', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
          Get real-time edge signals, multi-source intelligence, and automated scanning delivered to your dashboard.
        </p>
        <CTAButton onClick={() => navigate('/signup')}>
          Get Started →
        </CTAButton>
      </CTASection>

      <Footer>
        <div>MarketPlayMaker — AI-Powered Prediction Market Intelligence</div>
        <div style={{ marginTop: '0.5rem' }}>
          Last updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : '—'}
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#334155' }}>
          Past performance does not guarantee future results. Track record reflects hypothetical edge detection, not actual trading.
        </div>
      </Footer>
    </Page>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
