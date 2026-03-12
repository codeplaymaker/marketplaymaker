import React from 'react';
import {
  Grid, FullWidthSection, Card, CardTitle, StatCard, StatValue, StatLabel,
  Button, Badge, Input, LiveDot, PriceBar, PriceFill,
} from './SharedStyles';

const OverviewTab = React.memo(({ ctx }) => {
  const {
    indEdges, status, trackRecord, picksRecord, performance, connected,
    isRunning, mode, bankrollInput, setBankrollInput, opportunities,
    scanning, scanResult, scanStatus, indSourcesStatus, llmConfigured,
    learningData, positions, startBot, stopBot, triggerScan, autoExecute,
    resetBot, setActiveTab,
  } = ctx;

  return (
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

      {/* Data Source Health */}
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
                background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '0.6rem 0.75rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
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

      {/* Scanner Control */}
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

      {/* Top Independent Edges */}
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
            {indEdges.filter(e => e.edgeQuality >= 35).length === 0 && indEdges.length > 0 && (
              <div style={{
                background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)',
                borderRadius: '8px', padding: '0.6rem 0.75rem', fontSize: '0.78rem', color: '#fbbf24',
              }}>
                ⚠️ No validated edges found yet. Edges backed by ESPN odds, crypto/stock market data, or cross-platform matches are C+ grade or higher. LLM-only edges are D grade — research only.
              </div>
            )}
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
                  borderRadius: '10px', padding: '0.75rem',
                  border: `1px solid ${isBPlus ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.1)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: isBPlus ? 600 : 500, flex: 1 }}>
                      {(edge.question || '').length > 55 ? edge.question.slice(0, 52) + '...' : edge.question}
                    </span>
                    {edge.edgeQuality != null && (
                      <span style={{
                        background: `${gradeColor}22`, color: gradeColor,
                        padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
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
                  {edge.sources && edge.sources.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.35rem' }}>
                      {edge.sources.map((src, si) => {
                        const isHardData = src.key === 'bookmaker' || src.key === 'crypto' || src.key === 'espn' || src.key === 'stock';
                        const chipColor = isHardData ? '#22c55e' : src.key === 'llm' ? '#64748b' : '#a5b4fc';
                        return (
                          <span key={si} style={{
                            background: `${chipColor}15`, color: chipColor,
                            padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem',
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
            {(() => {
              const lowerEdges = [...indEdges]
                .sort((a, b) => (b.edgeQuality || 0) - (a.edgeQuality || 0))
                .filter(e => (e.edgeQuality || 0) < 35);
              if (lowerEdges.length === 0) return null;
              return (
                <div style={{ marginTop: '0.25rem' }}>
                  <div style={{
                    fontSize: '0.7rem', color: '#64748b', padding: '0.4rem 0.5rem',
                    borderTop: '1px solid rgba(99, 102, 241, 0.1)', marginBottom: '0.25rem',
                  }}>
                    {lowerEdges.length} lower-confidence edge{lowerEdges.length !== 1 ? 's' : ''} (D grade — LLM-only, research only)
                  </div>
                  {lowerEdges.slice(0, 3).map((edge, i) => {
                    const gradeColor = edge.edgeGrade === 'C' ? '#fbbf24' : '#ef4444';
                    return (
                      <div key={`low-${i}`} style={{
                        background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '0.5rem 0.75rem',
                        border: '1px solid rgba(100, 116, 139, 0.15)', opacity: 0.6, marginBottom: '0.25rem',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', flex: 1 }}>
                            {(edge.question || '').length > 45 ? edge.question.slice(0, 42) + '...' : edge.question}
                          </span>
                          <span style={{
                            background: `${gradeColor}18`, color: gradeColor,
                            padding: '0.05rem 0.3rem', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 600,
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
  );
});

OverviewTab.displayName = 'OverviewTab';
export default OverviewTab;
