import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Helmet } from 'react-helmet-async';

const BOT_API = process.env.REACT_APP_BOT_URL || '';
const isProduction = window.location.hostname !== 'localhost';

async function api(path, options = {}) {
  const resolvedPath = (BOT_API || isProduction)
    ? path.replace(/^\/polybot/, '/api')
    : path;
  const url = BOT_API ? `${BOT_API}${resolvedPath}` : resolvedPath;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ─── Animations ──────────────────────────────────────────────────────
const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 5px rgba(16, 185, 129, 0.3); }
  50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.6); }
`;

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// ─── Styled Components ───────────────────────────────────────────────
const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a14 0%, #0f1a2e 50%, #0a1628 100%);
  color: #e2e8f0;
  padding: 1rem 0.5rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  @media (min-width: 768px) { padding: 2rem; }
`;

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 1.5rem;
  animation: ${slideUp} 0.6s ease-out;
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, #34d399, #10b981, #6ee7b7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
  @media (min-width: 768px) { font-size: 2.5rem; }
`;

const Subtitle = styled.p`
  color: #94a3b8;
  font-size: 0.9rem;
  max-width: 650px;
  margin: 0 auto;
`;

const TabBar = styled.div`
  display: flex;
  gap: 0.15rem;
  background: rgba(15, 15, 26, 0.5);
  border-radius: 12px;
  padding: 0.25rem;
  margin-bottom: 1.25rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const Tab = styled.button`
  padding: 0.5rem 0.9rem;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s;
  background: ${p => p.$active ? 'rgba(16, 185, 129, 0.2)' : 'transparent'};
  color: ${p => p.$active ? '#6ee7b7' : '#64748b'};
  flex-shrink: 0;
  @media (min-width: 768px) { font-size: 0.82rem; padding: 0.5rem 1.1rem; }
  &:hover { color: #6ee7b7; background: rgba(16, 185, 129, 0.1); }
`;

const Grid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
  @media (min-width: 768px) { gap: 1.5rem; grid-template-columns: repeat(2, 1fr); }
  @media (min-width: 1200px) { grid-template-columns: repeat(3, 1fr); }
`;

const FullWidth = styled.div`
  grid-column: 1 / -1;
`;

const Card = styled.div`
  background: rgba(30, 30, 50, 0.8);
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 12px;
  padding: 1rem;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  animation: ${slideUp} 0.6s ease-out;
  animation-delay: ${p => p.$delay || '0s'};
  animation-fill-mode: both;
  overflow: hidden;
  @media (min-width: 768px) { border-radius: 16px; padding: 1.5rem; }
  &:hover { border-color: rgba(16, 185, 129, 0.35); transform: translateY(-2px); }
  ${p => p.$glow && css`animation: ${glow} 2s ease-in-out infinite;`}
`;

const CardTitle = styled.h2`
  font-size: 1.05rem;
  font-weight: 700;
  color: #6ee7b7;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatRow = styled.div`
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(${p => p.$cols || 3}, 1fr);
  @media (max-width: 480px) { grid-template-columns: repeat(2, 1fr); }
`;

const StatBox = styled.div`
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.12);
  border-radius: 10px;
  padding: 0.75rem;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.25rem;
  font-weight: 800;
  color: ${p => p.$color || '#6ee7b7'};
  font-variant-numeric: tabular-nums;
