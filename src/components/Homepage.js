import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Hero from './Hero';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, BarChart3, Target, Search, Shield } from 'lucide-react';
import HierarchySVG from './visuals/HierarchySVG';
import ComparisonSVG from './visuals/ComparisonSVG';
import PlotSVG from './visuals/PlotSVG';
import FlowSVG from './visuals/FlowSVG';

const siteUrl = process.env.REACT_APP_SITE_URL || 'https://marketplaymaker.com';

/* ── Data ── */

const FEATURES = [
  {
    icon: Target,
    title: 'ICT Playbooks',
    outcome: 'Know the setup before the candle prints. Battle-tested frameworks for entries, stops, and targets.',
    path: '/playbook',
    Visual: HierarchySVG,
  },
  {
    icon: Search,
    title: 'Edge Scanner',
    outcome: 'Cross-references 20+ bookmakers and prediction markets to surface mispriced bets in real time.',
    path: '/polymarket',
    Visual: ComparisonSVG,
  },
  {
    icon: BarChart3,
    title: 'Trading Journal',
    outcome: 'Every trade logged, graded, and analyzed. See what actually works in your own data.',
    path: '/trading-journal',
    Visual: PlotSVG,
  },
];

const PROCESS = [
  { step: '01', title: 'Scan', desc: 'The bot scans thousands of markets across Polymarket, Kalshi, and traditional bookmakers every 5 minutes.' },
  { step: '02', title: 'Detect', desc: 'Probability models flag edges where market prices diverge from sharp bookmaker consensus.' },
  { step: '03', title: 'Validate', desc: 'Cross-platform signals, news sentiment, and expert forecasts confirm or reject the edge.' },
  { step: '04', title: 'Execute', desc: 'Paper trade or go live. Position sizing, correlation limits, and risk management built in.' },
];

const PROOF_POINTS = [
  { stat: '20+', label: 'Bookmakers cross-referenced' },
  { stat: '5 min', label: 'Scan cycle frequency' },
  { stat: '24/7', label: 'Automated monitoring' },
];

/* ── Shared styles ── */

const T = {
  font: "'Inter', sans-serif",
  dim: 'rgba(255,255,255,0.35)',
  muted: 'rgba(255,255,255,0.45)',
  subtle: 'rgba(255,255,255,0.5)',
};

const section = (extra = {}) => ({
  padding: '8rem 1rem',
  fontFamily: T.font,
  ...extra,
});

const container = (extra = {}) => ({
  maxWidth: '56rem',
  margin: '0 auto',
  ...extra,
});

const label = {
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: T.dim,
  marginBottom: '1rem',
};

const heading = {
  fontSize: 'clamp(1.875rem, 4vw, 3rem)',
  fontWeight: 700,
  letterSpacing: '-0.025em',
  lineHeight: 1.1,
  color: '#fff',
  marginBottom: '4rem',
};

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const go = (path) => navigate(user ? path : '/signup');

  return (
    <>
      <Helmet>
        <title>MarketPlaymaker — Find the edge before the crowd</title>
        <meta name="description" content="Playbooks, real-time edge detection, and a prediction market scanner. Stop guessing. Start seeing mispriced bets before everyone else." />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="MarketPlaymaker — Find the edge before the crowd" />
        <meta property="og:description" content="Playbooks, real-time edge detection, and a prediction market scanner that surfaces mispriced bets." />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MarketPlaymaker — Find the edge before the crowd" />
        <meta name="twitter:description" content="Playbooks, real-time edge detection, and a prediction market scanner that surfaces mispriced bets." />
      </Helmet>

        <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f', color: '#fff', fontFamily: T.font }}>
        <Hero />

        {/* ── Features ── */}
        <section style={section()}>
          <div style={container()}>
            <p style={label}>What you get</p>
            <h2 style={heading}>Tools that show you the edge.</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              {FEATURES.map((f) => {
                const Icon = f.icon;
                const Visual = f.Visual;
                return (
                  <div
                    key={f.title}
                    onClick={() => go(f.path)}
                    onKeyDown={(e) => e.key === 'Enter' && go(f.path)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Go to ${f.title}`}
                    style={{
                      padding: '1.5rem',
                      borderRadius: '0.75rem',
                      border: '1px solid rgba(255,255,255,0.06)',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                  >
                    {/* Visual Device illustration */}
                    <div style={{ margin: '-0.5rem -0.5rem 1rem', display: 'flex', justifyContent: 'center' }}>
                      <Visual width={260} height={160} />
                    </div>
                    <Icon style={{ width: 20, height: 20, marginBottom: '0.75rem', color: T.dim }} />
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: '#fff' }}>{f.title}</h3>
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: T.subtle, margin: 0 }}>{f.outcome}</p>
                    <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255,255,255,0.3)' }}>
                      <span>Explore</span>
                      <ArrowRight style={{ width: 12, height: 12 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Process Flow ── */}
        <section style={section({ backgroundColor: 'rgba(255,255,255,0.015)' })}>
          <div style={container()}>
            <p style={label}>How it works</p>
            <h2 style={heading}>Four steps. No guesswork.</h2>

            {/* Visual Device: Flow connector */}
            <FlowSVG />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
              {PROCESS.map((p) => (
                <div key={p.step}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: 'rgba(255,255,255,0.12)' }}>
                    {p.step}
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#fff' }}>{p.title}</h3>
                  <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: T.muted, margin: 0 }}>{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Proof Points ── */}
        <section style={{ padding: '5rem 1rem', fontFamily: T.font }}>
          <div style={container()}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', textAlign: 'center' }}>
              {PROOF_POINTS.map((p) => (
                <div key={p.label}>
                  <div style={{ fontSize: 'clamp(1.875rem, 4vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.025em', color: '#fff', marginBottom: '0.25rem' }}>
                    {p.stat}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 500, color: T.dim }}>{p.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trust CTA ── */}
        <section style={section()}>
          <div style={container({ maxWidth: '42rem', textAlign: 'center' })}>
            <Shield style={{ width: 24, height: 24, margin: '0 auto 1.5rem', color: 'rgba(255,255,255,0.25)' }} />
            <h2 style={{ ...heading, marginBottom: '1rem' }}>
              Start with paper trades. Go live when you&apos;re ready.
            </h2>
            <p style={{ fontSize: '1rem', lineHeight: 1.6, color: T.muted, marginBottom: '2.5rem' }}>
              Free to explore. No credit card required. See the edge for yourself.
            </p>
            <button
              onClick={() => navigate('/signup')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.875rem 2rem',
                backgroundColor: '#fff',
                color: '#000',
                border: 'none',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: T.font,
              }}
            >
              Create free account
              <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </section>
      </div>
    </>
  );
};

export default HomePage;
