import React from 'react';
import logo2 from '../components/logo/logo1.png';
import { useNavigate } from 'react-router-dom';
import SpectrumSVG from './visuals/SpectrumSVG';

const S = {
  section: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#000',
    color: '#fff',
    padding: '8rem 1.25rem',
    fontFamily: "'Inter', sans-serif",
  },
  logo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
    maxWidth: '600px',
    height: 'auto',
    opacity: 0.1,
    zIndex: 1,
    pointerEvents: 'none',
  },
  content: {
    position: 'relative',
    zIndex: 2,
    maxWidth: '640px',
    margin: '0 auto',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '1.5rem',
  },
  h1: {
    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
    fontWeight: 700,
    letterSpacing: '-0.025em',
    lineHeight: 1.1,
    marginBottom: '1.5rem',
    color: '#f0f0f0',
  },
  sub: {
    fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
    lineHeight: 1.6,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: '2.5rem',
    maxWidth: '520px',
  },
  btns: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  primary: {
    padding: '0.875rem 2rem',
    backgroundColor: '#fff',
    color: '#000',
    border: 'none',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  secondary: {
    padding: '0.875rem 2rem',
    backgroundColor: 'transparent',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
};

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section style={S.section}>
      <img src={logo2} alt="" aria-hidden="true" style={S.logo} />
      <div style={S.content}>
        <p style={S.label}>MarketPlaymaker</p>
        <h1 style={S.h1}>
          Markets move fast.<br />
          Most traders move blind.
        </h1>
        <p style={S.sub}>
          Playbooks, real-time edge detection, and a prediction market scanner that finds mispriced bets before the crowd does.
        </p>
        <div style={S.btns}>
          <button onClick={() => navigate('/signup')} style={S.primary}>
            Get started free
          </button>
          <button onClick={() => navigate('/track-record')} style={S.secondary}>
            See the track record
          </button>
        </div>

        {/* Visual Device: Spectrum — NOISE → EDGE */}
        <div style={{ marginTop: '4rem' }}>
          <SpectrumSVG />
        </div>
      </div>
    </section>
  );
};

export default Hero;