`;

const StatLabel = styled.div`
  font-size: 0.7rem;
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
  &:hover:not(:disabled) { transform: translateY(-1px); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  ${p => p.$variant === 'primary' && css`
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    &:hover:not(:disabled) { box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); }
  `}
  ${p => p.$variant === 'ghost' && css`
    background: rgba(16, 185, 129, 0.1);
    color: #6ee7b7;
    border: 1px solid rgba(16, 185, 129, 0.2);
    &:hover:not(:disabled) { background: rgba(16, 185, 129, 0.2); }
  `}
  ${p => p.$variant === 'danger' && css`
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
  `}
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  ${p => p.$type === 'A' && css`background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3);`}
  ${p => p.$type === 'B' && css`background: rgba(99,102,241,0.15); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3);`}
  ${p => p.$type === 'C' && css`background: rgba(251,191,36,0.15); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3);`}
  ${p => p.$type === 'D' && css`background: rgba(251,146,60,0.15); color: #fb923c; border: 1px solid rgba(251,146,60,0.3);`}
  ${p => p.$type === 'F' && css`background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3);`}
  ${p => p.$type === 'success' && css`background: rgba(16,185,129,0.15); color: #34d399;`}
  ${p => p.$type === 'warning' && css`background: rgba(251,191,36,0.15); color: #fbbf24;`}
  ${p => p.$type === 'danger' && css`background: rgba(239,68,68,0.15); color: #f87171;`}
  ${p => p.$type === 'info' && css`background: rgba(99,102,241,0.15); color: #a5b4fc;`}
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(16, 185, 129, 0.3);
  border-top-color: #10b981;
  border-radius: 50%;
  animation: ${rotate} 0.8s linear infinite;
  display: inline-block;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  th, td {
    padding: 0.6rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid rgba(16, 185, 129, 0.08);
    white-space: nowrap;
  }
  th {
    color: #94a3b8;
    font-weight: 600;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  tr:hover td { background: rgba(16, 185, 129, 0.04); }
`;

const PnlText = styled.span`
  color: ${p => p.$value > 0 ? '#34d399' : p.$value < 0 ? '#f87171' : '#94a3b8'};
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`;

const CodeBlock = styled.pre`
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(16, 185, 129, 0.1);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.78rem;
  color: #94a3b8;
  overflow-x: auto;
  line-height: 1.5;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #64748b;
  font-size: 0.9rem;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
`;

const ModalContent = styled.div`
  background: linear-gradient(135deg, #0f1a2e 0%, #0a1628 100%);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 16px;
  max-width: 900px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  padding: 2rem;
  animation: ${slideUp} 0.3s ease;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.3); border-radius: 3px; }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;
`;

const ModalClose = styled.button`
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  border-radius: 8px;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
  font-size: 0.8rem;
  flex-shrink: 0;
  &:hover { background: rgba(239, 68, 68, 0.3); }
`;

const ReportSection = styled.div`
  background: rgba(15, 15, 26, 0.6);
  border: 1px solid rgba(16, 185, 129, 0.12);
  border-radius: 10px;
  padding: 1.25rem;
  margin-bottom: 1rem;
`;

const ReportSectionTitle = styled.h4`
  color: #6ee7b7;
  font-size: 0.88rem;
  margin: 0 0 0.75rem;
  font-weight: 700;
`;

const AgentPost = styled.div`
  background: rgba(15, 15, 26, 0.4);
  border-left: 3px solid ${p => p.$stance === 'YES' ? '#34d399' : p.$stance === 'NO' ? '#f87171' : '#fbbf24'};
  padding: 0.6rem 0.8rem;
  margin-bottom: 0.5rem;
  border-radius: 0 8px 8px 0;
  font-size: 0.78rem;
`;

const AgentName = styled.span`
  color: #a5b4fc;
  font-weight: 700;
  font-size: 0.75rem;
`;

const MethodPill = styled.span`
  display: inline-block;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.72rem;
  color: #6ee7b7;
  margin: 0.2rem;
`;

const ActionBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: center;
`;

const Select = styled.select`
  background: rgba(15, 15, 26, 0.8);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  color: #e2e8f0;
  font-size: 0.82rem;
  &:focus { outline: none; border-color: #10b981; }
`;

// ═════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════

export default function MiroFishLab() {
  const [activeTab, setActiveTab] = useState('overview');
  const [labStatus, setLabStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Test state
  const [testResults, setTestResults] = useState(null);
  const [testRunning, setTestRunning] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('MOMENTUM');
  const [selectedCategory, setSelectedCategory] = useState('politics');
  const [latestSuite, setLatestSuite] = useState(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState(null);
  const [suggestRunning, setSuggestRunning] = useState(false);

  // Evolution state
  const [evolutionResults, setEvolutionResults] = useState(null);
  const [evolveRunning, setEvolveRunning] = useState(false);
  const [evolvedStrategy, setEvolvedStrategy] = useState(null);

  // Adversarial state
  const [adversarialResults, setAdversarialResults] = useState(null);
  const [adversarialRunning, setAdversarialRunning] = useState(false);

  // Live Params state
  const [paramsStatus, setParamsStatus] = useState(null);
  const [reapplying, setReapplying] = useState(false);

  // Signal Pipeline state
  const [pipelineData, setPipelineData] = useState(null);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);

  // Report modal state
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const STRATEGIES = ['PROVEN_EDGE', 'ARBITRAGE', 'NO_BETS', 'SPORTS_EDGE', 'MOMENTUM', 'CONTRARIAN'];

  const openReport = useCallback(async (conditionId) => {
    setReportLoading(true);
    setReportOpen(true);
    setReportData(null);
    try {
      const data = await api(`/polybot/mirofish/simulation/${conditionId}/report`);
      setReportData(data);
    } catch (err) {
      setReportData({ error: err.message });
    } finally {
      setReportLoading(false);
    }
  }, []);

  // ─── Fetch Lab Status ─────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const data = await api('/polybot/mirofish/lab/status');
      setLabStatus(data);
      setError(null);
    } catch (err) {
      setError('Bot server not reachable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchParamsStatus(); // for overview card
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // ─── Test Strategy ────────────────────────────────────────────────
  const runStrategyTest = async () => {
    setTestRunning(true);
    try {
      const data = await api('/polybot/mirofish/test/strategy', {
        method: 'POST',
        body: JSON.stringify({
          strategyName: selectedStrategy,
          category: selectedCategory,
          runsPerScenario: 3,
        }),
      });
      setTestResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setTestRunning(false);
    }
  };

  // ─── Adversarial Test ─────────────────────────────────────────────
  const runAdversarialTest = async () => {
    setAdversarialRunning(true);
    try {
      const data = await api('/polybot/mirofish/test/adversarial', {
        method: 'POST',
        body: JSON.stringify({
          strategyName: selectedStrategy,
          category: selectedCategory,
          runs: 3,
        }),
      });
      setAdversarialResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdversarialRunning(false);
    }
  };

  // ─── Full Suite ───────────────────────────────────────────────────
  const runFullSuite = async () => {
    setTestRunning(true);
    try {
      await api('/polybot/mirofish/test/full-suite', {
        method: 'POST',
        body: JSON.stringify({ category: selectedCategory }),
      });
      // It runs in background, poll for result
      setTimeout(async () => {
        try {
          const data = await api('/polybot/mirofish/test/latest-suite');
          setLatestSuite(data);
        } catch { /* not ready yet */ }
        setTestRunning(false);
      }, 15000);
    } catch (err) {
      setError(err.message);
      setTestRunning(false);
    }
  };

  const fetchLatestSuite = async () => {
    try {
      const data = await api('/polybot/mirofish/test/latest-suite');
      setLatestSuite(data);
    } catch { /* none yet */ }
  };

  // ─── Suggestions ──────────────────────────────────────────────────
  const generateSuggestions = async () => {
    setSuggestRunning(true);
    try {
      await api('/polybot/mirofish/suggest', {
        method: 'POST',
        body: JSON.stringify({ validate: true }),
      });
      setTimeout(async () => {
        try {
          const data = await api('/polybot/mirofish/suggest/latest');
          setSuggestions(data);
        } catch { /* not ready */ }
        setSuggestRunning(false);
      }, 20000);
    } catch (err) {
      setError(err.message);
      setSuggestRunning(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const data = await api('/polybot/mirofish/suggest/latest');
      setSuggestions(data);
    } catch { /* none yet */ }
  };

  // ─── Evolution ────────────────────────────────────────────────────
  const evolveStrategy = async () => {
    setEvolveRunning(true);
    try {
      await api('/polybot/mirofish/evolve', {
        method: 'POST',
        body: JSON.stringify({
          strategyName: selectedStrategy,
          category: selectedCategory,
          generations: 6,
        }),
      });
      setTimeout(async () => {
        try {
          const data = await api(`/polybot/mirofish/evolve/${selectedStrategy}`);
          setEvolvedStrategy(data);
        } catch { /* not ready */ }
        setEvolveRunning(false);
      }, 15000);
    } catch (err) {
      setError(err.message);
      setEvolveRunning(false);
    }
  };

  const evolveAll = async () => {
    setEvolveRunning(true);
    try {
      await api('/polybot/mirofish/evolve/all', {
        method: 'POST',
        body: JSON.stringify({ category: selectedCategory }),
      });
      setTimeout(async () => {
        try {
          const data = await api('/polybot/mirofish/evolve/results');
          setEvolutionResults(data);
        } catch { /* not ready */ }
        setEvolveRunning(false);
      }, 30000);
    } catch (err) {
      setError(err.message);
      setEvolveRunning(false);
    }
  };

  const fetchEvolution = async () => {
    try {
      const data = await api('/polybot/mirofish/evolve/results');
      setEvolutionResults(data);
    } catch { /* none yet */ }
  };

  // ─── Live Params ──────────────────────────────────────────────────
  const fetchParamsStatus = async () => {
    try {
      const data = await api('/polybot/mirofish/params/status');
      setParamsStatus(data);
    } catch { /* not available */ }
  };

  const reapplyParams = async () => {
    setReapplying(true);
    try {
      const data = await api('/polybot/mirofish/params/reapply', { method: 'POST' });
      setParamsStatus(prev => ({ ...prev, reapplyResult: data }));
      await fetchParamsStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setReapplying(false);
    }
  };

  // ─── Signal Pipeline ──────────────────────────────────────────────
  const fetchPipeline = async () => {
    setPipelineLoading(true);
    try {
      const data = await api('/polybot/mirofish/pipeline');
      setPipelineData(data);
    } catch { /* not available */ }
    finally { setPipelineLoading(false); }
  };

  const runBatch = async () => {
    setBatchRunning(true);
    try {
      const result = await api('/polybot/mirofish/batch', {
        method: 'POST',
        body: JSON.stringify({ maxSimulations: 3 }),
      });
      // Refresh pipeline view after batch
      await fetchPipeline();
      if (result?.reason) setError(result.reason);
    } catch (err) {
      setError(err.message);
    } finally {
      setBatchRunning(false);
    }
  };

  // ─── Load existing data on tab switch ─────────────────────────────
  useEffect(() => {
    if (activeTab === 'test') fetchLatestSuite();
    if (activeTab === 'suggest') fetchSuggestions();
    if (activeTab === 'evolve') fetchEvolution();
    if (activeTab === 'params') fetchParamsStatus();
    if (activeTab === 'pipeline') fetchPipeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  if (loading) {
    return (
      <PageWrapper>
        <Container>
          <EmptyState><Spinner /> Loading Strategy Lab...</EmptyState>
        </Container>
      </PageWrapper>
    );
  }

  return (
    <>
    <PageWrapper>
      <Helmet><title>MiroFish Strategy Lab | MarketPlayMaker</title></Helmet>
      <Container>
        <Header>
          <Title>🐟 MiroFish Strategy Lab</Title>
          <Subtitle>
            Agent-based market simulation • LLM-powered diagnostics • Evolutionary parameter optimization
          </Subtitle>
        </Header>

        {error && (
          <Card style={{ borderColor: 'rgba(239,68,68,0.3)', marginBottom: '1rem' }}>
            <span style={{ color: '#f87171' }}>⚠️ {error}</span>
            <Button $variant="ghost" onClick={fetchStatus} style={{ marginLeft: '1rem', fontSize: '0.75rem' }}>
              Retry
            </Button>
          </Card>
        )}

        {/* ─── Tabs ──────────────────────────────────────────────── */}
        <TabBar>
          {[
            { id: 'overview', icon: '📊', label: 'Overview' },
            { id: 'pipeline', icon: '🔗', label: 'Signal Pipeline' },
            { id: 'test', icon: '🧪', label: 'Strategy Tester' },
            { id: 'adversarial', icon: '⚔️', label: 'Adversarial' },
            { id: 'suggest', icon: '🧠', label: 'AI Suggestions' },
            { id: 'evolve', icon: '🧬', label: 'Evolution' },
            { id: 'params', icon: '⚙️', label: 'Live Params' },
          ].map(tab => (
            <Tab key={tab.id} $active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
              {tab.icon} {tab.label}
            </Tab>
          ))}
        </TabBar>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* OVERVIEW TAB                                           */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <Grid>
            <FullWidth>
              <Card $delay="0.1s">
                <CardTitle>🔬 Lab Status</CardTitle>
                <StatRow $cols={4}>
                  <StatBox>
                    <StatValue $color={labStatus?.simulator?.loaded ? '#34d399' : '#f87171'}>
                      {labStatus?.simulator?.loaded ? '●' : '○'}
                    </StatValue>
                    <StatLabel>Simulator</StatLabel>
                  </StatBox>
                  <StatBox>
                    <StatValue $color={labStatus?.suggester?.configured ? '#34d399' : '#f87171'}>
                      {labStatus?.suggester?.configured ? '●' : '○'}
                    </StatValue>
                    <StatLabel>AI Suggester</StatLabel>
                  </StatBox>
                  <StatBox>
                    <StatValue $color={labStatus?.evolver?.loaded ? '#34d399' : '#f87171'}>
                      {labStatus?.evolver?.loaded ? '●' : '○'}
                    </StatValue>
                    <StatLabel>Evolver</StatLabel>
                  </StatBox>
                  <StatBox>
                    <StatValue $color="#a5b4fc">
                      {labStatus?.suggester?.model || '—'}
                    </StatValue>
                    <StatLabel>LLM Model</StatLabel>
                  </StatBox>
                </StatRow>
              </Card>
            </FullWidth>

            <Card $delay="0.2s">
              <CardTitle>🧪 Latest Test Suite</CardTitle>
              {labStatus?.latestTestSuite ? (
                <>
                  <StatRow $cols={2}>
                    <StatBox>
                      <StatValue $color="#6ee7b7">{new Date(labStatus.latestTestSuite).toLocaleDateString()}</StatValue>
                      <StatLabel>Last Run</StatLabel>
                    </StatBox>
                    <StatBox>
                      <StatValue $color="#a5b4fc">{timeSince(labStatus.latestTestSuite)}</StatValue>
                      <StatLabel>Age</StatLabel>
                    </StatBox>
                  </StatRow>
                  <Button $variant="ghost" onClick={() => setActiveTab('test')} style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center' }}>
                    View Results →
                  </Button>
                </>
              ) : (
                <EmptyState style={{ padding: '1.5rem' }}>No tests run yet</EmptyState>
              )}
            </Card>

            <Card $delay="0.3s">
              <CardTitle>🧠 AI Suggestions</CardTitle>
              {labStatus?.latestSuggestions ? (
                <>
                  <StatRow $cols={2}>
                    <StatBox>
                      <StatValue $color="#fbbf24">{labStatus.suggester?.latestSuggestions?.count || 0}</StatValue>
                      <StatLabel>Suggestions</StatLabel>
                    </StatBox>
                    <StatBox>
                      <StatValue $color="#a5b4fc">{timeSince(labStatus.latestSuggestions)}</StatValue>
                      <StatLabel>Age</StatLabel>
                    </StatBox>
                  </StatRow>
                  <Button $variant="ghost" onClick={() => setActiveTab('suggest')} style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center' }}>
                    View Suggestions →
                  </Button>
                </>
              ) : (
                <EmptyState style={{ padding: '1.5rem' }}>No suggestions yet</EmptyState>
              )}
            </Card>

            <Card $delay="0.4s">
              <CardTitle>🧬 Evolution</CardTitle>
              {labStatus?.latestEvolution ? (
                <>
                  <StatRow $cols={2}>
                    <StatBox>
                      <StatValue $color="#34d399">{new Date(labStatus.latestEvolution).toLocaleDateString()}</StatValue>
                      <StatLabel>Last Evolution</StatLabel>
                    </StatBox>
                    <StatBox>
                      <StatValue $color="#a5b4fc">{timeSince(labStatus.latestEvolution)}</StatValue>
                      <StatLabel>Age</StatLabel>
                    </StatBox>
                  </StatRow>
                  <Button $variant="ghost" onClick={() => setActiveTab('evolve')} style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center' }}>
                    View Results →
                  </Button>
                </>
              ) : (
                <EmptyState style={{ padding: '1.5rem' }}>No evolution yet</EmptyState>
              )}
            </Card>

            <Card $delay="0.45s">
              <CardTitle>⚙️ Live Params</CardTitle>
              <StatRow $cols={2}>
                <StatBox>
                  <StatValue $color="#fbbf24">{paramsStatus?.results?.filter(r => r.applied)?.length ?? '—'}</StatValue>
                  <StatLabel>Strategies Active</StatLabel>
                </StatBox>
                <StatBox>
                  <StatValue $color="#a5b4fc">{paramsStatus?.appliedAt ? timeSince(paramsStatus.appliedAt) : '—'}</StatValue>
                  <StatLabel>Last Applied</StatLabel>
                </StatBox>
              </StatRow>
              <Button $variant="ghost" onClick={() => setActiveTab('params')} style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center' }}>
                View Overrides →
              </Button>
            </Card>

            <Card $delay="0.5s">
              <CardTitle>🔗 Signal Pipeline</CardTitle>
              <StatRow $cols={2}>
                <StatBox>
                  <StatValue $color="#34d399">{labStatus?.configured ? '●' : '○'}</StatValue>
                  <StatLabel>MiroFish</StatLabel>
                </StatBox>
                <StatBox>
                  <StatValue $color="#a5b4fc">{labStatus?.queueLength ?? '—'}</StatValue>
                  <StatLabel>Queued</StatLabel>
                </StatBox>
              </StatRow>
              <Button $variant="ghost" onClick={() => setActiveTab('pipeline')} style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center' }}>
                View Pipeline →
              </Button>
            </Card>

            {/* How it works */}
            <FullWidth>
              <Card $delay="0.55s">
                <CardTitle>🏗️ How MiroFish Strategy Lab Works</CardTitle>
                <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                  {[
                    { icon: '🔗', title: 'Signal Pipeline', desc: 'Question → Scenario → Knowledge Graph → Multi-Agent Sim → Probability Signal → Ensemble' },
                    { icon: '📈', title: 'Market Simulator', desc: 'Agent-based LOB with 10 agent archetypes, 4 market regimes, and 10 pre-built scenarios' },
                    { icon: '🧪', title: 'Strategy Tester', desc: 'Tests your real strategies against simulated markets with Monte Carlo runs' },
                    { icon: '⚔️', title: 'Adversarial Testing', desc: 'Pits strategies against front-runners, whale manipulators, and liquidity crises' },
                    { icon: '🧠', title: 'AI Diagnosis', desc: 'LLM analyzes test results, identifies failure modes, and suggests improvements' },
                    { icon: '🧬', title: 'Evolutionary Optimizer', desc: 'Evolves strategy parameters via genetic algorithm — population, crossover, mutation' },
                    { icon: '⚙️', title: 'Live Params', desc: 'Auto-applies evolved params at startup with fitness threshold, full before/after visibility' },
                  ].map((item, i) => (
                    <div key={i} style={{ background: 'rgba(16,185,129,0.05)', borderRadius: '10px', padding: '0.75rem' }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{item.icon}</div>
                      <div style={{ fontWeight: 700, color: '#6ee7b7', fontSize: '0.82rem', marginBottom: '0.25rem' }}>{item.title}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.72rem', lineHeight: 1.4 }}>{item.desc}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </FullWidth>
          </Grid>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STRATEGY TESTER TAB                                    */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'test' && (
          <Grid>
            <FullWidth>
              <Card $delay="0.1s">
                <CardTitle>🧪 Strategy Tester</CardTitle>
                <ActionBar>
                  <Select value={selectedStrategy} onChange={e => setSelectedStrategy(e.target.value)}>
                    {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                  <Select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                    {['politics', 'crypto', 'sports', 'geopolitics'].map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                  <Button $variant="primary" onClick={runStrategyTest} disabled={testRunning}>
                    {testRunning ? <><Spinner /> Running...</> : '▶ Test Strategy'}
                  </Button>
                  <Button $variant="ghost" onClick={runFullSuite} disabled={testRunning}>
                    {testRunning ? <><Spinner /> Running...</> : '🔬 Full Suite'}
                  </Button>
                </ActionBar>
              </Card>
            </FullWidth>

            {/* Single Strategy Results */}
            {testResults && (
              <FullWidth>
                <Card $delay="0.2s">
                  <CardTitle>📊 {testResults.overall?.strategy} — Test Results</CardTitle>
                  <StatRow $cols={5}>
                    <StatBox>
                      <StatValue><PnlText $value={testResults.overall?.overallPnL}>${testResults.overall?.overallPnL?.toFixed(2)}</PnlText></StatValue>
                      <StatLabel>Total PnL</StatLabel>
                    </StatBox>
                    <StatBox>
                      <StatValue $color={testResults.overall?.overallROI > 0 ? '#34d399' : '#f87171'}>
                        {(testResults.overall?.overallROI * 100)?.toFixed(1)}%
                      </StatValue>
                      <StatLabel>ROI</StatLabel>
                    </StatBox>
                    <StatBox>
                      <StatValue $color="#fbbf24">{(testResults.overall?.overallWinRate * 100)?.toFixed(0)}%</StatValue>
                      <StatLabel>Win Rate</StatLabel>
                    </StatBox>
                    <StatBox>
                      <StatValue $color="#34d399">{testResults.overall?.bestScenario}</StatValue>
                      <StatLabel>Best Scenario</StatLabel>
                    </StatBox>
                    <StatBox>
                      <StatValue $color="#f87171">{testResults.overall?.worstScenario}</StatValue>
                      <StatLabel>Worst Scenario</StatLabel>
                    </StatBox>
                  </StatRow>

                  {testResults.scenarios && (
                    <TableWrapper style={{ marginTop: '1rem' }}>
                      <StyledTable>
                        <thead>
                          <tr>
                            <th>Scenario</th>
                            <th>Avg PnL</th>
                            <th>Win Rate</th>
                            <th>Trades</th>
                            <th>Drawdown</th>
                            <th>Edge Half-Life</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(testResults.scenarios).map(([name, s]) => (
                            <tr key={name}>
                              <td style={{ fontWeight: 600 }}>{name}</td>
                              <td><PnlText $value={s.avgPnL}>${s.avgPnL?.toFixed(2)}</PnlText></td>
                              <td>{(s.avgWinRate * 100)?.toFixed(0)}%</td>
                              <td>{s.avgTradeCount?.toFixed(1)}</td>
                              <td style={{ color: '#f87171' }}>{(s.avgDrawdown * 100)?.toFixed(1)}%</td>
                              <td>{s.avgEdgeHalfLife?.toFixed(0)} ticks</td>
                            </tr>
                          ))}
                        </tbody>
                      </StyledTable>
                    </TableWrapper>
                  )}
                </Card>
              </FullWidth>
            )}

            {/* Latest Full Suite */}
            {latestSuite && (
              <FullWidth>
                <Card $delay="0.3s">
                  <CardTitle>🔬 Full Suite — Strategy Rankings</CardTitle>
                  {latestSuite.rankings ? (
                    <TableWrapper>
                      <StyledTable>
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Strategy</th>
                            <th>PnL</th>
                            <th>ROI</th>
                            <th>Win Rate</th>
                            <th>Drawdown</th>
                            <th>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {latestSuite.rankings.map((r, i) => (
                            <tr key={r.strategy}>
                              <td style={{ fontWeight: 700, color: i === 0 ? '#fbbf24' : '#94a3b8' }}>#{i + 1}</td>
                              <td style={{ fontWeight: 600 }}>{r.strategy}</td>
                              <td><PnlText $value={r.totalPnL}>${r.totalPnL?.toFixed(2)}</PnlText></td>
                              <td><PnlText $value={r.avgROI}>{(r.avgROI * 100)?.toFixed(1)}%</PnlText></td>
                              <td>{(r.avgWinRate * 100)?.toFixed(0)}%</td>
                              <td style={{ color: '#f87171' }}>{(r.avgDrawdown * 100)?.toFixed(1)}%</td>
                              <td style={{ color: '#6ee7b7' }}>{r.compositeScore?.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </StyledTable>
                    </TableWrapper>
                  ) : (
                    <CodeBlock>{JSON.stringify(latestSuite, null, 2).slice(0, 2000)}</CodeBlock>
                  )}
                </Card>
              </FullWidth>
            )}
          </Grid>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ADVERSARIAL TAB                                        */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'adversarial' && (
          <Grid>
            <FullWidth>
              <Card $delay="0.1s">
                <CardTitle>⚔️ Adversarial Testing</CardTitle>
                <Subtitle style={{ textAlign: 'left', margin: '0 0 1rem 0', maxWidth: 'none' }}>
                  Test strategies against hostile market participants — front-runners, whale manipulators, and liquidity crises.
                </Subtitle>
                <ActionBar>
                  <Select value={selectedStrategy} onChange={e => setSelectedStrategy(e.target.value)}>
                    {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                  <Button $variant="danger" onClick={runAdversarialTest} disabled={adversarialRunning}>
                    {adversarialRunning ? <><Spinner /> Simulating...</> : '⚔️ Run Adversarial Test'}
                  </Button>
                </ActionBar>
              </Card>
            </FullWidth>

            {adversarialResults && (
              <>
                {Object.entries(adversarialResults.adversarialResults || {}).map(([scenario, data]) => (
                  <Card key={scenario} $delay="0.2s">
                    <CardTitle>
                      {scenario === 'front_running' ? '🏃' : scenario === 'whale_manipulation' ? '🐋' : '💧'}
                      {' '}{scenario.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </CardTitle>
                    <StatRow $cols={2}>
                      <StatBox>
                        <StatValue><PnlText $value={data.avgPnL}>${data.avgPnL?.toFixed(2)}</PnlText></StatValue>
                        <StatLabel>Avg PnL</StatLabel>
                      </StatBox>
                      <StatBox>
                        <StatValue $color={data.survivalRate === 1 ? '#34d399' : '#f87171'}>
                          {(data.survivalRate * 100)?.toFixed(0)}%
                        </StatValue>
                        <StatLabel>Survival Rate</StatLabel>
                      </StatBox>
                    </StatRow>
                    <StatRow $cols={2} style={{ marginTop: '0.5rem' }}>
                      <StatBox>
                        <StatValue $color="#fbbf24">{(data.avgWinRate * 100)?.toFixed(0)}%</StatValue>
                        <StatLabel>Win Rate</StatLabel>
                      </StatBox>
                      <StatBox>
                        <StatValue $color="#f87171">{(data.avgDrawdown * 100)?.toFixed(1)}%</StatValue>
                        <StatLabel>Max Drawdown</StatLabel>
                      </StatBox>
                    </StatRow>
                  </Card>
                ))}
              </>
            )}
          </Grid>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* AI SUGGESTIONS TAB                                     */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'suggest' && (
          <Grid>
            <FullWidth>
              <Card $delay="0.1s">
                <CardTitle>🧠 AI Strategy Suggestions</CardTitle>
                <ActionBar>
                  <Button $variant="primary" onClick={generateSuggestions} disabled={suggestRunning}>
                    {suggestRunning ? <><Spinner /> Generating...</> : '🧠 Generate New Suggestions'}
                  </Button>
                  <Button $variant="ghost" onClick={fetchSuggestions}>↻ Refresh</Button>
                  {suggestions?.stats && (
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                      {suggestions.stats.totalSuggestions} suggestions • {suggestions.stats.validated} validated • {suggestions.stats.rejected} rejected
                    </span>
                  )}
                </ActionBar>
              </Card>
            </FullWidth>

            {/* Strategy Grades */}
            {suggestions?.strategyGrades && (
              <FullWidth>
                <Card $delay="0.15s">
                  <CardTitle>📋 Strategy Grades</CardTitle>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {Object.entries(suggestions.strategyGrades).map(([name, info]) => (
                      <div key={name} style={{
                        background: 'rgba(16,185,129,0.05)',
                        borderRadius: '10px',
                        padding: '0.75rem 1rem',
                        minWidth: '140px',
                        flex: '1 1 140px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <Badge $type={info.grade}>{info.grade}</Badge>
                          <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{name}</span>
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                          {info.viability} • {info.failureModeCount} failure mode{info.failureModeCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </FullWidth>
            )}

            {/* Recommendations */}
            {suggestions?.recommendations?.map((rec, i) => (
              <Card key={rec.id || i} $delay={`${0.2 + i * 0.05}s`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 800, color: '#6ee7b7', fontSize: '1.1rem' }}>#{rec.rank}</span>
                  <Badge $type={rec.confidence === 'HIGH' ? 'success' : rec.confidence === 'MEDIUM' ? 'warning' : 'danger'}>
                    {rec.confidence}
                  </Badge>
                  <Badge $type="info">{rec.type}</Badge>
                </div>
                <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  {rec.title}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                  {rec.description}
                </div>
                {rec.expectedImprovement && (
                  <StatRow $cols={3}>
                    <StatBox>
                      <StatValue $color="#34d399" style={{ fontSize: '0.9rem' }}>{rec.expectedImprovement.roiDelta}</StatValue>
                      <StatLabel>ROI Δ</StatLabel>
                    </StatBox>
                    <StatBox>
                      <StatValue $color="#fbbf24" style={{ fontSize: '0.9rem' }}>{rec.expectedImprovement.winRateDelta}</StatValue>
                      <StatLabel>Win Rate Δ</StatLabel>
                    </StatBox>
                    <StatBox>
                      <StatValue $color="#a5b4fc" style={{ fontSize: '0.9rem' }}>{rec.expectedImprovement.drawdownImprovement}</StatValue>
                      <StatLabel>Drawdown Δ</StatLabel>
                    </StatBox>
                  </StatRow>
                )}
                {rec.strategy && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#64748b' }}>
                    Strategy: <span style={{ color: '#a5b4fc' }}>{rec.strategy}</span>
                    {rec.applicableRegimes && <> • Regimes: {rec.applicableRegimes.join(', ')}</>}
                  </div>
                )}
                {rec.validated !== null && rec.validated !== undefined && (
                  <div style={{ marginTop: '0.25rem', fontSize: '0.72rem', color: rec.validated ? '#34d399' : '#f87171' }}>
                    {rec.validated ? '✓ Validated via simulation' : '✗ Not validated'}
                    {rec.validationResult && typeof rec.validationResult === 'string' && ` — ${rec.validationResult}`}
                  </div>
                )}
              </Card>
            ))}

            {suggestions?.summary && (
              <FullWidth>
                <Card $delay="0.5s">
                  <CardTitle>📝 Summary</CardTitle>
                  <p style={{ color: '#94a3b8', fontSize: '0.82rem', lineHeight: 1.6 }}>{suggestions.summary}</p>
                </Card>
              </FullWidth>
            )}

            {!suggestions && (
              <FullWidth>
                <EmptyState>
                  No suggestions yet. Click &ldquo;Generate New Suggestions&rdquo; to run the LLM analysis pipeline.
                </EmptyState>
              </FullWidth>
            )}
          </Grid>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* EVOLUTION TAB                                          */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'evolve' && (
          <Grid>
            <FullWidth>
              <Card $delay="0.1s">
                <CardTitle>🧬 Evolutionary Parameter Optimization</CardTitle>
                <Subtitle style={{ textAlign: 'left', margin: '0 0 1rem 0', maxWidth: 'none' }}>
                  Evolves strategy parameters using genetic algorithms — population breeding, crossover, mutation, and elite selection.
                </Subtitle>
                <ActionBar>
                  <Select value={selectedStrategy} onChange={e => setSelectedStrategy(e.target.value)}>
                    {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                  <Button $variant="primary" onClick={evolveStrategy} disabled={evolveRunning}>
                    {evolveRunning ? <><Spinner /> Evolving...</> : '🧬 Evolve Strategy'}
                  </Button>
                  <Button $variant="ghost" onClick={evolveAll} disabled={evolveRunning}>
                    {evolveRunning ? <><Spinner /> Evolving...</> : '🔄 Evolve All'}
                  </Button>
                  <Button $variant="ghost" onClick={fetchEvolution}>↻ Refresh</Button>
                </ActionBar>
              </Card>
            </FullWidth>

            {/* Evolved Strategy Details */}
            {evolvedStrategy?.bestGenome && (
              <FullWidth>
                <Card $delay="0.2s" $glow>
                  <CardTitle>🏆 Best Evolved Genome — {evolvedStrategy.strategyName}</CardTitle>
                  <StatRow $cols={3}>
                    <StatBox>
                      <StatValue $color="#fbbf24">{evolvedStrategy.bestGenome.fitness?.toFixed(1)}</StatValue>
                      <StatLabel>Fitness Score</StatLabel>
                    </StatBox>
                    <StatBox>
                      <StatValue $color="#a5b4fc">Gen {evolvedStrategy.bestGenome.generation}</StatValue>
                      <StatLabel>Generation</StatLabel>
                    </StatBox>
                    <StatBox>
                      <StatValue $color="#6ee7b7">{evolvedStrategy.bestGenome.id?.split('-').pop()}</StatValue>
                      <StatLabel>Genome ID</StatLabel>
                    </StatBox>
                  </StatRow>

                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ fontWeight: 700, color: '#6ee7b7', fontSize: '0.82rem', marginBottom: '0.5rem' }}>Optimized Parameters:</div>
                    <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                      {Object.entries(evolvedStrategy.bestGenome.params || {}).map(([key, val]) => (
                        <div key={key} style={{
                          background: 'rgba(16,185,129,0.06)',
                          borderRadius: '8px',
                          padding: '0.5rem 0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{key}</span>
                          <span style={{ color: '#6ee7b7', fontWeight: 700, fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>
                            {typeof val === 'number' ? val.toFixed(4).replace(/\.?0+$/, '') : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top 5 */}
                  {evolvedStrategy.top5 && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.78rem', marginBottom: '0.5rem' }}>Top 5 Genomes:</div>
                      <TableWrapper>
                        <StyledTable>
                          <thead>
                            <tr>
                              <th>Rank</th>
                              <th>ID</th>
                              <th>Fitness</th>
                              <th>Generation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {evolvedStrategy.top5.map((g, i) => (
                              <tr key={g.id}>
                                <td style={{ fontWeight: 700, color: i === 0 ? '#fbbf24' : '#94a3b8' }}>#{i + 1}</td>
                                <td style={{ fontSize: '0.72rem', color: '#a5b4fc' }}>{g.id}</td>
                                <td style={{ fontWeight: 700, color: '#6ee7b7' }}>{g.fitness?.toFixed(1)}</td>
                                <td>{g.generation}</td>
                              </tr>
                            ))}
                          </tbody>
                        </StyledTable>
                      </TableWrapper>
                    </div>
                  )}
                </Card>
              </FullWidth>
            )}

            {/* Evolution History */}
            {evolutionResults?.results?.length > 0 && (
              <FullWidth>
                <Card $delay="0.3s">
                  <CardTitle>📂 Evolution History ({evolutionResults.count} results)</CardTitle>
                  <TableWrapper>
                    <StyledTable>
                      <thead>
                        <tr>
                          <th>File</th>
                          <th>Size</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evolutionResults.results.map(r => (
                          <tr key={r.filename} style={{ cursor: 'pointer' }} onClick={async () => {
                            const name = r.filename.match(/evolution-(\w+)-/)?.[1];
                            if (name && name !== 'summary') {
                              try {
                                const data = await api(`/polybot/mirofish/evolve/${name}`);
                                setEvolvedStrategy(data);
                              } catch { /* ignore */ }
                            }
                          }}>
                            <td style={{ color: '#a5b4fc', fontWeight: 600 }}>{r.filename.replace('.json', '')}</td>
                            <td>{(r.size / 1024).toFixed(1)} KB</td>
                            <td>{new Date(r.created).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </StyledTable>
                  </TableWrapper>
                </Card>
              </FullWidth>
            )}

            {!evolvedStrategy && !evolutionResults?.results?.length && (
              <FullWidth>
                <EmptyState>
                  No evolution results yet. Select a strategy and click &ldquo;Evolve Strategy&rdquo; to start the genetic algorithm.
                </EmptyState>
              </FullWidth>
            )}
          </Grid>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* LIVE PARAMS TAB                                        */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'params' && (
          <Grid>
            <FullWidth>
              <Card $delay="0.1s">
                <CardTitle>⚙️ Live Evolved Parameters</CardTitle>
                <Subtitle style={{ textAlign: 'left', margin: '0 0 1rem 0', maxWidth: 'none' }}>
                  Shows which evolved parameters are currently overriding strategy defaults. These are applied at server startup from the latest evolution results.
                </Subtitle>
                <ActionBar>
                  <Button $variant="primary" onClick={reapplyParams} disabled={reapplying}>
                    {reapplying ? <><Spinner /> Re-applying...</> : '🔄 Re-apply Latest'}
                  </Button>
                  <Button $variant="ghost" onClick={fetchParamsStatus}>↻ Refresh</Button>
                </ActionBar>
              </Card>
            </FullWidth>

            {paramsStatus?.available === false && (
              <FullWidth>
                <EmptyState>Param applicator not loaded. Run an evolution first, then restart the server.</EmptyState>
              </FullWidth>
            )}

            {paramsStatus?.results?.map((strat, idx) => (
              <FullWidth key={strat.strategy}>
                <Card $delay={`${0.15 + idx * 0.08}s`} $glow={strat.applied}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <CardTitle style={{ margin: 0 }}>
                      {strat.applied ? '✅' : '⏸️'} {strat.strategy}
                    </CardTitle>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      {strat.applied && (
                        <>
                          <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700 }}>
                            Fitness: {strat.fitness?.toFixed(1)}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            Gen {strat.generation} • {strat.genomeId}
                          </span>
                        </>
                      )}
                      {!strat.applied && (
                        <span style={{ fontSize: '0.72rem', color: '#f87171' }}>
                          {strat.reason || 'Not applied'}
                        </span>
                      )}
                    </div>
                  </div>

                  {strat.applied && strat.overrides && Object.keys(strat.overrides).length > 0 && (
                    <TableWrapper>
                      <StyledTable>
                        <thead>
                          <tr>
                            <th>Parameter</th>
                            <th>Default</th>
                            <th>→</th>
                            <th>Evolved</th>
                            <th>Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(strat.overrides).map(([key, info]) => {
                            const oldVal = typeof info.old === 'number' ? info.old : parseFloat(info.old) || 0;
                            const newVal = typeof info.new === 'number' ? info.new : parseFloat(info.new) || 0;
                            const pctChange = oldVal !== 0 ? ((newVal - oldVal) / Math.abs(oldVal) * 100) : 0;
                            const isUp = newVal > oldVal;
                            return (
                              <tr key={key}>
                                <td style={{ color: '#a5b4fc', fontWeight: 600 }}>{key}</td>
                                <td style={{ color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                                  {typeof info.old === 'number' ? info.old.toFixed(4).replace(/\.?0+$/, '') : String(info.old ?? '—')}
                                </td>
                                <td style={{ color: '#64748b', textAlign: 'center' }}>→</td>
                                <td style={{ color: '#6ee7b7', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                  {typeof info.new === 'number' ? info.new.toFixed(4).replace(/\.?0+$/, '') : String(info.new)}
                                </td>
                                <td style={{
                                  color: Math.abs(pctChange) > 50 ? '#f87171' : isUp ? '#34d399' : '#fb923c',
                                  fontWeight: 600, fontSize: '0.78rem',
                                }}>
                                  {isUp ? '▲' : '▼'} {Math.abs(pctChange).toFixed(0)}%
                                  {Math.abs(pctChange) > 100 && ' ⚠️'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </StyledTable>
                    </TableWrapper>
                  )}

                  {strat.applied && (!strat.overrides || Object.keys(strat.overrides).length === 0) && (
                    <div style={{ color: '#94a3b8', fontSize: '0.78rem', fontStyle: 'italic' }}>No parameter overrides recorded</div>
                  )}
                </Card>
              </FullWidth>
            ))}

            {paramsStatus?.appliedAt && (
              <FullWidth>
                <Card $delay="0.6s">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                      Last applied: {new Date(paramsStatus.appliedAt).toLocaleString()}
                    </span>
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                      {paramsStatus.results?.filter(r => r.applied)?.length || 0} / {paramsStatus.results?.length || 0} strategies with active overrides
                    </span>
                  </div>
                </Card>
              </FullWidth>
            )}
          </Grid>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* SIGNAL PIPELINE TAB                                    */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'pipeline' && (
          <Grid>
            {/* Pipeline Flow Visualization */}
            <FullWidth>
              <Card $delay="0.1s">
                <CardTitle>🔗 MiroFish Signal Pipeline</CardTitle>
                <Subtitle style={{ textAlign: 'left', margin: '0 0 1rem 0', maxWidth: 'none' }}>
                  Polymarket Question → Scenario Builder → Knowledge Graph → Multi-Agent Simulation → Stance/Sentiment Analysis → Probability Signal → Polybot Ensemble
                </Subtitle>
                <ActionBar>
                  <Button $variant="primary" onClick={runBatch} disabled={batchRunning}>
                    {batchRunning ? <><Spinner /> Running Batch...</> : '🚀 Run Batch Simulation'}
                  </Button>
                  <Button $variant="ghost" onClick={fetchPipeline} disabled={pipelineLoading}>
                    {pipelineLoading ? <Spinner /> : '↻ Refresh'}
                  </Button>
                </ActionBar>
              </Card>
            </FullWidth>

            {/* MiroFish Connection Banner */}
            {pipelineData && !pipelineData.miroFishAvailable && (
              <FullWidth>
                <Card $delay="0.12s" style={{ borderColor: 'rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                    <div>
                      <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.88rem' }}>MiroFish Engine Not Connected</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                        Set the <code style={{ color: '#a5b4fc', background: 'rgba(165,180,252,0.1)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>MIROFISH_URL</code> environment variable to enable the full signal pipeline.
                        Strategy Lab features (testing, evolution, suggestions, live params) work independently.
                      </div>
                    </div>
                  </div>
                </Card>
              </FullWidth>
            )}

            {/* Pipeline Stage Cards */}
            {pipelineData?.pipelineStages && (
              <FullWidth>
                <Card $delay="0.15s">
                  <CardTitle>📊 Pipeline Stages</CardTitle>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', overflowX: 'auto', padding: '0.5rem 0' }}>
                    {pipelineData.pipelineStages.map((stage, i) => (
                      <React.Fragment key={stage.name}>
                        <div style={{
                          background: stage.count > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.1)',
                          border: `1px solid ${stage.count > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.2)'}`,
                          borderRadius: '10px',
                          padding: '0.75rem 1rem',
                          minWidth: '140px',
                          textAlign: 'center',
                          flex: '0 0 auto',
                        }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stage.count > 0 ? '#6ee7b7' : '#64748b' }}>
                            {stage.count}
                          </div>
                          <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.78rem', marginBottom: '0.15rem' }}>
                            {stage.name}
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.68rem', lineHeight: 1.3 }}>
                            {stage.desc}
                          </div>
                        </div>
                        {i < pipelineData.pipelineStages.length - 1 && (
                          <div style={{ color: '#6ee7b7', fontSize: '1.2rem', fontWeight: 700, flex: '0 0 auto' }}>→</div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </Card>
              </FullWidth>
            )}

            {/* Status Overview */}
            {pipelineData?.status && (
              <Card $delay="0.2s">
                <CardTitle>📡 MiroFish Status</CardTitle>
                <StatRow $cols={2}>
                  <StatBox>
                    <StatValue $color={pipelineData.backendReachable ? '#34d399' : pipelineData.miroFishAvailable ? '#fbbf24' : '#f87171'}>
                      {pipelineData.backendReachable ? '● Online' : pipelineData.miroFishAvailable ? '◐ Module Only' : '○ Offline'}
                    </StatValue>
                    <StatLabel>{pipelineData.backendReachable ? 'Backend Connected' : pipelineData.miroFishAvailable ? 'Backend Unreachable' : 'Not Configured'}</StatLabel>
                  </StatBox>
                  <StatBox>
                    <StatValue $color="#a5b4fc">{pipelineData.status.totalSimulations || 0}</StatValue>
                    <StatLabel>Total Sims</StatLabel>
                  </StatBox>
                  <StatBox>
                    <StatValue $color="#6ee7b7">{pipelineData.status.completedSimulations || 0}</StatValue>
                    <StatLabel>Completed</StatLabel>
                  </StatBox>
                  <StatBox>
                    <StatValue $color="#fbbf24">{pipelineData.status.queueLength || 0}</StatValue>
                    <StatLabel>Queued</StatLabel>
                  </StatBox>
                </StatRow>
                {!pipelineData.backendReachable && pipelineData.miroFishAvailable && (
                  <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '6px', fontSize: '0.72rem', color: '#fbbf24', lineHeight: 1.5 }}>
                    ⚠️ MiroFish module loaded but backend at <span style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>{pipelineData.backendUrl || 'localhost:5001'}</span> is not reachable. Markets can be assessed &amp; queued, but simulations won&apos;t run until the backend is online.
                  </div>
                )}
                {pipelineData.status.lastBatchTime && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: '#94a3b8' }}>
                    Last batch: {timeSince(pipelineData.status.lastBatchTime)}
                  </div>
                )}
              </Card>
            )}

            {/* Category Weights */}
            {pipelineData?.categoryWeights && (
              <Card $delay="0.25s">
                <CardTitle>⚖️ Category Weights</CardTitle>
                <div style={{ display: 'grid', gap: '0.4rem' }}>
                  {Object.entries(pipelineData.categoryWeights)
                    .sort(([,a], [,b]) => b - a)
                    .map(([cat, weight]) => (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.78rem', width: '80px', textTransform: 'capitalize' }}>{cat}</span>
                      <div style={{ flex: 1, background: 'rgba(100,116,139,0.15)', borderRadius: '4px', height: '18px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${weight * 100 / 0.35}%`,
                          height: '100%',
                          background: weight >= 0.3 ? '#10b981' : weight >= 0.2 ? '#fbbf24' : '#64748b',
                          borderRadius: '4px',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <span style={{ color: '#6ee7b7', fontWeight: 700, fontSize: '0.78rem', width: '35px', textAlign: 'right' }}>
                        {(weight * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.68rem', color: '#64748b', lineHeight: 1.4 }}>
                  Weight determines how much MiroFish signal influences the final ensemble probability for each market category.
                </div>
              </Card>
            )}

            {/* Queue */}
            {pipelineData?.queue?.length > 0 && (
              <FullWidth>
                <Card $delay="0.3s">
                  <CardTitle>📋 Simulation Queue ({pipelineData.queue.length} pending)</CardTitle>
                  <TableWrapper>
                    <StyledTable>
                      <thead>
                        <tr>
                          <th>Market Question</th>
                          <th>Category</th>
                          <th>Priority</th>
                          <th>Queued</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pipelineData.queue.map(q => (
                          <tr key={q.conditionId}>
                            <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {q.question}
                            </td>
                            <td>
                              <span style={{
                                background: 'rgba(16,185,129,0.1)',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                color: '#6ee7b7',
                                textTransform: 'capitalize',
                              }}>{q.category}</span>
                            </td>
                            <td style={{ fontWeight: 700, color: q.priority >= 80 ? '#fbbf24' : '#94a3b8' }}>{q.priority}</td>
                            <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{timeSince(q.queuedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </StyledTable>
                  </TableWrapper>
                </Card>
              </FullWidth>
            )}

            {/* Completed Simulations */}
            {pipelineData?.simulations?.length > 0 && (
              <FullWidth>
                <Card $delay="0.35s">
                  <CardTitle>🐟 Completed Simulations ({pipelineData.simulations.filter(s => s.status === 'completed').length})</CardTitle>
                  <TableWrapper>
                    <StyledTable>
                      <thead>
                        <tr>
                          <th>Market</th>
                          <th>Status</th>
                          <th>Market Price</th>
                          <th>MiroFish Signal</th>
                          <th>Divergence</th>
                          <th>Confidence</th>
                          <th>Methods</th>
                          <th>Report</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pipelineData.simulations.map(sim => {
                          const divergence = (sim.prob != null && sim.yesPrice != null)
                            ? ((sim.prob - sim.yesPrice) * 100).toFixed(1)
                            : null;
                          const conf = (sim.confidence || '').toUpperCase();
                          return (
                          <tr key={sim.conditionId} onClick={() => sim.status === 'completed' && openReport(sim.conditionId)}
                            style={{ cursor: sim.status === 'completed' ? 'pointer' : 'default' }}
                            title={sim.status === 'completed' ? 'Click to view full report' : ''}>
                            <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {sim.question || sim.conditionId?.slice(0, 12)}
                            </td>
                            <td>
                              <span style={{
                                color: sim.status === 'completed' ? '#34d399' : sim.status === 'failed' ? '#f87171' : '#fbbf24',
                                fontWeight: 600,
                              }}>
                                {sim.status === 'completed' ? '✓' : sim.status === 'failed' ? '✗' : '◌'} {sim.status}
                              </span>
                            </td>
                            <td style={{ color: '#a5b4fc', fontWeight: 600 }}>
                              {sim.yesPrice != null ? `${(sim.yesPrice * 100).toFixed(0)}¢` : '—'}
                            </td>
                            <td style={{ fontWeight: 700, color: '#6ee7b7', fontSize: '1rem' }}>
                              {sim.prob != null ? `${(sim.prob * 100).toFixed(1)}%` : '—'}
                            </td>
                            <td style={{
                              fontWeight: 700,
                              color: divergence == null ? '#64748b' : Math.abs(divergence) >= 10 ? '#f59e0b' : '#94a3b8',
                            }}>
                              {divergence != null ? `${divergence > 0 ? '+' : ''}${divergence}pp` : '—'}
                            </td>
                            <td>
                              <span style={{
                                color: conf === 'HIGH' ? '#34d399' : conf === 'MEDIUM' ? '#fbbf24' : '#f87171',
                                fontWeight: 600,
                              }}>{conf || '—'}</span>
                            </td>
                            <td style={{ color: '#a5b4fc' }}>{sim.methodCount || '—'}</td>
                            <td style={{ color: '#a5b4fc', fontSize: '0.72rem', textAlign: 'center' }}>
                              {sim.status === 'completed' ? '📄 View' : '—'}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </StyledTable>
                  </TableWrapper>
                </Card>
              </FullWidth>
            )}

            {/* Assessed Markets */}
            {pipelineData?.assessedMarkets?.length > 0 && (
              <FullWidth>
                <Card $delay="0.4s">
                  <CardTitle>🎯 Assessed Markets ({pipelineData.assessedMarkets.length} candidates)</CardTitle>
                  <Subtitle style={{ textAlign: 'left', margin: '0 0 0.75rem 0', maxWidth: 'none' }}>
                    Markets the Scenario Builder has ranked for MiroFish simulation based on category, suitability, and priority.
                  </Subtitle>
                  <TableWrapper>
                    <StyledTable>
                      <thead>
                        <tr>
                          <th>Question</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>Priority</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pipelineData.assessedMarkets.map(m => (
                          <tr key={m.conditionId}>
                            <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {m.question}
                            </td>
                            <td>
                              <span style={{
                                background: 'rgba(16,185,129,0.1)',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                color: '#6ee7b7',
                                textTransform: 'capitalize',
                              }}>{m.category}</span>
                            </td>
                            <td style={{ fontWeight: 700, color: '#a5b4fc' }}>
                              {m.yesPrice ? `${(parseFloat(m.yesPrice) * 100).toFixed(0)}¢` : '—'}
                            </td>
                            <td>
                              <span style={{
                                fontWeight: 700,
                                color: m.priority >= 80 ? '#fbbf24' : m.priority >= 50 ? '#fb923c' : '#94a3b8',
                              }}>{m.priority}</span>
                            </td>
                            <td style={{ color: '#94a3b8', fontSize: '0.72rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {m.reason || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </StyledTable>
                  </TableWrapper>
                </Card>
              </FullWidth>
            )}

            {!pipelineData && !pipelineLoading && (
              <FullWidth>
                <EmptyState>Loading pipeline data... Click Refresh if this persists.</EmptyState>
              </FullWidth>
            )}
          </Grid>
        )}
      </Container>
    </PageWrapper>

      {/* ═══ Report Modal ═══ */}
      {reportOpen && (
        <ModalOverlay onClick={() => setReportOpen(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            {reportLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <Spinner />
                <p style={{ color: '#94a3b8', marginTop: '1rem' }}>Loading full report...</p>
              </div>
            ) : reportData?.error ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#f87171' }}>
                Error: {reportData.error}
              </div>
            ) : reportData ? (
              <>
                <ModalHeader>
                  <div>
                    <h3 style={{ color: '#e2e8f0', margin: '0 0 0.5rem', fontSize: '1rem', lineHeight: 1.4 }}>
                      {reportData.question}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {reportData.prob != null && (
                        <span style={{ color: '#6ee7b7', fontWeight: 700, fontSize: '1.1rem' }}>
                          MiroFish: {(reportData.prob * 100).toFixed(1)}% YES
                        </span>
                      )}
                      {reportData.yesPrice != null && (
                        <span style={{ color: '#a5b4fc', fontSize: '0.85rem' }}>
                          Market: {(reportData.yesPrice * 100).toFixed(0)}&cent;
                        </span>
                      )}
                      {reportData.confidence && (
                        <span style={{
                          background: reportData.confidence === 'HIGH' ? 'rgba(52,211,153,0.15)' : reportData.confidence === 'MEDIUM' ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)',
                          color: reportData.confidence === 'HIGH' ? '#34d399' : reportData.confidence === 'MEDIUM' ? '#fbbf24' : '#f87171',
                          padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                        }}>
                          {reportData.confidence} confidence
                        </span>
                      )}
                    </div>
                  </div>
                  <ModalClose onClick={() => setReportOpen(false)}>✕ Close</ModalClose>
                </ModalHeader>

                {/* Scenario Report */}
                {reportData.reportMarkdown && (
                  <ReportSection>
                    <ReportSectionTitle>📜 Scenario Analysis Report</ReportSectionTitle>
                    <pre style={{
                      color: '#cbd5e1', fontSize: '0.78rem', lineHeight: 1.6,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                      fontFamily: 'inherit',
                    }}>
                      {reportData.reportMarkdown}
                    </pre>
                  </ReportSection>
                )}

                {/* Reasoning */}
                {reportData.reasoning && (
                  <ReportSection>
                    <ReportSectionTitle>🧠 Probability Reasoning</ReportSectionTitle>
                    <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, lineHeight: 1.6 }}>
                      {reportData.reasoning}
                    </p>
                  </ReportSection>
                )}

                {/* Methods Breakdown */}
                {reportData.methods?.length > 0 && (
                  <ReportSection>
                    <ReportSectionTitle>📊 Analysis Methods ({reportData.methodCount || reportData.methods.length})</ReportSectionTitle>
                    {reportData.methods.map((m, i) => (
                      <div key={i} style={{
                        background: 'rgba(15,15,26,0.4)', borderRadius: '8px',
                        padding: '0.75rem 1rem', marginBottom: '0.5rem',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <MethodPill>{m.name || m.method || `Method ${i + 1}`}</MethodPill>
                          <span style={{ color: '#6ee7b7', fontWeight: 700, fontSize: '0.9rem' }}>
                            {m.prob != null ? `${(m.prob * 100).toFixed(1)}%` : '—'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.72rem', color: '#94a3b8' }}>
                          {m.yesCount != null && (
                            <span>YES: <b style={{ color: '#34d399' }}>{m.yesCount}</b> · NO: <b style={{ color: '#f87171' }}>{m.noCount}</b> · Neutral: {m.neutralCount || 0}</span>
                          )}
                          {m.avgSentiment != null && (
                            <span>Avg Sentiment: <b style={{ color: m.avgSentiment >= 0 ? '#34d399' : '#f87171' }}>{m.avgSentiment.toFixed(3)}</b></span>
                          )}
                          {m.totalInfluence != null && (
                            <span>Influence Score: <b style={{ color: '#a5b4fc' }}>{m.totalInfluence.toLocaleString()}</b></span>
                          )}
                          {m.shift != null && (
                            <span>Shift: <b style={{ color: m.shift > 0 ? '#34d399' : m.shift < 0 ? '#f87171' : '#94a3b8' }}>
                              {m.shift > 0 ? '+' : ''}{(m.shift * 100).toFixed(1)}pp
                            </b> {m.isConverging ? '(converging ✓)' : '(diverging)'}</span>
                          )}
                          {m.firstHalfProb != null && (
                            <span>Early: {(m.firstHalfProb * 100).toFixed(0)}% → Late: {(m.secondHalfProb * 100).toFixed(0)}%</span>
                          )}
                          {(m.postCount || m.totalPosts) != null && (
                            <span>{m.postCount || m.totalPosts} posts analyzed</span>
                          )}
                          {m.weight != null && (
                            <span style={{ color: '#475569' }}>weight: {m.weight.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </ReportSection>
                )}

                {/* Agent Posts */}
                {reportData.agentPosts?.length > 0 && (
                  <ReportSection>
                    <ReportSectionTitle>👥 Agent Debate Posts ({reportData.agentPosts.length})</ReportSectionTitle>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                      {['YES', 'NO', 'NEUTRAL'].map(stance => {
                        const count = reportData.agentPosts.filter(p => (p.stance || '').toUpperCase() === stance).length;
                        return count > 0 && (
                          <span key={stance} style={{
                            fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '6px',
                            background: stance === 'YES' ? 'rgba(52,211,153,0.12)' : stance === 'NO' ? 'rgba(248,113,113,0.12)' : 'rgba(251,191,36,0.12)',
                            color: stance === 'YES' ? '#34d399' : stance === 'NO' ? '#f87171' : '#fbbf24',
                          }}>
                            {stance}: {count}
                          </span>
                        );
                      })}
                    </div>
                    {reportData.agentPosts.map((post, i) => (
                      <AgentPost key={i} $stance={(post.stance || '').toUpperCase()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <AgentName>{post.agent}</AgentName>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            Round {post.round} · {post.followers?.toLocaleString()} followers
                          </span>
                        </div>
                        <p style={{ color: '#cbd5e1', margin: 0, fontSize: '0.78rem', lineHeight: 1.5 }}>
                          {post.content}
                        </p>
                      </AgentPost>
                    ))}
                  </ReportSection>
                )}

                {/* Timestamps */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', color: '#475569', fontSize: '0.7rem', marginTop: '0.5rem' }}>
                  {reportData.startedAt && <span>Started: {new Date(reportData.startedAt).toLocaleString()}</span>}
                  {reportData.completedAt && <span>Completed: {new Date(reportData.completedAt).toLocaleString()}</span>}
                </div>
              </>
            ) : null}
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────
function timeSince(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
