import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Helmet } from 'react-helmet-async';

/* ═══════════════════════════════════════════════════════════
   VISUAL COMMUNICATION — TRAIN SYSTEM
   T = Typography: Inter + JetBrains Mono. Weight hierarchy.
   R = Restraint: 3-color palette only. No decoration.
   A = Alignment: 8px grid. Clean left-align.
   I = Image Treatment: Consistent icon style + gradients.
   N = Negative Space: Generous whitespace. Let ideas breathe.
   ═══════════════════════════════════════════════════════════ */

// ─── ANIMATIONS ───
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(32px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// pulse + shimmer reserved for future use

// ─── TOKENS ───
const T = {
  bg: '#09090b',
  surface: '#111113',
  surfaceHover: '#18181b',
  border: '#27272a',
  text: '#fafafa',
  textMuted: '#a1a1aa',
  textDim: '#71717a',
  accent: '#22d3ee',       // cyan-400
  accentDim: '#0e7490',    // cyan-700
  green: '#4ade80',
  red: '#f87171',
  amber: '#fbbf24',
  gradient: 'linear-gradient(135deg, #22d3ee 0%, #818cf8 50%, #c084fc 100%)',
  gradientText: 'linear-gradient(90deg, #22d3ee, #818cf8, #c084fc)',
};

// ─── LAYOUT ───
const Page = styled.div`
  background: ${T.bg};
  color: ${T.text};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
`;

// ─── HERO ───
const HeroSection = styled.section`
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 6rem 1.5rem 4rem;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -40%;
    left: 50%;
    transform: translateX(-50%);
    width: 800px;
    height: 800px;
    background: radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%);
    pointer-events: none;
  }
`;

const HeroLabel = styled.span`
  display: inline-block;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${T.accent};
  border: 1px solid ${T.accentDim};
  padding: 0.4rem 1rem;
  border-radius: 999px;
  margin-bottom: 2rem;
  animation: ${fadeUp} 0.6s ease-out;
`;

const HeroTitle = styled.h1`
  font-size: clamp(2.5rem, 7vw, 5.5rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin: 0 0 1.5rem;
  max-width: 900px;
  animation: ${fadeUp} 0.6s ease-out 0.1s both;

  span {
    background: ${T.gradientText};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const HeroSub = styled.p`
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: ${T.textMuted};
  max-width: 600px;
  line-height: 1.7;
  margin: 0 0 3rem;
  animation: ${fadeUp} 0.6s ease-out 0.2s both;
`;

const HeroCTA = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  background: ${T.accent};
  color: ${T.bg};
  font-weight: 700;
  font-size: 0.95rem;
  border-radius: 8px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  animation: ${fadeUp} 0.6s ease-out 0.3s both;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(34, 211, 238, 0.3);
  }
`;

// ─── TABLE OF CONTENTS ───
const TOCSection = styled.nav`
  max-width: 800px;
  margin: 0 auto;
  padding: 4rem 1.5rem 6rem;
`;

const TOCTitle = styled.h2`
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: ${T.textDim};
  margin-bottom: 2rem;
`;

const TOCList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

const TOCItem = styled.a`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.25rem 0;
  border-bottom: 1px solid ${T.border};
  text-decoration: none;
  color: ${T.text};
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    color: ${T.accent};
    padding-left: 0.5rem;
  }
`;

const TOCNum = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  color: ${T.textDim};
  min-width: 28px;
`;

const TOCLabel = styled.span`
  font-size: 1.1rem;
  font-weight: 600;
`;

// ─── SECTION WRAPPER ───
const SectionWrapper = styled.section`
  max-width: 900px;
  margin: 0 auto;
  padding: 6rem 1.5rem;
  animation: ${fadeUp} 0.5s ease-out;
`;

const SectionDivider = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1.5rem;
  border-top: 1px solid ${T.border};
`;

const SectionLabel = styled.span`
  display: inline-block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: ${T.accentDim};
  margin-bottom: 0.75rem;
`;

const SectionTitle = styled.h2`
  font-size: clamp(1.8rem, 4vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 0 0 1rem;
`;

const SectionIntro = styled.p`
  font-size: 1.1rem;
  line-height: 1.75;
  color: ${T.textMuted};
  max-width: 640px;
  margin: 0 0 3rem;
`;

// ─── CARDS ───
const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1px;
  background: ${T.border};
  border: 1px solid ${T.border};
  border-radius: 12px;
  overflow: hidden;
  margin: 2rem 0;
`;

const CardItem = styled.div`
  background: ${T.surface};
  padding: 2rem;
  transition: background 0.2s;

  &:hover {
    background: ${T.surfaceHover};
  }
`;

const CardNumber = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  color: ${T.textDim};
  display: block;
  margin-bottom: 0.75rem;
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  line-height: 1.3;
`;

const CardDesc = styled.p`
  font-size: 0.9rem;
  line-height: 1.6;
  color: ${T.textMuted};
  margin: 0;
`;

// ─── NUMBERED LIST (like 10 Life-Changing Ideas) ───
const NumberedItem = styled.div`
  display: flex;
  gap: 1.5rem;
  padding: 2.5rem 0;
  border-bottom: 1px solid ${T.border};
  align-items: flex-start;

  &:last-child {
    border-bottom: none;
  }
`;

const BigNum = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-size: 2.5rem;
  font-weight: 800;
  color: ${T.border};
  line-height: 1;
  min-width: 60px;
  user-select: none;
`;

const ItemContent = styled.div`
  flex: 1;
`;

const ItemTitle = styled.h3`
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  line-height: 1.35;
`;

const ItemDesc = styled.p`
  font-size: 0.95rem;
  line-height: 1.7;
  color: ${T.textMuted};
  margin: 0;
`;

// ─── FLOW DIAGRAM (Visual Device: Flow) ───
const FlowRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 2.5rem 0;
`;

const FlowStep = styled.div`
  background: ${T.surface};
  border: 1px solid ${T.border};
  border-radius: 10px;
  padding: 1rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  min-width: 120px;
`;

const FlowArrow = styled.span`
  color: ${T.textDim};
  font-size: 1.2rem;

  @media (max-width: 640px) {
    transform: rotate(90deg);
  }
`;

// ─── STAGE CARDS (Visual Device: Hierarchy) ───
const StageCard = styled.div`
  position: relative;
  border: 1px solid ${T.border};
  border-radius: 12px;
  padding: 2.5rem 2rem;
  margin-bottom: 1.5rem;
  background: ${T.surface};
  transition: border-color 0.3s;
  overflow: hidden;

  &:hover {
    border-color: ${T.accentDim};
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 3px;
    height: 100%;
    background: ${T.gradient};
    opacity: 0;
    transition: opacity 0.3s;
  }

  &:hover::before {
    opacity: 1;
  }
`;

const StageNum = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${T.accent};
  margin-bottom: 0.75rem;
`;

const StageTitle = styled.h3`
  font-size: 1.35rem;
  font-weight: 800;
  margin: 0 0 0.75rem;
`;

const StageSub = styled.p`
  font-size: 0.85rem;
  color: ${T.textDim};
  font-style: italic;
  margin: 0 0 1rem;
`;

const BulletList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const Bullet = styled.li`
  font-size: 0.9rem;
  color: ${T.textMuted};
  line-height: 1.6;
  padding-left: 1.25rem;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.55em;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${T.accent};
    opacity: 0.6;
  }
`;

// ─── QUOTE (Visual Device: Scale) ───
const QuoteBlock = styled.blockquote`
  border-left: 3px solid ${T.accent};
  padding: 1.5rem 0 1.5rem 2rem;
  margin: 3rem 0;
  background: transparent;
`;

const QuoteText = styled.p`
  font-size: 1.2rem;
  font-weight: 600;
  line-height: 1.6;
  color: ${T.text};
  margin: 0 0 0.5rem;
  font-style: italic;
`;

const QuoteAuthor = styled.span`
  font-size: 0.85rem;
  color: ${T.textDim};
`;

// ─── STAT ROW (Visual Device: Comparison) ───
const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1px;
  background: ${T.border};
  border: 1px solid ${T.border};
  border-radius: 12px;
  overflow: hidden;
  margin: 2.5rem 0;
`;

const StatCell = styled.div`
  background: ${T.surface};
  padding: 2rem;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  background: ${T.gradientText};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: ${T.textDim};
  line-height: 1.4;
`;

// ─── SPECTRUM / CONTINUUM (Visual Device) ───
const Spectrum = styled.div`
  display: flex;
  align-items: stretch;
  border: 1px solid ${T.border};
  border-radius: 12px;
  overflow: hidden;
  margin: 2rem 0;
`;

const SpectrumItem = styled.div`
  flex: 1;
  padding: 1.5rem;
  text-align: center;
  border-right: 1px solid ${T.border};
  background: ${props => props.$active ? T.surfaceHover : T.surface};

  &:last-child {
    border-right: none;
  }
`;

const SpectrumLabel = styled.div`
  font-size: 0.75rem;
  color: ${T.textDim};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.5rem;
`;

const SpectrumValue = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
`;

// ─── LOOP (Visual Device: Loops) ───
const LoopContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 2rem;
  margin: 2rem 0;
  border: 1px solid ${T.border};
  border-radius: 12px;
  background: ${T.surface};
`;

const LoopNode = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.75rem 1.25rem;
  background: ${T.bg};
  border: 1px solid ${T.border};
  border-radius: 8px;
`;

const LoopArrow = styled.span`
  color: ${T.accent};
  font-size: 1.2rem;
`;

// ─── VENN (Visual Device: Venn Diagram) ───
const VennContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: -1rem;
  margin: 2.5rem 0;
  flex-wrap: wrap;
`;

const VennCircle = styled.div`
  width: 180px;
  height: 180px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
  text-align: center;
  padding: 1rem;
  line-height: 1.3;
  background: ${props => props.$color || 'rgba(34,211,238,0.1)'};
  border: 1px solid ${props => props.$border || T.accentDim};
  margin: 0 -1rem;

  @media (max-width: 640px) {
    width: 140px;
    height: 140px;
    font-size: 0.75rem;
  }
`;

// ─── TWO COLUMN ───
const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin: 2rem 0;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ColBox = styled.div`
  border: 1px solid ${T.border};
  border-radius: 12px;
  padding: 2rem;
  background: ${T.surface};
`;

const ColTitle = styled.h4`
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// ─── VISUAL DEVICES GRID ───
const DeviceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1px;
  background: ${T.border};
  border: 1px solid ${T.border};
  border-radius: 12px;
  overflow: hidden;
  margin: 2rem 0;
`;

const DeviceCell = styled.div`
  background: ${T.surface};
  padding: 1.5rem 1rem;
  text-align: center;
  transition: background 0.2s;

  &:hover {
    background: ${T.surfaceHover};
  }
`;

const DeviceIcon = styled.div`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
`;

const DeviceName = styled.div`
  font-size: 0.8rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
`;

const DeviceDesc = styled.div`
  font-size: 0.7rem;
  color: ${T.textDim};
`;

// ─── CTA SECTION ───
const CTASection = styled.section`
  text-align: center;
  padding: 8rem 1.5rem;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%);
    pointer-events: none;
  }
`;

const CTATitle = styled.h2`
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 1rem;
`;

const CTASub = styled.p`
  font-size: 1.1rem;
  color: ${T.textMuted};
  margin: 0 0 2.5rem;
`;

const CTAButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2.5rem;
  background: ${T.text};
  color: ${T.bg};
  font-weight: 700;
  font-size: 1rem;
  border-radius: 8px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(250, 250, 250, 0.15);
  }
`;

// ─── INLINE CODE TAG ───
// Tag component reserved for future use

// ─── SESSION TIME BAR ───
const SessionBarRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin: 2rem 0;
  padding: 2rem;
  background: ${T.surface};
  border-radius: 12px;
  border: 1px solid ${T.border};
`;

const SessionBarItem = styled.div`
  position: relative;
`;

const SessionBarLabel = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${T.textMuted};
  margin-bottom: 0.5rem;
`;

const SessionBarTrack = styled.div`
  position: relative;
  height: 36px;
  background: rgba(255,255,255,0.03);
  border-radius: 6px;
  overflow: visible;
`;

const SessionBarFill = styled.div`
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(0,0,0,0.8);
  letter-spacing: 0.05em;
`;

const SessionBarTime = styled.span`
  position: absolute;
  top: -18px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  font-weight: 700;
  color: ${props => props.$color || T.textDim};
`;

const SessionBarNote = styled.div`
  font-size: 0.75rem;
  color: ${props => props.$color || T.textDim};
  margin-top: 0.4rem;
  font-style: italic;
`;

// ─── PHASE FLOW ───
const PhaseFlow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0;
  margin: 2rem 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid ${T.border};

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const PhaseStep = styled.div`
  flex: 1;
  padding: 1.5rem;
  background: ${T.surface};
  border-right: 1px solid ${T.border};
  position: relative;

  &:last-child { border-right: none; }

  @media (max-width: 768px) {
    border-right: none;
    border-bottom: 1px solid ${T.border};
    &:last-child { border-bottom: none; }
  }
`;

const PhaseNum = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  font-weight: 700;
  color: ${props => props.$color || T.accent};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.5rem;
`;

const PhaseTitle = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: ${T.textMain};
  margin-bottom: 0.5rem;
`;

const PhaseDesc = styled.div`
  font-size: 0.85rem;
  color: ${T.textMuted};
  line-height: 1.6;
`;

// ─── CISD CHECKLIST ───
const ChecklistGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin: 2rem 0;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChecklistBox = styled.div`
  background: ${T.surface};
  border: 1px solid ${T.border};
  border-radius: 12px;
  padding: 1.5rem;
  border-top: 3px solid ${props => props.$color || T.accent};
`;

const ChecklistTitle = styled.div`
  font-weight: 700;
  font-size: 0.95rem;
  color: ${props => props.$color || T.textMain};
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CheckItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.4rem 0;
  font-size: 0.85rem;
  color: ${T.textMuted};
  line-height: 1.5;

  &::before {
    content: '${props => props.$icon || '→'}';
    color: ${props => props.$color || T.accent};
    font-weight: 700;
    flex-shrink: 0;
  }
`;

// ─── NEGATIVE CONDITION BOX ───
const NegativeBox = styled.div`
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1rem 0;
`;

const NegativeTitle = styled.div`
  font-weight: 700;
  font-size: 0.9rem;
  color: ${T.red};
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const NegativeItem = styled.div`
  font-size: 0.85rem;
  color: ${T.textMuted};
  padding: 0.3rem 0;
  padding-left: 1.25rem;
  position: relative;
  line-height: 1.5;

  &::before {
    content: '✕';
    position: absolute;
    left: 0;
    color: ${T.red};
    font-weight: 700;
    font-size: 0.75rem;
  }
`;

// ─── DOT MATRIX ───
const DotMatrix = styled.div`
  display: grid;
  grid-template-columns: 100px repeat(5, 1fr);
  gap: 0;
  margin: 2rem 0;
  background: ${T.surface};
  border-radius: 12px;
  border: 1px solid ${T.border};
  overflow: hidden;
`;

const DotHeader = styled.div`
  padding: 0.75rem;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  font-weight: 700;
  color: ${T.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid ${T.border};
  background: rgba(255,255,255,0.02);
`;

const DotLabel = styled.div`
  padding: 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${props => props.$color || T.textMuted};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid ${T.border};
  border-right: 1px solid ${T.border};
`;

const DotCell = styled.div`
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid ${T.border};
`;

const Dot = styled.div`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${props => props.$color || 'transparent'};
  opacity: ${props => props.$active ? 1 : 0.15};
`;

// ─── CANDLESTICK CHART SYSTEM ───
const ChartContainer = styled.div`
  position: relative;
  background: ${T.surface};
  border: 1px solid ${T.border};
  border-radius: 12px;
  padding: 2rem 1.5rem 1.5rem;
  margin: 1.5rem 0;
  overflow: hidden;
`;

const ChartTitle = styled.div`
  position: absolute;
  top: 0.75rem;
  left: 1rem;
  font-weight: 700;
  font-size: 0.85rem;
  color: ${T.textMain};
`;

const ChartSubtitle = styled.div`
  position: absolute;
  top: 1.7rem;
  left: 1rem;
  font-size: 0.7rem;
  color: ${T.textDim};
  font-style: italic;
`;

const ChartArea = styled.div`
  position: relative;
  height: ${props => props.$h || '220px'};
  margin-top: ${props => props.$mt || '1.5rem'};
  display: flex;
  align-items: flex-end;
  gap: ${props => props.$gap || '4px'};
  padding-bottom: 1.5rem;
`;

const CandleWrap = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: ${props => props.$flex || '0 0 auto'};
  width: ${props => props.$w || '14px'};
  height: 100%;
  justify-content: flex-end;
`;

const CandleBody = styled.div`
  position: absolute;
  width: ${props => props.$w || '12px'};
  bottom: ${props => props.$bottom || '0%'};
  height: ${props => props.$height || '20%'};
  background: ${props => props.$bull ? T.green : props.$empty ? 'transparent' : T.red};
  border: ${props => props.$empty ? `1.5px solid ${T.textDim}` : 'none'};
  border-radius: 1.5px;
  z-index: 2;
`;

const Wick = styled.div`
  position: absolute;
  width: 1.5px;
  bottom: ${props => props.$bottom || '0%'};
  height: ${props => props.$height || '30%'};
  background: ${props => props.$color || T.textDim};
  z-index: 1;
`;

const ChartLine = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: ${props => props.$y || '50%'};
  border-top: 1.5px ${props => props.$style || 'dashed'} ${props => props.$color || 'rgba(255,255,255,0.08)'};
  z-index: 0;
`;

const ChartLabel = styled.div`
  position: absolute;
  font-family: 'JetBrains Mono', monospace;
  font-size: ${props => props.$size || '0.6rem'};
  font-weight: ${props => props.$bold ? '700' : '500'};
  color: ${props => props.$color || T.textDim};
  white-space: nowrap;
  z-index: 3;
`;

const ChartZone = styled.div`
  position: absolute;
  left: ${props => props.$left || '0'};
  right: ${props => props.$right || 'auto'};
  width: ${props => props.$width || 'auto'};
  bottom: ${props => props.$bottom || '0'};
  height: ${props => props.$height || '100%'};
  background: ${props => props.$color || 'rgba(255,255,255,0.03)'};
  border-radius: 4px;
  z-index: 0;
`;

/* Helper: renders a single candle with wick */
const Candle = ({ bull, empty, bodyBottom, bodyHeight, wickBottom, wickHeight, width, bodyWidth, style }) => (
  <CandleWrap $w={width || '14px'} style={style}>
    <Wick $bottom={wickBottom} $height={wickHeight} $color={bull ? T.green : empty ? T.textDim : T.red} />
    <CandleBody $bull={bull} $empty={empty} $bottom={bodyBottom} $height={bodyHeight} $w={bodyWidth} />
  </CandleWrap>
);

// ─── DAY BADGE ───
const DayBadge = styled.span`
  display: inline-block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  margin-right: 0.4rem;
  background: ${props => {
    switch(props.$day) {
      case 'MON': return 'rgba(113,113,122,0.2)';
      case 'TUE': return 'rgba(34,211,238,0.15)';
      case 'WED': return 'rgba(129,140,248,0.15)';
      case 'THU': return 'rgba(74,222,128,0.15)';
      case 'FRI': return 'rgba(251,191,36,0.15)';
      default: return 'rgba(113,113,122,0.1)';
    }
  }};
  color: ${props => {
    switch(props.$day) {
      case 'MON': return T.textDim;
      case 'TUE': return T.accent;
      case 'WED': return '#818cf8';
      case 'THU': return T.green;
      case 'FRI': return T.amber;
      default: return T.textMuted;
    }
  }};
`;

// ─── RATING ───
const Rating = styled.div`
  display: inline-flex;
  gap: 3px;
  margin-left: 0.5rem;
`;

const RatingStar = styled.span`
  color: ${props => props.$filled ? T.amber : T.border};
  font-size: 0.75rem;
`;

const RatingDisplay = ({ rating, max = 5 }) => (
  <Rating>
    {Array.from({ length: max }, (_, i) => (
      <RatingStar key={i} $filled={i < Math.round(rating)}>★</RatingStar>
    ))}
  </Rating>
);

// ═══════════════════════════════════════════════════════════
// PLAYBOOK COMPONENT
// ═══════════════════════════════════════════════════════════

const chapters = [
  { id: 'foundation', num: '01', label: '10 Principles of Market Profiling' },
  { id: 'weekly', num: '02', label: 'Weekly Profile Framework' },
  { id: 'daily', num: '03', label: 'Daily Profile Execution' },
  { id: 'po3', num: '04', label: 'Power of 3 — AMD / OHLC' },
  { id: 'sessions', num: '05', label: 'Session Profiles & Time Windows' },
  { id: 'entries', num: '06', label: 'Entry Models & Setups' },
  { id: 'risk', num: '07', label: 'Risk & Profit Management' },
  { id: 'liquidity', num: '08', label: 'Liquidity & Market Structure' },
  { id: 'pdarrays', num: '09', label: 'PD Arrays Deep Dive' },
  { id: 'killzones', num: '10', label: 'Killzones & ICT Macros' },
  { id: 'smt', num: '11', label: 'SMT Divergence & Correlation' },
  { id: 'ipda', num: '12', label: 'IPDA & Standard Deviations' },
  { id: 'visual', num: '13', label: 'Visual Communication (TRAIN)' },
  { id: 'evidence', num: '14', label: 'The Data Behind It' },
  { id: 'glossary', num: '15', label: 'ICT Quick Reference' },
  { id: 'mssvisual', num: '16', label: 'Structure & Inefficiency Visuals' },
  { id: 'entryeng', num: '17', label: 'Entry & Stop Engineering' },
  { id: 'liqmech', num: '18', label: 'Liquidity Mechanics' },
  { id: 'continnews', num: '19', label: 'Continuation & News Protocol' },
  { id: 'tradelib', num: '20', label: 'Annotated Trade Library' },
];

export default function Playbook() {
  return (
    <Page>
      <Helmet>
        <title>The Playbook — MarketPlayMaker</title>
        <meta name="description" content="A complete trading playbook for crypto and forex. Weekly profiles, daily profiles, Power of 3, session timing, entries, and risk management." />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </Helmet>

      {/* ═══ HERO ═══ */}
      <HeroSection>
        <HeroLabel>MarketPlayMaker × Playbook</HeroLabel>
        <HeroTitle>
          The <span>Trading</span><br />Playbook
        </HeroTitle>
        <HeroSub>
          A systematic framework for profiling crypto and forex markets.
          Weekly structure. Daily execution. Zero guesswork.
          Proven principles from institutional order flow — adapted for you.
        </HeroSub>
        <HeroCTA href="#foundation">Start Reading →</HeroCTA>
      </HeroSection>

      {/* ═══ TABLE OF CONTENTS ═══ */}
      <TOCSection>
        <TOCTitle>Table of Contents</TOCTitle>
        <TOCList>
          {chapters.map(ch => (
            <TOCItem key={ch.id} href={`#${ch.id}`}>
              <TOCNum>{ch.num}</TOCNum>
              <TOCLabel>{ch.label}</TOCLabel>
            </TOCItem>
          ))}
        </TOCList>
      </TOCSection>

      {/* ═══ 01 — FOUNDATION ═══ */}
      <SectionDivider />
      <SectionWrapper id="foundation">
        <SectionLabel>Foundation</SectionLabel>
        <SectionTitle>10 Principles of Market Profiling</SectionTitle>
        <SectionIntro>
          The mental models that underpin every trade. Internalize these
          and the framework becomes instinct — not theory.
        </SectionIntro>

        <NumberedItem>
          <BigNum>01</BigNum>
          <ItemContent>
            <ItemTitle>Markets move in weekly profiles — not random walks</ItemTitle>
            <ItemDesc>
              Every weekly candle follows a structural pattern: accumulation, manipulation,
              then expansion. Learn the three profiles (Classic Expansion, Consolidation
              Reversal, Midweek Reversal) and you&apos;ll know what day to expect what move.
            </ItemDesc>
          </ItemContent>
        </NumberedItem>

        <NumberedItem>
          <BigNum>02</BigNum>
          <ItemContent>
            <ItemTitle>Avoid Monday — always</ItemTitle>
            <ItemDesc>
              Monday is accumulation. No high-impact news, no expansion, no profile data.
              It exists for smart money to build positions. Your job is to observe, not participate.
              The count starts Tuesday.
            </ItemDesc>
          </ItemContent>
        </NumberedItem>

        <NumberedItem>
          <BigNum>03</BigNum>
          <ItemContent>
            <ItemTitle>Time and price are inseparable</ItemTitle>
            <ItemDesc>
              The economic calendar is a form of time. Pair high-impact news releases with
              relevant H4+ PD arrays to establish bias. News is the catalyst — PD arrays
              are the destination.
            </ItemDesc>
          </ItemContent>
        </NumberedItem>

        <NumberedItem>
          <BigNum>04</BigNum>
          <ItemContent>
            <ItemTitle>Manipulation precedes expansion</ItemTitle>
            <ItemDesc>
              Before every real move, smart money engineers liquidity in the opposite direction.
              The Judas swing baits retail into the wrong side. If there&apos;s no manipulation,
              there&apos;s no high-quality setup.
            </ItemDesc>
          </ItemContent>
        </NumberedItem>

        <NumberedItem>
          <BigNum>05</BigNum>
          <ItemContent>
            <ItemTitle>Change in state of delivery confirms direction</ItemTitle>
            <ItemDesc>
              A candle close above/below a breaker block on H1-H4 (weekly) or M15-M30 (daily)
              confirms the reversal. Until this happens, you&apos;re speculating. After it happens,
              you&apos;re executing with confluence.
            </ItemDesc>
          </ItemContent>
        </NumberedItem>

        <NumberedItem>
          <BigNum>06</BigNum>
          <ItemContent>
            <ItemTitle>Premium and discount are the only zones that matter</ItemTitle>
            <ItemDesc>
              Every PD array (order blocks, breakers, FVGs, rejection blocks) lives in either
              premium or discount relative to equilibrium. Buy discount, sell premium.
              This is the entire edge — everything else is refinement.
            </ItemDesc>
          </ItemContent>
        </NumberedItem>

        <NumberedItem>
          <BigNum>07</BigNum>
          <ItemContent>
            <ItemTitle>Power of 3 unfolds on every timeframe</ItemTitle>
            <ItemDesc>
              Accumulation → Manipulation → Distribution. It happens monthly, weekly, daily,
              and intraday. The daily PO3 from midnight open is the most consistent and
              tradeable pattern for crypto and forex.
            </ItemDesc>
          </ItemContent>
        </NumberedItem>

        <NumberedItem>
          <BigNum>08</BigNum>
          <ItemContent>
            <ItemTitle>Patience creates the edge — not frequency</ItemTitle>
            <ItemDesc>
              You cannot have a daily profile without a weekly profile. High-probability daily
              setups only exist within a defined weekly context. Wait for the profile,
              wait for the day, wait for the session.
            </ItemDesc>
          </ItemContent>
        </NumberedItem>

        <NumberedItem>
          <BigNum>09</BigNum>
          <ItemContent>
            <ItemTitle>Intermarket analysis filters out noise</ItemTitle>
            <ItemDesc>
              When a correlated pair runs a Classic Expansion while yours runs a Midweek
              Reversal, Friday becomes a TGIF candidate. Use SMT divergence for confluence.
              Cross-reference, don&apos;t isolate.
            </ItemDesc>
          </ItemContent>
        </NumberedItem>

        <NumberedItem>
          <BigNum>10</BigNum>
          <ItemContent>
            <ItemTitle>No negative condition, no trade</ItemTitle>
            <ItemDesc>
              Every profile has defined negative conditions. Two consecutive directional candles
              without manipulation? No profile. No H4+ PD array engagement? No profile.
              Knowing when NOT to trade is the real skill.
            </ItemDesc>
          </ItemContent>
        </NumberedItem>
      </SectionWrapper>

      {/* ═══ 02 — WEEKLY PROFILES ═══ */}
      <SectionDivider />
      <SectionWrapper id="weekly">
        <SectionLabel>Framework</SectionLabel>
        <SectionTitle>Weekly Profile Framework</SectionTitle>
        <SectionIntro>
          Three profiles define how every weekly candle forms. Identify which profile
          is active and you know which days to trade, which direction, and when to
          stop.
        </SectionIntro>

        {/* Visual Device: Comparison — side by side */}
        <CardGrid>
          <CardItem>
            <CardNumber>Profile 01</CardNumber>
            <CardTitle>Classic Expansion</CardTitle>
            <CardDesc>
              <DayBadge $day="MON">MON</DayBadge> Accumulation<br />
              <DayBadge $day="TUE">TUE</DayBadge> Manipulation → reversal at H4+ PD array<br />
              <DayBadge $day="WED">WED</DayBadge> <DayBadge $day="THU">THU</DayBadge> Expansion toward weekly draw<br />
              <DayBadge $day="FRI">FRI</DayBadge> TGIF — return into range (0.20–0.30 fib)
            </CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Profile 02</CardNumber>
            <CardTitle>Consolidation Reversal</CardTitle>
            <CardDesc>
              <DayBadge $day="MON">MON</DayBadge> <DayBadge $day="TUE">TUE</DayBadge> <DayBadge $day="WED">WED</DayBadge> Consolidation within range<br />
              <DayBadge $day="THU">THU</DayBadge> Manipulation at external range → reversal<br />
              <DayBadge $day="FRI">FRI</DayBadge> Expansion continuation
            </CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Profile 03</CardNumber>
            <CardTitle>Midweek Reversal</CardTitle>
            <CardDesc>
              <DayBadge $day="MON">MON</DayBadge> <DayBadge $day="TUE">TUE</DayBadge> Accumulation or retracement<br />
              <DayBadge $day="WED">WED</DayBadge> Manipulation at H4+ PD array → reversal<br />
              <DayBadge $day="THU">THU</DayBadge> <DayBadge $day="FRI">FRI</DayBadge> Expansion continuation
            </CardDesc>
          </CardItem>
        </CardGrid>

        <QuoteBlock>
          <QuoteText>&ldquo;High-probability daily profile is anticipated when in line with a defined weekly profile — you cannot have one without the other.&rdquo;</QuoteText>
          <QuoteAuthor>— @amtrades, Market Profiling Guide</QuoteAuthor>
        </QuoteBlock>

        {/* Visual Device: Hierarchy — PD Array Framework */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          PD Array Framework
        </h3>
        <p style={{ color: T.textMuted, fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          All profiles resolve at relevant H4+ PD arrays. These are the institutional
          price magnets that define the destination.
        </p>

        <TwoCol>
          <ColBox>
            <ColTitle>
              <span style={{ color: T.green }}>▲</span> Discount Arrays (Buy)
            </ColTitle>
            <BulletList>
              <Bullet>External low / SSL (sellside liquidity)</Bullet>
              <Bullet>+RB — Rejection block</Bullet>
              <Bullet>+OB — Order block</Bullet>
              <Bullet>+BRK — Breaker block</Bullet>
              <Bullet>+FVG — Fair value gap</Bullet>
            </BulletList>
          </ColBox>
          <ColBox>
            <ColTitle>
              <span style={{ color: T.red }}>▼</span> Premium Arrays (Sell)
            </ColTitle>
            <BulletList>
              <Bullet>External high / BSL (buyside liquidity)</Bullet>
              <Bullet>−RB — Rejection block</Bullet>
              <Bullet>−OB — Order block</Bullet>
              <Bullet>−BRK — Breaker block</Bullet>
              <Bullet>−FVG — Fair value gap</Bullet>
            </BulletList>
          </ColBox>
        </TwoCol>

        {/* Visual Device: Continuum — Day ratings */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          Day-of-Week Probability Ratings
        </h3>

        <CardGrid>
          <CardItem>
            <CardNumber>Classic Expansion</CardNumber>
            <CardTitle>
              <DayBadge $day="TUE">TUE</DayBadge> 4/5 <RatingDisplay rating={4} />
            </CardTitle>
            <CardDesc>Expansion candidate. Use Monday data for reversal speculation.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Classic Expansion</CardNumber>
            <CardTitle>
              <DayBadge $day="WED">WED</DayBadge> 5/5 <RatingDisplay rating={5} />
            </CardTitle>
            <CardDesc>Ideal day. Previously confirmed reversal + bulk of weekly expansion.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Classic Expansion</CardNumber>
            <CardTitle>
              <DayBadge $day="THU">THU</DayBadge> 4.5/5 <RatingDisplay rating={4.5} />
            </CardTitle>
            <CardDesc>Continuation to weekly draw. London + NY AM session.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Midweek Reversal</CardNumber>
            <CardTitle>
              <DayBadge $day="WED">WED</DayBadge> 3.5/5 <RatingDisplay rating={3.5} />
            </CardTitle>
            <CardDesc>Reversal day. Speculating manipulation at H4+ PD array.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Midweek Reversal</CardNumber>
            <CardTitle>
              <DayBadge $day="THU">THU</DayBadge> 5/5 <RatingDisplay rating={5} />
            </CardTitle>
            <CardDesc>Bulk of range expansion. Previously confirmed reversal.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Consolidation Reversal</CardNumber>
            <CardTitle>
              <DayBadge $day="THU">THU</DayBadge> 4/5 <RatingDisplay rating={4} />
            </CardTitle>
            <CardDesc>Reversal at external consolidation range.</CardDesc>
          </CardItem>
        </CardGrid>
      </SectionWrapper>

      {/* ═══ 03 — DAILY PROFILES ═══ */}
      <SectionDivider />
      <SectionWrapper id="daily">
        <SectionLabel>Execution</SectionLabel>
        <SectionTitle>Daily Profile Execution</SectionTitle>
        <SectionIntro>
          The weekly profile gives you bias. The daily profile gives you entries.
          Three intraday profiles map the formation of each daily candle — each
          one with a defined session structure, confirmation triggers, and negative conditions.
        </SectionIntro>

        {/* ─── TIME VARIABLE ─── */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '2rem 0 1rem' }}>
          Session Time Windows (EST)
        </h3>
        <p style={{ color: T.textMuted, fontSize: '0.9rem', marginBottom: '1rem' }}>
          Each profile unfolds across defined session windows. The reversal forms in London.
          The expansion delivers in New York. Knowing the exact windows is non-negotiable.
        </p>

        <SessionBarRow>
          <SessionBarItem>
            <SessionBarLabel>London &mdash; All Assets (Reversal Window)</SessionBarLabel>
            <SessionBarTrack>
              <SessionBarTime $color="#ef4444" style={{ left: '8.3%' }}>2:00</SessionBarTime>
              <SessionBarTime $color="#ef4444" style={{ left: '20.8%' }}>5:00</SessionBarTime>
              <SessionBarFill style={{ left: '8.3%', width: '12.5%', background: 'rgba(239,68,68,0.35)' }}>
                london
              </SessionBarFill>
            </SessionBarTrack>
            <SessionBarNote $color="#ef4444">Intraday reversal forms &mdash; &ge; H1 PDA engagement</SessionBarNote>
          </SessionBarItem>

          <SessionBarItem>
            <SessionBarLabel>New York &mdash; Forex (Expansion Window)</SessionBarLabel>
            <SessionBarTrack>
              <SessionBarTime $color={T.green} style={{ left: '29.2%' }}>7:00</SessionBarTime>
              <SessionBarTime $color={T.green} style={{ left: '41.7%' }}>10:00</SessionBarTime>
              <SessionBarFill style={{ left: '29.2%', width: '12.5%', background: 'rgba(74,222,128,0.35)' }}>
                new york &bull; forex
              </SessionBarFill>
              <SessionBarFill style={{ left: '41.7%', width: '8.3%', background: 'rgba(74,222,128,0.12)' }}>
              </SessionBarFill>
              <SessionBarTime style={{ left: '50%', color: T.textDim }}>12:00</SessionBarTime>
            </SessionBarTrack>
            <SessionBarNote $color={T.green}>Majority of daily range &mdash; potential continuation to 12:00</SessionBarNote>
          </SessionBarItem>

          <SessionBarItem>
            <SessionBarLabel>New York &mdash; Indices (Expansion Window)</SessionBarLabel>
            <SessionBarTrack>
              <SessionBarTime $color="#818cf8" style={{ left: '35.4%' }}>8:30</SessionBarTime>
              <SessionBarTime $color="#818cf8" style={{ left: '50%' }}>12:00</SessionBarTime>
              <SessionBarFill style={{ left: '35.4%', width: '14.6%', background: 'rgba(129,140,248,0.35)' }}>
                new york &bull; indices
              </SessionBarFill>
              <SessionBarFill style={{ left: '50%', width: '16.7%', background: 'rgba(129,140,248,0.12)' }}>
              </SessionBarFill>
              <SessionBarTime style={{ left: '66.7%', color: T.textDim }}>16:00</SessionBarTime>
            </SessionBarTrack>
            <SessionBarNote $color="#818cf8">Majority of daily range &mdash; potential continuation to 16:00</SessionBarNote>
          </SessionBarItem>
        </SessionBarRow>

        {/* ─── H1 PD ARRAY FRAMEWORK (from p.59) ─── */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          Framework: &ge; H1 PD Arrays
        </h3>
        <p style={{ color: T.textMuted, fontSize: '0.9rem', marginBottom: '1rem' }}>
          All daily profiles resolve at relevant H1+ PD arrays. The midnight opening price
          (2:00&ndash;5:00) divides premium from discount. Engagement above = premium. Below = discount.
        </p>

        <TwoCol>
          <ColBox>
            <ColTitle>
              <span style={{ color: T.red }}>▼</span> Premium &mdash; engagement above midnight open
            </ColTitle>
            <BulletList>
              <Bullet><strong>External High</strong> &mdash; BSL (buyside liquidity)</Bullet>
              <Bullet><strong>&minus;RB</strong> &mdash; Rejection Block</Bullet>
              <Bullet><strong>&minus;OB</strong> &mdash; Order Block</Bullet>
              <Bullet><strong>&minus;BRK</strong> &mdash; Breaker Block</Bullet>
              <Bullet><strong>&minus;FVG</strong> &mdash; Fair Value Gap</Bullet>
            </BulletList>
          </ColBox>
          <ColBox>
            <ColTitle>
              <span style={{ color: T.green }}>▲</span> Discount &mdash; engagement below midnight open
            </ColTitle>
            <BulletList>
              <Bullet><strong>External Low</strong> &mdash; SSL (sellside liquidity)</Bullet>
              <Bullet><strong>+RB</strong> &mdash; Rejection Block</Bullet>
              <Bullet><strong>+OB</strong> &mdash; Order Block</Bullet>
              <Bullet><strong>+BRK</strong> &mdash; Breaker Block</Bullet>
              <Bullet><strong>+FVG</strong> &mdash; Fair Value Gap</Bullet>
            </BulletList>
          </ColBox>
        </TwoCol>

        <p style={{ color: T.textDim, fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', margin: '0.5rem 0 0' }}>
          &mdash; equilibrium divides premium from discount &mdash;
        </p>

        {/* PDA Framework Candle Visuals (from p.59) — rebuilt with distinct patterns */}
        <ChartContainer style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: T.textMain, marginBottom: '0.15rem' }}>H1 PD Array Patterns</div>
          <div style={{ fontSize: '0.7rem', color: T.textDim, marginBottom: '1.5rem' }}>engagement above midnight open [2:00–5:00] = premium | below = discount</div>

          {/* ─── PREMIUM ROW ─── */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: T.red, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em' }}>PREMIUM</div>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${T.red}, transparent)`, marginLeft: '0.75rem' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
            {/* External High / BSL — sweep above highs then reversal */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '1rem 0.5rem 0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.15rem' }}>external high</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', fontWeight: 700, color: T.red, marginBottom: '0.75rem' }}>BSL</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 3, height: 90 }}>
                {/* Rally up */}
                <div style={{ position: 'relative', width: 10, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 0, width: 2, height: 55, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 8, width: 8, height: 35, background: T.green, borderRadius: 1 }} />
                </div>
                <div style={{ position: 'relative', width: 10, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 20, width: 2, height: 60, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 30, width: 8, height: 35, background: T.green, borderRadius: 1 }} />
                </div>
                {/* Sweep candle — long upper wick */}
                <div style={{ position: 'relative', width: 12, height: 90 }}>
                  <div style={{ position: 'absolute', left: 5, bottom: 15, width: 2, height: 72, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 15, width: 10, height: 28, background: T.red, borderRadius: 1.5 }} />
                </div>
                {/* Bearish follow */}
                <div style={{ position: 'relative', width: 10, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 5, width: 2, height: 42, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 5, width: 8, height: 28, background: T.red, borderRadius: 1 }} />
                </div>
              </div>
              <div style={{ fontSize: '0.55rem', color: T.textDim, marginTop: '0.5rem' }}>sweep + reverse</div>
            </div>

            {/* Rejection Block — candle with massive upper wick */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '1rem 0.5rem 0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.15rem' }}>rejection block</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', fontWeight: 700, color: T.red, marginBottom: '0.75rem' }}>&minus;RB</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 3, height: 90 }}>
                <div style={{ position: 'relative', width: 10, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 5, width: 2, height: 50, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 10, width: 8, height: 30, background: T.green, borderRadius: 1 }} />
                </div>
                {/* RB candle — tiny body, massive upper wick */}
                <div style={{ position: 'relative', width: 12, height: 90 }}>
                  <div style={{ position: 'absolute', left: 5, bottom: 25, width: 2, height: 62, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 25, width: 10, height: 14, background: T.red, borderRadius: 1.5 }} />
                  <div style={{ position: 'absolute', left: -2, bottom: 25, width: 16, height: 14, border: `1px dashed rgba(239,68,68,0.4)`, borderRadius: 3 }} />
                </div>
                <div style={{ position: 'relative', width: 10, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 0, width: 2, height: 35, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 0, width: 8, height: 22, background: T.red, borderRadius: 1 }} />
                </div>
              </div>
              <div style={{ fontSize: '0.55rem', color: T.textDim, marginTop: '0.5rem' }}>upper wick rejection</div>
            </div>

            {/* Order Block — last bullish candle before displacement down */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '1rem 0.5rem 0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.15rem' }}>order block</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', fontWeight: 700, color: T.red, marginBottom: '0.75rem' }}>&minus;OB</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 3, height: 90 }}>
                <div style={{ position: 'relative', width: 10, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 20, width: 2, height: 45, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 25, width: 8, height: 28, background: T.green, borderRadius: 1 }} />
                </div>
                {/* THE order block candle — bullish, highlighted */}
                <div style={{ position: 'relative', width: 12, height: 90 }}>
                  <div style={{ position: 'absolute', left: 5, bottom: 35, width: 2, height: 50, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 40, width: 10, height: 32, background: T.green, borderRadius: 1.5 }} />
                  <div style={{ position: 'absolute', left: -2, bottom: 38, width: 16, height: 36, border: `1px dashed rgba(239,68,68,0.5)`, borderRadius: 3 }} />
                </div>
                {/* Strong displacement down */}
                <div style={{ position: 'relative', width: 11, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 5, width: 2, height: 65, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 5, width: 9, height: 45, background: T.red, borderRadius: 1 }} />
                </div>
              </div>
              <div style={{ fontSize: '0.55rem', color: T.textDim, marginTop: '0.5rem' }}>last bull before drop</div>
            </div>

            {/* Breaker Block — failed OB becomes resistance */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '1rem 0.5rem 0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.15rem' }}>breaker block</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', fontWeight: 700, color: T.red, marginBottom: '0.75rem' }}>&minus;BRK</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 2, height: 90 }}>
                {/* Initial move up */}
                <div style={{ position: 'relative', width: 9, height: 90 }}>
                  <div style={{ position: 'absolute', left: 3, bottom: 10, width: 2, height: 40, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 15, width: 7, height: 25, background: T.green, borderRadius: 1 }} />
                </div>
                {/* Pullback */}
                <div style={{ position: 'relative', width: 9, height: 90 }}>
                  <div style={{ position: 'absolute', left: 3, bottom: 5, width: 2, height: 40, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 5, width: 7, height: 22, background: T.red, borderRadius: 1 }} />
                </div>
                {/* Break above then fail */}
                <div style={{ position: 'relative', width: 10, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 20, width: 2, height: 55, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 30, width: 8, height: 30, background: T.green, borderRadius: 1 }} />
                </div>
                {/* Failure — bearish engulfing */}
                <div style={{ position: 'relative', width: 11, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 2, width: 2, height: 70, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 2, width: 9, height: 48, background: T.red, borderRadius: 1 }} />
                  <div style={{ position: 'absolute', left: -2, bottom: 28, width: 15, height: 22, border: `1px dashed rgba(239,68,68,0.5)`, borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ fontSize: '0.55rem', color: T.textDim, marginTop: '0.5rem' }}>failed OB = resistance</div>
            </div>

            {/* Fair Value Gap — gap between candle 1 high and candle 3 low */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '1rem 0.5rem 0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.15rem' }}>fair value gap</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', fontWeight: 700, color: T.red, marginBottom: '0.75rem' }}>&minus;FVG</div>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 4, height: 90 }}>
                {/* Candle 1 — bullish */}
                <div style={{ position: 'relative', width: 10, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 20, width: 2, height: 40, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 25, width: 8, height: 25, background: T.green, borderRadius: 1 }} />
                </div>
                {/* Candle 2 — big bearish displacement */}
                <div style={{ position: 'relative', width: 12, height: 90 }}>
                  <div style={{ position: 'absolute', left: 5, bottom: 5, width: 2, height: 80, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 5, width: 10, height: 55, background: T.red, borderRadius: 1.5 }} />
                </div>
                {/* Candle 3 — continuation */}
                <div style={{ position: 'relative', width: 10, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 0, width: 2, height: 30, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 0, width: 8, height: 18, background: T.red, borderRadius: 1 }} />
                </div>
                {/* FVG gap highlight */}
                <div style={{ position: 'absolute', left: '15%', right: '15%', bottom: 18, height: 7, background: 'rgba(239,68,68,0.2)', border: `1px solid rgba(239,68,68,0.4)`, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: '0.55rem', color: T.textDim, marginTop: '0.5rem' }}>imbalance gap</div>
            </div>
          </div>

          {/* ─── EQUILIBRIUM LINE ─── */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '0.25rem 0' }}>
            <div style={{ flex: 1, height: 0, borderTop: `1.5px dashed rgba(255,255,255,0.15)` }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: T.textDim, padding: '0 0.75rem' }}>equilibrium</span>
            <div style={{ flex: 1, height: 0, borderTop: `1.5px dashed rgba(255,255,255,0.15)` }} />
          </div>

          {/* ─── DISCOUNT ROW ─── */}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: T.green, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em' }}>DISCOUNT</div>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${T.green}, transparent)`, marginLeft: '0.75rem' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
            {/* External Low / SSL — sweep lows then reverse up */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '1rem 0.5rem 0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.15rem' }}>external low</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', fontWeight: 700, color: T.green, marginBottom: '0.75rem' }}>SSL</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 3, height: 90 }}>
                <div style={{ position: 'relative', width: 10, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 30, width: 2, height: 55, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 40, width: 8, height: 35, background: T.red, borderRadius: 1 }} />
                </div>
                <div style={{ position: 'relative', width: 10, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 10, width: 2, height: 55, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 20, width: 8, height: 35, background: T.red, borderRadius: 1 }} />
                </div>
                {/* Sweep candle — long lower wick */}
                <div style={{ position: 'relative', width: 12, height: 90 }}>
                  <div style={{ position: 'absolute', left: 5, bottom: 0, width: 2, height: 70, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 42, width: 10, height: 28, background: T.green, borderRadius: 1.5 }} />
                </div>
                <div style={{ position: 'relative', width: 10, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 40, width: 2, height: 42, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 50, width: 8, height: 28, background: T.green, borderRadius: 1 }} />
                </div>
              </div>
              <div style={{ fontSize: '0.55rem', color: T.textDim, marginTop: '0.5rem' }}>sweep + reverse</div>
            </div>

            {/* +RB — massive lower wick rejection */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '1rem 0.5rem 0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.15rem' }}>rejection block</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', fontWeight: 700, color: T.green, marginBottom: '0.75rem' }}>+RB</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 3, height: 90 }}>
                <div style={{ position: 'relative', width: 10, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 25, width: 2, height: 50, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 40, width: 8, height: 30, background: T.red, borderRadius: 1 }} />
                </div>
                {/* RB candle — tiny body near top, massive lower wick */}
                <div style={{ position: 'relative', width: 12, height: 90 }}>
                  <div style={{ position: 'absolute', left: 5, bottom: 0, width: 2, height: 62, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 48, width: 10, height: 14, background: T.green, borderRadius: 1.5 }} />
                  <div style={{ position: 'absolute', left: -2, bottom: 46, width: 16, height: 18, border: `1px dashed rgba(74,222,128,0.5)`, borderRadius: 3 }} />
                </div>
                <div style={{ position: 'relative', width: 10, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 45, width: 2, height: 40, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 55, width: 8, height: 22, background: T.green, borderRadius: 1 }} />
                </div>
              </div>
              <div style={{ fontSize: '0.55rem', color: T.textDim, marginTop: '0.5rem' }}>lower wick rejection</div>
            </div>

            {/* +OB — last bear candle before displacement up */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '1rem 0.5rem 0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.15rem' }}>order block</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', fontWeight: 700, color: T.green, marginBottom: '0.75rem' }}>+OB</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 3, height: 90 }}>
                <div style={{ position: 'relative', width: 10, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 25, width: 2, height: 45, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 30, width: 8, height: 28, background: T.red, borderRadius: 1 }} />
                </div>
                {/* THE order block — bearish, highlighted */}
                <div style={{ position: 'relative', width: 12, height: 90 }}>
                  <div style={{ position: 'absolute', left: 5, bottom: 5, width: 2, height: 48, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 5, width: 10, height: 32, background: T.red, borderRadius: 1.5 }} />
                  <div style={{ position: 'absolute', left: -2, bottom: 3, width: 16, height: 36, border: `1px dashed rgba(74,222,128,0.5)`, borderRadius: 3 }} />
                </div>
                {/* Strong displacement up */}
                <div style={{ position: 'relative', width: 11, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 15, width: 2, height: 70, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 35, width: 9, height: 48, background: T.green, borderRadius: 1 }} />
                </div>
              </div>
              <div style={{ fontSize: '0.55rem', color: T.textDim, marginTop: '0.5rem' }}>last bear before rally</div>
            </div>

            {/* +BRK — failed bearish OB becomes support */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '1rem 0.5rem 0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.15rem' }}>breaker block</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', fontWeight: 700, color: T.green, marginBottom: '0.75rem' }}>+BRK</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 2, height: 90 }}>
                <div style={{ position: 'relative', width: 9, height: 90 }}>
                  <div style={{ position: 'absolute', left: 3, bottom: 35, width: 2, height: 45, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 45, width: 7, height: 25, background: T.red, borderRadius: 1 }} />
                </div>
                <div style={{ position: 'relative', width: 9, height: 90 }}>
                  <div style={{ position: 'absolute', left: 3, bottom: 35, width: 2, height: 42, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 50, width: 7, height: 22, background: T.green, borderRadius: 1 }} />
                </div>
                {/* Break below then fail */}
                <div style={{ position: 'relative', width: 10, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 5, width: 2, height: 55, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 5, width: 8, height: 30, background: T.red, borderRadius: 1 }} />
                </div>
                {/* Failure — bullish engulfing */}
                <div style={{ position: 'relative', width: 11, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 10, width: 2, height: 72, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 30, width: 9, height: 50, background: T.green, borderRadius: 1 }} />
                  <div style={{ position: 'absolute', left: -2, bottom: 8, width: 15, height: 22, border: `1px dashed rgba(74,222,128,0.5)`, borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ fontSize: '0.55rem', color: T.textDim, marginTop: '0.5rem' }}>failed OB = support</div>
            </div>

            {/* +FVG — gap between candle 1 low and candle 3 high */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '1rem 0.5rem 0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.15rem' }}>fair value gap</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', fontWeight: 700, color: T.green, marginBottom: '0.75rem' }}>+FVG</div>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 4, height: 90 }}>
                <div style={{ position: 'relative', width: 10, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 30, width: 2, height: 40, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 38, width: 8, height: 25, background: T.red, borderRadius: 1 }} />
                </div>
                {/* big bullish displacement */}
                <div style={{ position: 'relative', width: 12, height: 90 }}>
                  <div style={{ position: 'absolute', left: 5, bottom: 5, width: 2, height: 80, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 25, width: 10, height: 55, background: T.green, borderRadius: 1.5 }} />
                </div>
                <div style={{ position: 'relative', width: 10, height: 90 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 55, width: 2, height: 32, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 62, width: 8, height: 20, background: T.green, borderRadius: 1 }} />
                </div>
                {/* FVG gap highlight */}
                <div style={{ position: 'absolute', left: '15%', right: '15%', bottom: 55, height: 8, background: 'rgba(74,222,128,0.2)', border: `1px solid rgba(74,222,128,0.4)`, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: '0.55rem', color: T.textDim, marginTop: '0.5rem' }}>imbalance gap</div>
            </div>
          </div>
        </ChartContainer>

        {/* ═══ DAILY PROFILE 01 — LONDON REVERSAL ═══ */}
        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '3rem 0 0.5rem', color: T.accent }}>
          Daily Profile 01 &mdash; London Reversal
        </h3>
        <p style={{ color: T.textMuted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          The most versatile profile &mdash; works on all assets (crypto, forex, indices).
          London creates the reversal, New York delivers the expansion.
        </p>

        {/* Bullish 3-Phase Flow */}
        <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '2rem 0 1rem', color: T.green }}>
          ▲ Bullish London Reversal
        </h4>

        <PhaseFlow>
          <PhaseStep>
            <PhaseNum $color="#ef4444">Phase 1 &mdash; London</PhaseNum>
            <PhaseTitle>Reversal (2:00&ndash;5:00)</PhaseTitle>
            <PhaseDesc>
              Price dips below midnight open &mdash; <strong>protraction / Judas swing</strong> into discount.
              Tags &ge; H1 PDA [discount]. London low forms.
              <br /><br />
              <span style={{ color: T.green, fontWeight: 600 }}>Key:</span> Reversal from discount PDA
            </PhaseDesc>
          </PhaseStep>
          <PhaseStep>
            <PhaseNum $color={T.green}>Phase 2 &mdash; New York</PhaseNum>
            <PhaseTitle>Expansion (7:00&ndash;12:00)</PhaseTitle>
            <PhaseDesc>
              Bullish order flow from London low. Clean stair-step M15 candles upward.
              <strong>Intraday expansion</strong> toward bullish daily draw on liquidity.
              <br /><br />
              <span style={{ color: T.green, fontWeight: 600 }}>Key:</span> Majority of daily range formed here
            </PhaseDesc>
          </PhaseStep>
          <PhaseStep>
            <PhaseNum $color="#818cf8">Phase 3 &mdash; Entry Range</PhaseNum>
            <PhaseTitle>Retracement Entries</PhaseTitle>
            <PhaseDesc>
              Retracements <strong>towards London reversal low</strong> become buying opportunities during NY.
              <br /><br />
              Use <strong>internal M15&ndash;H1 PD arrays</strong> (breaker, OB, FVG).
              <br />Optional: Fib levels for added confluence.
            </PhaseDesc>
          </PhaseStep>
        </PhaseFlow>

        {/* Bullish London Reversal Chart (from p.61 + p.62 + p.63) */}
        <ChartContainer>
          <ChartTitle style={{ color: T.green }}>▲ Bullish London Reversal</ChartTitle>
          <ChartSubtitle>daily candle + M15 profile &mdash; OLHC formation</ChartSubtitle>
          {/* Midnight open line */}
          <ChartLine $y="55%" $color="rgba(255,255,255,0.1)" $style="dashed" />
          <ChartLabel $color={T.textDim} $size="0.55rem" style={{ right: '0.5rem', bottom: '56%' }}>0:00 midnight open</ChartLabel>
          {/* Judas swing zone */}
          <ChartZone $left="18%" $width="18%" $bottom="0" $height="55%" $color="rgba(239,68,68,0.06)" />
          <ChartLabel $color="rgba(239,68,68,0.6)" $size="0.55rem" style={{ left: '20%', top: '3rem' }}>london</ChartLabel>
          {/* NY expansion zone */}
          <ChartZone $left="52%" $width="35%" $bottom="55%" $height="40%" $color="rgba(74,222,128,0.04)" />
          <ChartLabel $color="rgba(74,222,128,0.6)" $size="0.55rem" style={{ left: '60%', top: '3rem' }}>new york</ChartLabel>
          {/* Key labels */}
          <ChartLabel $color={T.green} $size="0.55rem" $bold style={{ left: '0.5rem', top: '3rem' }}>bullish daily draw ↑</ChartLabel>
          <ChartLabel $color={T.red} $size="0.55rem" style={{ left: '0.5rem', bottom: '1.8rem' }}>london low</ChartLabel>
          <ChartLabel $color="#ef4444" $size="0.5rem" style={{ left: '20%', bottom: '1.8rem' }}>&ge; H1 PDA [discount]</ChartLabel>
          <ChartArea $h="200px" $mt="2.5rem" $gap="3px">
            {/* Pre-london small candles around midnight open */}
            <Candle empty bodyBottom="52%" bodyHeight="8%" wickBottom="48%" wickHeight="18%" width="11px" bodyWidth="9px" />
            <Candle empty bodyBottom="50%" bodyHeight="10%" wickBottom="45%" wickHeight="20%" width="11px" bodyWidth="9px" />
            {/* London judas swing down */}
            <Candle bodyBottom="40%" bodyHeight="14%" wickBottom="35%" wickHeight="25%" width="11px" bodyWidth="9px" />
            <Candle bodyBottom="32%" bodyHeight="12%" wickBottom="28%" wickHeight="22%" width="11px" bodyWidth="9px" />
            <Candle bodyBottom="24%" bodyHeight="14%" wickBottom="18%" wickHeight="28%" width="11px" bodyWidth="9px" />
            <Candle bodyBottom="16%" bodyHeight="12%" wickBottom="10%" wickHeight="25%" width="11px" bodyWidth="9px" />
            {/* Reversal candle */}
            <Candle bull bodyBottom="10%" bodyHeight="18%" wickBottom="6%" wickHeight="28%" width="13px" bodyWidth="11px" />
            {/* Expansion starts */}
            <Candle bull bodyBottom="22%" bodyHeight="14%" wickBottom="18%" wickHeight="24%" width="11px" bodyWidth="9px" />
            <Candle bull bodyBottom="32%" bodyHeight="12%" wickBottom="28%" wickHeight="22%" width="11px" bodyWidth="9px" />
            {/* NY expansion - strong bullish */}
            <Candle bull bodyBottom="40%" bodyHeight="16%" wickBottom="36%" wickHeight="26%" width="12px" bodyWidth="10px" />
            <Candle bull bodyBottom="52%" bodyHeight="14%" wickBottom="48%" wickHeight="24%" width="12px" bodyWidth="10px" />
            <Candle bull bodyBottom="60%" bodyHeight="12%" wickBottom="56%" wickHeight="22%" width="12px" bodyWidth="10px" />
            <Candle bull bodyBottom="68%" bodyHeight="10%" wickBottom="64%" wickHeight="20%" width="12px" bodyWidth="10px" />
            <Candle bull bodyBottom="73%" bodyHeight="12%" wickBottom="70%" wickHeight="20%" width="12px" bodyWidth="10px" />
            <Candle bull bodyBottom="78%" bodyHeight="8%" wickBottom="75%" wickHeight="16%" width="11px" bodyWidth="9px" />
            <Candle bull bodyBottom="82%" bodyHeight="6%" wickBottom="80%" wickHeight="12%" width="11px" bodyWidth="9px" />
          </ChartArea>
        </ChartContainer>

        {/* Bearish 3-Phase Flow */}
        <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '2.5rem 0 1rem', color: T.red }}>
          ▼ Bearish London Reversal
        </h4>

        <PhaseFlow>
          <PhaseStep>
            <PhaseNum $color="#ef4444">Phase 1 &mdash; London</PhaseNum>
            <PhaseTitle>Reversal (2:00&ndash;5:00)</PhaseTitle>
            <PhaseDesc>
              Price protracts above midnight open &mdash; <strong>Judas swing</strong> into premium.
              Tags &ge; H1 PDA [premium]. London high forms.
              <br /><br />
              <span style={{ color: T.red, fontWeight: 600 }}>Key:</span> Reversal from premium PDA
            </PhaseDesc>
          </PhaseStep>
          <PhaseStep>
            <PhaseNum $color={T.green}>Phase 2 &mdash; New York</PhaseNum>
            <PhaseTitle>Expansion (7:00&ndash;12:00)</PhaseTitle>
            <PhaseDesc>
              Bearish order flow from London high. Clean stair-step M15 candles downward.
              <strong>Intraday expansion</strong> toward bearish daily draw on liquidity.
              <br /><br />
              <span style={{ color: T.red, fontWeight: 600 }}>Key:</span> Majority of daily range formed here
            </PhaseDesc>
          </PhaseStep>
          <PhaseStep>
            <PhaseNum $color="#818cf8">Phase 3 &mdash; Entry Range</PhaseNum>
            <PhaseTitle>Retracement Entries</PhaseTitle>
            <PhaseDesc>
              Retracements <strong>towards London reversal high</strong> become selling opportunities during NY.
              <br /><br />
              Use <strong>internal M15&ndash;H1 PD arrays</strong> (breaker, OB, FVG).
              <br />Optional: Fib levels for added confluence.
            </PhaseDesc>
          </PhaseStep>
        </PhaseFlow>

        {/* Bearish London Reversal Chart (from p.64 + p.65 + p.66) */}
        <ChartContainer>
          <ChartTitle style={{ color: T.red }}>▼ Bearish London Reversal</ChartTitle>
          <ChartSubtitle>daily candle + M15 profile &mdash; OHLC formation</ChartSubtitle>
          {/* Midnight open line */}
          <ChartLine $y="45%" $color="rgba(255,255,255,0.1)" $style="dashed" />
          <ChartLabel $color={T.textDim} $size="0.55rem" style={{ right: '0.5rem', bottom: '46%' }}>0:00 midnight open</ChartLabel>
          {/* Judas swing zone */}
          <ChartZone $left="18%" $width="18%" $bottom="45%" $height="50%" $color="rgba(74,222,128,0.04)" />
          <ChartLabel $color="rgba(239,68,68,0.6)" $size="0.55rem" style={{ left: '20%', top: '3rem' }}>london</ChartLabel>
          {/* NY expansion zone */}
          <ChartZone $left="52%" $width="35%" $bottom="0" $height="45%" $color="rgba(239,68,68,0.04)" />
          <ChartLabel $color="rgba(74,222,128,0.4)" $size="0.55rem" style={{ left: '60%', top: '3rem' }}>new york</ChartLabel>
          {/* Key labels */}
          <ChartLabel $color={T.red} $size="0.55rem" style={{ left: '0.5rem', top: '3rem' }}>london high</ChartLabel>
          <ChartLabel $color="#ef4444" $size="0.5rem" style={{ left: '20%', top: '5.5rem' }}>&ge; H1 PDA [premium]</ChartLabel>
          <ChartLabel $color={T.red} $size="0.55rem" $bold style={{ left: '0.5rem', bottom: '1.8rem' }}>bearish daily draw ↓</ChartLabel>
          <ChartLabel $size="0.5rem" style={{ right: '0.5rem', bottom: '1.8rem', color: T.textDim }}>draw on liquidity</ChartLabel>
          <ChartArea $h="200px" $mt="2.5rem" $gap="3px">
            {/* Pre-london small candles around midnight open */}
            <Candle empty bodyBottom="42%" bodyHeight="8%" wickBottom="38%" wickHeight="18%" width="11px" bodyWidth="9px" />
            <Candle empty bodyBottom="44%" bodyHeight="10%" wickBottom="40%" wickHeight="20%" width="11px" bodyWidth="9px" />
            {/* London judas swing UP into premium */}
            <Candle bull bodyBottom="48%" bodyHeight="12%" wickBottom="44%" wickHeight="22%" width="11px" bodyWidth="9px" />
            <Candle bull bodyBottom="56%" bodyHeight="14%" wickBottom="52%" wickHeight="24%" width="11px" bodyWidth="9px" />
            <Candle bull bodyBottom="66%" bodyHeight="12%" wickBottom="62%" wickHeight="24%" width="11px" bodyWidth="9px" />
            <Candle bull bodyBottom="72%" bodyHeight="10%" wickBottom="68%" wickHeight="22%" width="11px" bodyWidth="9px" />
            {/* Reversal candle from premium */}
            <Candle bodyBottom="62%" bodyHeight="18%" wickBottom="58%" wickHeight="30%" width="13px" bodyWidth="11px" />
            {/* Expansion starts */}
            <Candle bodyBottom="52%" bodyHeight="14%" wickBottom="48%" wickHeight="24%" width="11px" bodyWidth="9px" />
            <Candle bodyBottom="42%" bodyHeight="14%" wickBottom="38%" wickHeight="24%" width="11px" bodyWidth="9px" />
            {/* NY expansion - strong bearish */}
            <Candle bodyBottom="32%" bodyHeight="14%" wickBottom="28%" wickHeight="24%" width="12px" bodyWidth="10px" />
            <Candle bodyBottom="24%" bodyHeight="12%" wickBottom="20%" wickHeight="24%" width="12px" bodyWidth="10px" />
            <Candle bodyBottom="18%" bodyHeight="10%" wickBottom="14%" wickHeight="22%" width="12px" bodyWidth="10px" />
            <Candle bodyBottom="12%" bodyHeight="10%" wickBottom="8%" wickHeight="20%" width="12px" bodyWidth="10px" />
            <Candle bodyBottom="6%" bodyHeight="10%" wickBottom="2%" wickHeight="18%" width="12px" bodyWidth="10px" />
            <Candle bodyBottom="2%" bodyHeight="8%" wickBottom="0%" wickHeight="14%" width="11px" bodyWidth="9px" />
            <Candle bodyBottom="0%" bodyHeight="6%" wickBottom="0%" wickHeight="10%" width="11px" bodyWidth="9px" />
          </ChartArea>
        </ChartContainer>

        {/* Daily Candle Structure (OLHC / OHLC) */}
        <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '2.5rem 0 1rem' }}>
          Daily Candle Formation
        </h4>
        <TwoCol>
          <ColBox>
            <ColTitle>
              <span style={{ color: T.green }}>▲</span> Bullish OLHC
            </ColTitle>
            <BulletList>
              <Bullet><strong>[O]</strong> &mdash; Midnight open</Bullet>
              <Bullet><strong>[L]</strong> &mdash; London session forms the low (Judas into discount)</Bullet>
              <Bullet><strong>[H]</strong> &mdash; NY expansion to bullish daily draw</Bullet>
              <Bullet><strong>[C]</strong> &mdash; Close near high of day</Bullet>
            </BulletList>
          </ColBox>
          <ColBox>
            <ColTitle>
              <span style={{ color: T.red }}>▼</span> Bearish OHLC
            </ColTitle>
            <BulletList>
              <Bullet><strong>[O]</strong> &mdash; Midnight open</Bullet>
              <Bullet><strong>[H]</strong> &mdash; London session forms the high (Judas into premium)</Bullet>
              <Bullet><strong>[L]</strong> &mdash; NY expansion to bearish daily draw</Bullet>
              <Bullet><strong>[C]</strong> &mdash; Close near low of day</Bullet>
            </BulletList>
          </ColBox>
        </TwoCol>

        {/* ─── CHANGE IN STATE OF DELIVERY (from p.67) ─── */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          Change in State of Delivery (CISD)
        </h3>
        <p style={{ color: T.textMuted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          The CISD is your confirmation trigger. Until this happens, you&apos;re speculating.
          After it happens, you&apos;re executing with confluence. Both bullish and bearish
          require the same checklist &mdash; mirrored.
        </p>

        {/* CISD Candle Visuals (from p.67) */}
        <ChartContainer>
          <ChartTitle>Change in State of Delivery &mdash; Candle Patterns</ChartTitle>
          <ChartSubtitle>M15 candle close through breaker confirms direction</ChartSubtitle>
          <ChartLine $y="50%" $color="rgba(255,255,255,0.08)" $style="dashed" />
          <ChartLabel $color={T.textDim} $size="0.55rem" style={{ left: '50%', bottom: '51%', transform: 'translateX(-50%)' }}>breaker level</ChartLabel>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '2rem', gap: '2rem', flexWrap: 'wrap' }}>
            {/* Bullish CISD */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: T.green, marginBottom: '0.75rem' }}>▲ Bullish CISD</div>
              <div style={{ display: 'flex', gap: 3, height: 120, alignItems: 'flex-end', justifyContent: 'center' }}>
                <Candle bodyBottom="25%" bodyHeight="15%" wickBottom="18%" wickHeight="30%" width="12px" bodyWidth="10px" />
                <Candle bodyBottom="15%" bodyHeight="18%" wickBottom="8%" wickHeight="32%" width="12px" bodyWidth="10px" />
                <Candle bodyBottom="8%" bodyHeight="15%" wickBottom="2%" wickHeight="28%" width="12px" bodyWidth="10px" />
                <Candle bull bodyBottom="10%" bodyHeight="28%" wickBottom="5%" wickHeight="38%" width="14px" bodyWidth="12px" />
                <Candle bull bodyBottom="32%" bodyHeight="22%" wickBottom="28%" wickHeight="32%" width="14px" bodyWidth="12px" />
                <Candle bull bodyBottom="48%" bodyHeight="18%" wickBottom="44%" wickHeight="28%" width="12px" bodyWidth="10px" />
              </div>
              <div style={{ fontSize: '0.65rem', color: T.green, marginTop: '0.5rem' }}>M15 close above breaker ✓</div>
            </div>
            {/* Bearish CISD */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: T.red, marginBottom: '0.75rem' }}>▼ Bearish CISD</div>
              <div style={{ display: 'flex', gap: 3, height: 120, alignItems: 'flex-end', justifyContent: 'center' }}>
                <Candle bull bodyBottom="55%" bodyHeight="15%" wickBottom="50%" wickHeight="30%" width="12px" bodyWidth="10px" />
                <Candle bull bodyBottom="65%" bodyHeight="16%" wickBottom="60%" wickHeight="30%" width="12px" bodyWidth="10px" />
                <Candle bull bodyBottom="72%" bodyHeight="12%" wickBottom="68%" wickHeight="25%" width="12px" bodyWidth="10px" />
                <Candle bodyBottom="48%" bodyHeight="28%" wickBottom="42%" wickHeight="42%" width="14px" bodyWidth="12px" />
                <Candle bodyBottom="28%" bodyHeight="24%" wickBottom="22%" wickHeight="34%" width="14px" bodyWidth="12px" />
                <Candle bodyBottom="12%" bodyHeight="20%" wickBottom="6%" wickHeight="30%" width="12px" bodyWidth="10px" />
              </div>
              <div style={{ fontSize: '0.65rem', color: T.red, marginTop: '0.5rem' }}>M15 close below breaker ✓</div>
            </div>
          </div>
        </ChartContainer>

        <ChecklistGrid>
          <ChecklistBox $color={T.green}>
            <ChecklistTitle $color={T.green}>▲ Bullish CISD &mdash; London</ChecklistTitle>
            <CheckItem $color={T.green} $icon="①">&ge; H1 PDA : discount</CheckItem>
            <CheckItem $color={T.green} $icon="②">[engaged] &mdash; price reaches the PDA zone</CheckItem>
            <CheckItem $color={T.green} $icon="③">M15 candle close <strong>above</strong> breaker</CheckItem>
            <CheckItem $color={T.green} $icon="④">M30&ndash;H1 : high-quality structure shift</CheckItem>
            <CheckItem $color={T.green} $icon="⑤">[change in state of delivery]</CheckItem>
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(74,222,128,0.08)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: T.green }}>
              = Start intraday bullish order flow
            </div>
          </ChecklistBox>

          <ChecklistBox $color={T.red}>
            <ChecklistTitle $color={T.red}>▼ Bearish CISD &mdash; London</ChecklistTitle>
            <CheckItem $color={T.red} $icon="①">&ge; H1 PDA : premium</CheckItem>
            <CheckItem $color={T.red} $icon="②">[engaged] &mdash; price reaches the PDA zone</CheckItem>
            <CheckItem $color={T.red} $icon="③">M15 candle close <strong>below</strong> breaker</CheckItem>
            <CheckItem $color={T.red} $icon="④">M30&ndash;H1 : high-quality structure shift</CheckItem>
            <CheckItem $color={T.red} $icon="⑤">[change in state of delivery]</CheckItem>
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: T.red }}>
              = Start intraday bearish order flow
            </div>
          </ChecklistBox>
        </ChecklistGrid>

        {/* ─── NEGATIVE CONDITIONS (from p.68) ─── */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          Negative Conditions &mdash; London Reversal
        </h3>
        <p style={{ color: T.textMuted, fontSize: '0.9rem', marginBottom: '1rem' }}>
          When these conditions are present, the profile is unfavorable. No setup = no trade.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <NegativeBox>
            <NegativeTitle>✕ Condition 1 &mdash; Lacking &ge; H1 PDA engagement</NegativeTitle>
            <NegativeItem>London reversal fails to reach a relevant &ge; H1 PD array in premium or discount</NegativeItem>
            <NegativeItem>Price hovers around midnight open without displacing into a PDA zone</NegativeItem>
            <NegativeItem>No engagement = no high-quality reversal = no trade</NegativeItem>
          </NegativeBox>

          <NegativeBox>
            <NegativeTitle>✕ Condition 2 &mdash; NY PM high-impact news release</NegativeTitle>
            <NegativeItem>FOMC Statement / Federal Funds Rate / FOMC Press Conference (2:00&ndash;2:30pm)</NegativeItem>
            <NegativeItem>Pre-release consolidation renders standard profiles unreliable</NegativeItem>
            <NegativeItem>Expect consolidation into the event &mdash; profiles resume next session</NegativeItem>
          </NegativeBox>
        </div>

        {/* ═══ DAILY PROFILE 02 — NY MANIPULATION ═══ */}
        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '3rem 0 0.5rem', color: T.accent }}>
          Daily Profile 02 &mdash; New York Manipulation
        </h3>
        <p style={{ color: T.textMuted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Common on high-impact news days (CPI, NFP, FOMC, PCE, GDP, PPI).
          London consolidates &mdash; New York manipulates on the news catalyst.
        </p>

        <PhaseFlow>
          <PhaseStep>
            <PhaseNum $color="#ef4444">Phase 1 &mdash; London</PhaseNum>
            <PhaseTitle>Consolidation</PhaseTitle>
            <PhaseDesc>
              London session consolidates &mdash; builds the external consolidation range.
              No significant displacement in either direction.
              <br /><br />
              <span style={{ fontWeight: 600 }}>Key:</span> Range-bound price action before the catalyst
            </PhaseDesc>
          </PhaseStep>
          <PhaseStep>
            <PhaseNum $color={T.green}>Phase 2 &mdash; New York</PhaseNum>
            <PhaseTitle>Manipulation &rarr; Expansion</PhaseTitle>
            <PhaseDesc>
              8:30 news release manipulates external consolidation range.
              <strong>AMD structure:</strong> Accumulation before event, manipulation on release,
              distribution to draw.
              <br /><br />
              <span style={{ fontWeight: 600 }}>Key:</span> &ge; H1 PDA [discount/premium] : confluence
            </PhaseDesc>
          </PhaseStep>
          <PhaseStep>
            <PhaseNum $color="#818cf8">Phase 3 &mdash; Entry Range</PhaseNum>
            <PhaseTitle>M1&ndash;M15 PD Arrays</PhaseTitle>
            <PhaseDesc>
              Entry on retracement toward NY manipulation low/high.
              Use breaker &rarr; order block &rarr; FVG hierarchy.
              <br /><br />
              <span style={{ fontWeight: 600 }}>Catalyst:</span> Red folder 8:30 news events
            </PhaseDesc>
          </PhaseStep>
        </PhaseFlow>

        <NegativeBox>
          <NegativeTitle>✕ Negative Condition &mdash; NY Manipulation</NegativeTitle>
          <NegativeItem>External consolidation range: lacking NY manipulation engagement</NegativeItem>
          <NegativeItem>New York PM session: high-impact news (FOMC 2:00pm) invalidates morning profile</NegativeItem>
        </NegativeBox>

        {/* ═══ DAILY PROFILE 03 — NY REVERSAL ═══ */}
        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '3rem 0 0.5rem', color: T.accent }}>
          Daily Profile 03 &mdash; New York Reversal
        </h3>
        <p style={{ color: T.textMuted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Reversal days within the weekly profile structure. London forms the daily candle wick
          (Judas swing), New York creates the reversal.
        </p>

        <PhaseFlow>
          <PhaseStep>
            <PhaseNum $color="#ef4444">Phase 1 &mdash; London</PhaseNum>
            <PhaseTitle>Judas Swing / Protraction</PhaseTitle>
            <PhaseDesc>
              London forms the daily candle wick &mdash; protraction seeking premium or discount array.
              This is the fake move that baits retail.
              <br /><br />
              <span style={{ fontWeight: 600 }}>Key:</span> Directional but lacks follow-through
            </PhaseDesc>
          </PhaseStep>
          <PhaseStep>
            <PhaseNum $color={T.green}>Phase 2 &mdash; New York</PhaseNum>
            <PhaseTitle>Reversal &rarr; Expansion</PhaseTitle>
            <PhaseDesc>
              New York reverses below/above midnight open. H1+ PDA engagement confirms.
              Expansion delivers to daily draw on liquidity.
              <br /><br />
              <span style={{ fontWeight: 600 }}>Key:</span> Reversal &rarr; midnight open &rarr; expansion
            </PhaseDesc>
          </PhaseStep>
          <PhaseStep>
            <PhaseNum $color="#818cf8">Phase 3 &mdash; Entry Range</PhaseNum>
            <PhaseTitle>M1&ndash;M15 PD Arrays</PhaseTitle>
            <PhaseDesc>
              Retrace toward NY reversal low/high using M1&ndash;M15 PD arrays.
              <br /><br />
              <span style={{ fontWeight: 600 }}>Ideal:</span> Reversal forms at NY manipulation level, entry on internal FVG/breaker
            </PhaseDesc>
          </PhaseStep>
        </PhaseFlow>

        <NegativeBox>
          <NegativeTitle>✕ Negative Condition &mdash; NY Reversal</NegativeTitle>
          <NegativeItem>&ge; H1 PDA: lacking NY session engagement with relevant PD array</NegativeItem>
          <NegativeItem>New York PM session: high-impact news release invalidates morning structure</NegativeItem>
        </NegativeBox>

        {/* ─── DAYS OF WEEK PROFILE MATRIX (from p.69) ─── */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          Profile &times; Day-of-Week Matrix
        </h3>
        <p style={{ color: T.textMuted, fontSize: '0.9rem', marginBottom: '1rem' }}>
          Highest-probability (but not restricted to) profile occurrence per day of week.
          Monday is always avoided &mdash; it exists for observation only.
        </p>

        <DotMatrix>
          {/* Header Row */}
          <DotHeader style={{ borderRight: `1px solid ${T.border}` }}>&nbsp;</DotHeader>
          <DotHeader>MON</DotHeader>
          <DotHeader>TUE</DotHeader>
          <DotHeader>WED</DotHeader>
          <DotHeader>THU</DotHeader>
          <DotHeader>FRI</DotHeader>

          {/* Classic Expansion */}
          <DotLabel $color={T.green}>🟢 Classic Expansion</DotLabel>
          <DotCell><Dot $color="rgba(113,113,122,0.4)" /></DotCell>
          <DotCell><Dot $color={T.green} $active /></DotCell>
          <DotCell><Dot $color={T.green} $active /></DotCell>
          <DotCell><Dot $color={T.green} $active /></DotCell>
          <DotCell><Dot $color={T.green} /></DotCell>

          {/* Midweek Reversal */}
          <DotLabel $color={T.red}>🔴 Midweek Reversal</DotLabel>
          <DotCell><Dot $color="rgba(113,113,122,0.4)" /></DotCell>
          <DotCell><Dot $color={T.red} /></DotCell>
          <DotCell><Dot $color={T.red} $active /></DotCell>
          <DotCell><Dot $color={T.red} $active /></DotCell>
          <DotCell><Dot $color={T.red} $active /></DotCell>

          {/* Consolidation Reversal */}
          <DotLabel $color="#818cf8">🔵 Consolidation Reversal</DotLabel>
          <DotCell><Dot $color="rgba(113,113,122,0.4)" /></DotCell>
          <DotCell><Dot $color="#818cf8" /></DotCell>
          <DotCell><Dot $color="#818cf8" /></DotCell>
          <DotCell><Dot $color="#818cf8" $active /></DotCell>
          <DotCell><Dot $color="#818cf8" $active /></DotCell>
        </DotMatrix>

        <p style={{ color: T.textDim, fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', marginTop: '0.5rem' }}>
          Expansion days follow reversal days &mdash; Monday is always accumulation
        </p>

        {/* ─── PROFILE ANTICIPATION (from p.70) ─── */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          Classic Expansion &mdash; Weekly Candle Anticipation
        </h3>

        {/* Weekly Staircase Candle Visuals (from p.70) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', margin: '1.5rem 0' }}>
          {/* Bullish Staircase */}
          <ChartContainer style={{ margin: 0, padding: '1.5rem 1.5rem 1rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: T.green, marginBottom: '0.25rem' }}>▲ Bullish Classic Expansion</div>
            <div style={{ fontSize: '0.65rem', color: T.textDim, fontStyle: 'italic', marginBottom: '1.5rem' }}>weekly candle staircase</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '2rem', paddingBottom: '0.5rem' }}>
              {/* TUE - low position */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 32, height: 140 }}>
                  {/* Wick */}
                  <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: 2, height: 70, background: T.green, borderRadius: 1 }} />
                  {/* Body */}
                  <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 5, width: 24, height: 50, background: T.green, borderRadius: 2 }} />
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: T.textMuted, marginTop: 6 }}>T</div>
                <div style={{ fontSize: '0.65rem', color: T.green }}>tuesday</div>
              </div>
              {/* WED - mid position */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 32, height: 140 }}>
                  <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 25, width: 2, height: 75, background: T.green, borderRadius: 1 }} />
                  <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 35, width: 24, height: 50, background: T.green, borderRadius: 2 }} />
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: T.textMuted, marginTop: 6 }}>W</div>
                <div style={{ fontSize: '0.65rem', color: T.green }}>wednesday</div>
              </div>
              {/* THU - high position */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 32, height: 140 }}>
                  <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 55, width: 2, height: 75, background: T.green, borderRadius: 1 }} />
                  <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 62, width: 24, height: 50, background: T.green, borderRadius: 2 }} />
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: T.textMuted, marginTop: 6 }}>T</div>
                <div style={{ fontSize: '0.65rem', color: T.green }}>thursday</div>
              </div>
            </div>
          </ChartContainer>

          {/* Bearish Staircase */}
          <ChartContainer style={{ margin: 0, padding: '1.5rem 1.5rem 1rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: T.red, marginBottom: '0.25rem' }}>▼ Bearish Classic Expansion</div>
            <div style={{ fontSize: '0.65rem', color: T.textDim, fontStyle: 'italic', marginBottom: '1.5rem' }}>weekly candle staircase</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '2rem', paddingBottom: '0.5rem' }}>
              {/* TUE - high position (bearish so starts high) */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 32, height: 140 }}>
                  <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 55, width: 2, height: 75, background: T.red, borderRadius: 1 }} />
                  <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 62, width: 24, height: 50, background: T.red, borderRadius: 2 }} />
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: T.textMuted, marginTop: 6 }}>T</div>
                <div style={{ fontSize: '0.65rem', color: T.red }}>tuesday</div>
              </div>
              {/* WED - mid position */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 32, height: 140 }}>
                  <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 25, width: 2, height: 75, background: T.red, borderRadius: 1 }} />
                  <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 35, width: 24, height: 50, background: T.red, borderRadius: 2 }} />
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: T.textMuted, marginTop: 6 }}>W</div>
                <div style={{ fontSize: '0.65rem', color: T.red }}>wednesday</div>
              </div>
              {/* THU - low position */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 32, height: 140 }}>
                  <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: 2, height: 70, background: T.red, borderRadius: 1 }} />
                  <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 5, width: 24, height: 50, background: T.red, borderRadius: 2 }} />
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: T.textMuted, marginTop: 6 }}>T</div>
                <div style={{ fontSize: '0.65rem', color: T.red }}>thursday</div>
              </div>
            </div>
          </ChartContainer>
        </div>

        <TwoCol>
          <ColBox>
            <ColTitle>
              <span style={{ color: T.green }}>▲</span> Bullish Staircase
            </ColTitle>
            <BulletList>
              <Bullet><DayBadge $day="TUE">TUE</DayBadge> Opens low &mdash; start of accumulation</Bullet>
              <Bullet><DayBadge $day="WED">WED</DayBadge> Expands mid &mdash; bulk of range</Bullet>
              <Bullet><DayBadge $day="THU">THU</DayBadge> Reaches high &mdash; weekly draw target</Bullet>
            </BulletList>
            <p style={{ color: T.textDim, fontSize: '0.8rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
              Stair-stepping up: T &rarr; W &rarr; T
            </p>
          </ColBox>
          <ColBox>
            <ColTitle>
              <span style={{ color: T.red }}>▼</span> Bearish Staircase
            </ColTitle>
            <BulletList>
              <Bullet><DayBadge $day="TUE">TUE</DayBadge> Opens high &mdash; start of distribution</Bullet>
              <Bullet><DayBadge $day="WED">WED</DayBadge> Drops mid &mdash; bulk of range</Bullet>
              <Bullet><DayBadge $day="THU">THU</DayBadge> Reaches low &mdash; weekly draw target</Bullet>
            </BulletList>
            <p style={{ color: T.textDim, fontSize: '0.8rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
              Stair-stepping down: T &rarr; W &rarr; T &mdash; potential to form on Friday
            </p>
          </ColBox>
        </TwoCol>

        <QuoteBlock>
          <QuoteText>&ldquo;You cannot have a daily profile without a weekly profile. High-probability daily setups only exist within a defined weekly context.&rdquo;</QuoteText>
          <QuoteAuthor>&mdash; @amtrades, Market Profiling Guide</QuoteAuthor>
        </QuoteBlock>
      </SectionWrapper>

      {/* ═══ 04 — POWER OF 3 ═══ */}
      <SectionDivider />
      <SectionWrapper id="po3">
        <SectionLabel>Core Concept</SectionLabel>
        <SectionTitle>Power of 3 — AMD / OHLC</SectionTitle>
        <SectionIntro>
          The foundational pattern behind every candle on every timeframe.
          Smart money accumulates, manipulates, then distributes. Once you
          see it, you can&apos;t unsee it.
        </SectionIntro>

        {/* Visual Device: Flow — AMD Sequence */}
        <FlowRow>
          <FlowStep>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📦</div>
            Accumulate
            <div style={{ fontSize: '0.75rem', color: T.textDim, marginTop: '0.25rem' }}>
              Price consolidates<br />around the open
            </div>
          </FlowStep>
          <FlowArrow>→</FlowArrow>
          <FlowStep>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🎯</div>
            Manipulate
            <div style={{ fontSize: '0.75rem', color: T.textDim, marginTop: '0.25rem' }}>
              Judas swing baits<br />retail traders
            </div>
          </FlowStep>
          <FlowArrow>→</FlowArrow>
          <FlowStep>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>💰</div>
            Distribute
            <div style={{ fontSize: '0.75rem', color: T.textDim, marginTop: '0.25rem' }}>
              Real move toward<br />the daily draw
            </div>
          </FlowStep>
        </FlowRow>

        <TwoCol>
          <ColBox>
            <ColTitle>
              <span style={{ color: T.green }}>▲</span> Bullish OLHC
            </ColTitle>
            <BulletList>
              <Bullet><strong>Open</strong> — Midnight (00:00 NY)</Bullet>
              <Bullet><strong>Low</strong> — Formed by Judas swing into discount (2:00–5:00)</Bullet>
              <Bullet><strong>High</strong> — NY expansion to daily draw</Bullet>
              <Bullet><strong>Close</strong> — Near high of day</Bullet>
            </BulletList>
          </ColBox>
          <ColBox>
            <ColTitle>
              <span style={{ color: T.red }}>▼</span> Bearish OHLC
            </ColTitle>
            <BulletList>
              <Bullet><strong>Open</strong> — Midnight (00:00 NY)</Bullet>
              <Bullet><strong>High</strong> — Formed by Judas swing into premium (2:00–5:00)</Bullet>
              <Bullet><strong>Low</strong> — NY expansion to daily draw</Bullet>
              <Bullet><strong>Close</strong> — Near low of day</Bullet>
            </BulletList>
          </ColBox>
        </TwoCol>

        <QuoteBlock>
          <QuoteText>&ldquo;Price will always go above or below the daily open price at least once. This is the manipulation — and your opportunity.&rdquo;</QuoteText>
          <QuoteAuthor>— @silkyXBT, Inside The Circle M2</QuoteAuthor>
        </QuoteBlock>

        {/* Visual Device: Comparison — The Best Setup */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          The Midnight PO3 Advantage
        </h3>

        <StatGrid>
          <StatCell>
            <StatValue>Daily</StatValue>
            <StatLabel>Opportunity frequency</StatLabel>
          </StatCell>
          <StatCell>
            <StatValue>No Overnight</StatValue>
            <StatLabel>Holding risk</StatLabel>
          </StatCell>
          <StatCell>
            <StatValue>00:00–05:00</StatValue>
            <StatLabel>NY time manipulation window</StatLabel>
          </StatCell>
          <StatCell>
            <StatValue>Highest</StatValue>
            <StatLabel>Consistency of all PO3 timeframes</StatLabel>
          </StatCell>
        </StatGrid>
      </SectionWrapper>

      {/* ═══ 05 — SESSIONS ═══ */}
      <SectionDivider />
      <SectionWrapper id="sessions">
        <SectionLabel>Operations</SectionLabel>
        <SectionTitle>Session Profiles & Time Windows</SectionTitle>
        <SectionIntro>
          Not all hours are equal. The market has a rhythm — and your job is
          to show up during expansion, not consolidation.
        </SectionIntro>

        {/* Visual Device: Continuum — Time windows */}
        <Spectrum>
          <SpectrumItem>
            <SpectrumLabel>Midnight</SpectrumLabel>
            <SpectrumValue style={{ fontSize: '0.85rem' }}>00:00</SpectrumValue>
            <div style={{ fontSize: '0.7rem', color: T.textDim, marginTop: '0.25rem' }}>Daily open</div>
          </SpectrumItem>
          <SpectrumItem $active>
            <SpectrumLabel>London</SpectrumLabel>
            <SpectrumValue style={{ fontSize: '0.85rem', color: T.accent }}>2:00–5:00</SpectrumValue>
            <div style={{ fontSize: '0.7rem', color: T.textDim, marginTop: '0.25rem' }}>Reversal window</div>
          </SpectrumItem>
          <SpectrumItem>
            <SpectrumLabel>NY Open</SpectrumLabel>
            <SpectrumValue style={{ fontSize: '0.85rem' }}>7:00–8:30</SpectrumValue>
            <div style={{ fontSize: '0.7rem', color: T.textDim, marginTop: '0.25rem' }}>Indices + news</div>
          </SpectrumItem>
          <SpectrumItem $active>
            <SpectrumLabel>NY AM</SpectrumLabel>
            <SpectrumValue style={{ fontSize: '0.85rem', color: T.accent }}>8:30–12:00</SpectrumValue>
            <div style={{ fontSize: '0.7rem', color: T.textDim, marginTop: '0.25rem' }}>Expansion window</div>
          </SpectrumItem>
          <SpectrumItem>
            <SpectrumLabel>NY PM</SpectrumLabel>
            <SpectrumValue style={{ fontSize: '0.85rem' }}>12:00–16:00</SpectrumValue>
            <div style={{ fontSize: '0.7rem', color: T.textDim, marginTop: '0.25rem' }}>Continuation only</div>
          </SpectrumItem>
        </Spectrum>

        <TwoCol>
          <ColBox>
            <ColTitle>🌍 Asset: All (Crypto, Forex, Indices)</ColTitle>
            <CardDesc style={{ marginBottom: '1rem' }}>London session reversal applies universally</CardDesc>
            <BulletList>
              <Bullet>London reversal: 2:00–5:00 EST</Bullet>
              <Bullet>NY expansion: varies by asset</Bullet>
              <Bullet>Majority of daily range: London → NY AM</Bullet>
            </BulletList>
          </ColBox>
          <ColBox>
            <ColTitle>📊 Asset-Specific NY Windows</ColTitle>
            <CardDesc style={{ marginBottom: '1rem' }}>Different assets, different expansion times</CardDesc>
            <BulletList>
              <Bullet><strong>Forex:</strong> 7:00–10:00 expansion, continuation to 12:00</Bullet>
              <Bullet><strong>Indices:</strong> 8:30–12:00 expansion, continuation to 16:00</Bullet>
              <Bullet><strong>Crypto:</strong> 24/7 — use London+NY as primary, Asian for setup</Bullet>
            </BulletList>
          </ColBox>
        </TwoCol>

        {/* Visual Device: Loop — The Session Cycle */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          The Intraday Cycle
        </h3>
        <LoopContainer>
          <LoopNode>Asian Consolidation</LoopNode>
          <LoopArrow>→</LoopArrow>
          <LoopNode>London Manipulation</LoopNode>
          <LoopArrow>→</LoopArrow>
          <LoopNode>NY Expansion</LoopNode>
          <LoopArrow>→</LoopArrow>
          <LoopNode>NY PM Wind-Down</LoopNode>
          <LoopArrow>↻</LoopArrow>
        </LoopContainer>
      </SectionWrapper>

      {/* ═══ 06 — ENTRIES ═══ */}
      <SectionDivider />
      <SectionWrapper id="entries">
        <SectionLabel>Execution</SectionLabel>
        <SectionTitle>Entry Models & Setups</SectionTitle>
        <SectionIntro>
          Two primary entry types. Know which to expect based on Asian session
          behavior, then execute with precision.
        </SectionIntro>

        <TwoCol>
          <ColBox>
            <ColTitle>💧 Stophunt Entry</ColTitle>
            <CardDesc style={{ marginBottom: '1rem', color: T.textDim, fontStyle: 'italic' }}>
              When Asian range consolidates (no liquidity pool taken)
            </CardDesc>
            <BulletList>
              <Bullet>Asian session consolidates — range-bound, no breakout</Bullet>
              <Bullet>After NY midnight, Judas swing into a liquidity pool</Bullet>
              <Bullet>Reversal from the pool + displacement</Bullet>
              <Bullet>LTF entry model: breaker / order block / OTE</Bullet>
              <Bullet>SL below/above the manipulation wick</Bullet>
            </BulletList>
          </ColBox>
          <ColBox>
            <ColTitle>📐 FVG Entry</ColTitle>
            <CardDesc style={{ marginBottom: '1rem', color: T.textDim, fontStyle: 'italic' }}>
              When Asian session takes out a key level with displacement
            </CardDesc>
            <BulletList>
              <Bullet>Asian session takes out PDH/PDL, session H/L, or NY/LO H/L</Bullet>
              <Bullet>Displacement creates 5m/15m/30m fair value gap</Bullet>
              <Bullet>Judas swing retraces into that FVG</Bullet>
              <Bullet>Entry on FVG tap — SL below/above the gap</Bullet>
              <Bullet>Distribution toward the daily draw on liquidity</Bullet>
            </BulletList>
          </ColBox>
        </TwoCol>

        {/* Visual Device: Hierarchy — Entry Model Stack */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          LTF Entry Hierarchy
        </h3>
        <p style={{ color: T.textMuted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          When price reaches your reversal zone, these are the entry models
          ranked from most aggressive to most conservative:
        </p>

        <FlowRow>
          <FlowStep style={{ borderColor: T.red, opacity: 0.9 }}>
            <div style={{ fontSize: '0.7rem', color: T.textDim }}>Aggressive</div>
            Turtle Soup
            <div style={{ fontSize: '0.7rem', color: T.textDim }}>Liquidity sweep</div>
          </FlowStep>
          <FlowArrow>→</FlowArrow>
          <FlowStep style={{ borderColor: T.amber }}>
            <div style={{ fontSize: '0.7rem', color: T.textDim }}>Standard</div>
            Breaker / OB
            <div style={{ fontSize: '0.7rem', color: T.textDim }}>Structure re-entry</div>
          </FlowStep>
          <FlowArrow>→</FlowArrow>
          <FlowStep style={{ borderColor: T.green }}>
            <div style={{ fontSize: '0.7rem', color: T.textDim }}>Conservative</div>
            FVG + OTE
            <div style={{ fontSize: '0.7rem', color: T.textDim }}>Imbalance fill</div>
          </FlowStep>
        </FlowRow>

        {/* 5-Step Protocol */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          The 5-Step Protocol
        </h3>
        <p style={{ color: T.textMuted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          A simplified, repeatable process for every trading day:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {[
            { step: '1', title: 'Avoid Monday', desc: 'No high-impact news. No expansion. No profile data. Observe only.' },
            { step: '2', title: 'Check the Economic Calendar', desc: 'Avoid trading days before first high-impact news. Focus: FOMC, 8:30 red folder events.' },
            { step: '3', title: 'Mark H4+ Framework', desc: 'Identify relevant PD arrays. Find the reversal structure and draw on liquidity.' },
            { step: '4', title: 'Identify Weekly Profile', desc: 'Classic Expansion? Midweek Reversal? Consolidation Reversal? Know which profile is forming.' },
            { step: '5', title: 'Wait for Change in State of Delivery', desc: 'H1–M30 candle close through breaker on the correct day of week. Then execute.' },
          ].map(item => (
            <NumberedItem key={item.step}>
              <BigNum style={{ fontSize: '1.5rem', minWidth: '40px', color: T.accent }}>{item.step}</BigNum>
              <ItemContent>
                <ItemTitle>{item.title}</ItemTitle>
                <ItemDesc>{item.desc}</ItemDesc>
              </ItemContent>
            </NumberedItem>
          ))}
        </div>
      </SectionWrapper>

      {/* ═══ 07 — RISK ═══ */}
      <SectionDivider />
      <SectionWrapper id="risk">
        <SectionLabel>Risk Management</SectionLabel>
        <SectionTitle>Risk & Profit Management</SectionTitle>
        <SectionIntro>
          Entries are one skill. Knowing when to close is the other. These
          rules protect your capital and lock in gains systematically.
        </SectionIntro>

        {/* Visual Device: Stacking — Profit targets */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '2rem 0 1rem' }}>
          Profit Target Stack
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: T.border, borderRadius: '12px', overflow: 'hidden', border: `1px solid ${T.border}`, margin: '1.5rem 0' }}>
          {[
            { level: '① 20–30 Pips', action: 'Close 25% of position', note: 'First target — secure the base', color: T.green },
            { level: '② 40–50 Pips', action: 'Close majority of position', note: 'Main target — bulk profit harvest', color: T.accent },
            { level: '③ Liquidity Target', action: 'Partial remaining position', note: 'Asia H/L, PDH/PDL, Weekly H/L', color: '#818cf8' },
            { level: '④ 5× ADR', action: 'Close 60–80% minimum', note: 'Extreme levels — indicator turns purple/red', color: T.amber },
            { level: '⑤ Before Lunch', action: 'Close or heavy partial by 12:00', note: 'Never hold through NY lunch — losses for no reason', color: T.red },
          ].map((t, i) => (
            <div key={i} style={{ background: T.surface, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', fontWeight: 700, color: t.color, minWidth: '120px' }}>{t.level}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{t.action}</div>
                <div style={{ fontSize: '0.8rem', color: T.textDim }}>{t.note}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Visual Device: Venn — Risk factors */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          The Confluence Triangle
        </h3>
        <p style={{ color: T.textMuted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          A trade must sit at the intersection of all three to be high-probability:
        </p>
        <VennContainer>
          <VennCircle $color="rgba(34,211,238,0.08)" $border={T.accentDim}>
            H4+ PD Array<br />Engagement
          </VennCircle>
          <VennCircle $color="rgba(129,140,248,0.08)" $border="rgba(129,140,248,0.4)">
            Weekly Profile<br />Alignment
          </VennCircle>
          <VennCircle $color="rgba(74,222,128,0.08)" $border="rgba(74,222,128,0.4)">
            Session Time<br />Window
          </VennCircle>
        </VennContainer>

        <QuoteBlock>
          <QuoteText>&ldquo;No manipulation, no participation.&rdquo;</QuoteText>
          <QuoteAuthor>— The Market Profiling Guide</QuoteAuthor>
        </QuoteBlock>

        {/* Negative Conditions */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          When NOT to Trade — Negative Conditions
        </h3>
        <CardGrid>
          <CardItem>
            <CardNumber>Red Flag 01</CardNumber>
            <CardTitle>No Manipulation</CardTitle>
            <CardDesc>Monday accumulation → Tuesday expansion with no reversal at PD array = no profile structure. Skip.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Red Flag 02</CardNumber>
            <CardTitle>Missing PD Array</CardTitle>
            <CardDesc>London or NY session lacks H1+ PD array engagement. No anchor = no trade.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Red Flag 03</CardNumber>
            <CardTitle>Consecutive Directional Candles</CardTitle>
            <CardDesc>Two same-direction daily closes without retrace or accumulation = trending, not profiling. Sit out.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Red Flag 04</CardNumber>
            <CardTitle>PM Session News</CardTitle>
            <CardDesc>High-impact news after 12:00 EST creates unpredictable conditions. Expect consolidation, not expansion.</CardDesc>
          </CardItem>
        </CardGrid>
      </SectionWrapper>

      {/* ═══ 08 — LIQUIDITY & MARKET STRUCTURE ═══ */}
      <SectionDivider />
      <SectionWrapper id="liquidity">
        <SectionLabel>Structure</SectionLabel>
        <SectionTitle>Liquidity & Market Structure</SectionTitle>
        <SectionIntro>
          Before you can read any profile, you need to understand how institutional
          money moves price. Every swing high and low exists for one reason: liquidity.
        </SectionIntro>

        {/* Visual Device: Comparison — BSL vs SSL */}
        <TwoCol>
          <ColBox>
            <ColTitle>
              <span style={{ color: T.green }}>▲</span> Buyside Liquidity (BSL)
            </ColTitle>
            <CardDesc style={{ marginBottom: '1rem', color: T.textDim, fontStyle: 'italic' }}>
              Buy stops resting above swing highs
            </CardDesc>
            <BulletList>
              <Bullet>Retail traders place stop-losses above previous highs</Bullet>
              <Bullet>Smart money drives price into these pools to fill sell orders</Bullet>
              <Bullet>Once swept, price reverses — the &ldquo;liquidity grab&rdquo;</Bullet>
              <Bullet>External BSL = major highs (weekly/daily)</Bullet>
              <Bullet>Internal BSL = minor swing highs within a range</Bullet>
            </BulletList>
          </ColBox>
          <ColBox>
            <ColTitle>
              <span style={{ color: T.red }}>▼</span> Sellside Liquidity (SSL)
            </ColTitle>
            <CardDesc style={{ marginBottom: '1rem', color: T.textDim, fontStyle: 'italic' }}>
              Sell stops resting below swing lows
            </CardDesc>
            <BulletList>
              <Bullet>Retail traders place stop-losses below previous lows</Bullet>
              <Bullet>Smart money drives price into these pools to fill buy orders</Bullet>
              <Bullet>Once swept, price reverses — the opposite &ldquo;grab&rdquo;</Bullet>
              <Bullet>External SSL = major lows (weekly/daily)</Bullet>
              <Bullet>Internal SSL = minor swing lows within a range</Bullet>
            </BulletList>
          </ColBox>
        </TwoCol>

        {/* Visual Device: Flow — Market Structure */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          Market Structure Concepts
        </h3>

        <CardGrid>
          <CardItem>
            <CardNumber>Concept 01</CardNumber>
            <CardTitle>Break of Structure (BOS)</CardTitle>
            <CardDesc>Price breaks a previous swing high (bullish) or swing low (bearish), confirming the current trend direction. BOS is continuation — not reversal.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Concept 02</CardNumber>
            <CardTitle>Change of Character (CHoCH)</CardTitle>
            <CardDesc>The first break against the prevailing trend. In a downtrend, CHoCH is the first higher high. In an uptrend, the first lower low. This is the earliest reversal signal.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Concept 03</CardNumber>
            <CardTitle>Market Structure Shift (MSS)</CardTitle>
            <CardDesc>A confirmed CHoCH followed by displacement. Stronger than CHoCH alone — it shows institutional commitment to the new direction with momentum behind it.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Concept 04</CardNumber>
            <CardTitle>Displacement</CardTitle>
            <CardDesc>A sharp, aggressive price move that creates fair value gaps. Displacement shows institutional intent — it&apos;s the footprint of smart money entering large positions with urgency.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Concept 05</CardNumber>
            <CardTitle>Inducement</CardTitle>
            <CardDesc>A minor liquidity pool engineered to trap traders before the real move. Price sweeps a minor high/low to grab orders, then reverses to sweep the major pool.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Concept 06</CardNumber>
            <CardTitle>Equilibrium</CardTitle>
            <CardDesc>The 50% level of any range. Acts as a magnet and decision point. Above EQ = premium (sell zone). Below EQ = discount (buy zone). The simplest filter in ICT.</CardDesc>
          </CardItem>
        </CardGrid>

        {/* Visual Device: Hierarchy — Structure Reading */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          Reading Structure Top-Down
        </h3>
        <FlowRow>
          <FlowStep>
            <div style={{ fontSize: '0.7rem', color: T.textDim }}>Step 1</div>
            HTF Bias
            <div style={{ fontSize: '0.7rem', color: T.textDim }}>Weekly/Daily BOS direction</div>
          </FlowStep>
          <FlowArrow>&rarr;</FlowArrow>
          <FlowStep>
            <div style={{ fontSize: '0.7rem', color: T.textDim }}>Step 2</div>
            Liquidity Target
            <div style={{ fontSize: '0.7rem', color: T.textDim }}>Where is the draw?</div>
          </FlowStep>
          <FlowArrow>&rarr;</FlowArrow>
          <FlowStep>
            <div style={{ fontSize: '0.7rem', color: T.textDim }}>Step 3</div>
            LTF CHoCH/MSS
            <div style={{ fontSize: '0.7rem', color: T.textDim }}>Confirm with M15/M5</div>
          </FlowStep>
          <FlowArrow>&rarr;</FlowArrow>
          <FlowStep>
            <div style={{ fontSize: '0.7rem', color: T.textDim }}>Step 4</div>
            Entry at PD Array
            <div style={{ fontSize: '0.7rem', color: T.textDim }}>OB / FVG / Breaker</div>
          </FlowStep>
        </FlowRow>

        <QuoteBlock>
          <QuoteText>&ldquo;Liquidity is the fuel that moves price. Without understanding where stops are resting, you&apos;re trading blind.&rdquo;</QuoteText>
          <QuoteAuthor>&mdash; ICT Concept</QuoteAuthor>
        </QuoteBlock>
      </SectionWrapper>

      {/* ═══ 09 — PD ARRAYS DEEP DIVE ═══ */}
      <SectionDivider />
      <SectionWrapper id="pdarrays">
        <SectionLabel>Toolbox</SectionLabel>
        <SectionTitle>PD Arrays Deep Dive</SectionTitle>
        <SectionIntro>
          PD arrays (Premium/Discount arrays) are the specific price levels where
          institutional orders cluster. Every entry you take should be at one of these.
        </SectionIntro>

        <StageCard>
          <StageNum>PD Array 01</StageNum>
          <StageTitle>Order Blocks (OB)</StageTitle>
          <StageSub>The last opposite-direction candle before displacement</StageSub>
          <BulletList>
            <Bullet><strong>Bullish OB:</strong> Last down-close candle before a strong bullish displacement that breaks structure</Bullet>
            <Bullet><strong>Bearish OB:</strong> Last up-close candle before a strong bearish displacement that breaks structure</Bullet>
            <Bullet>The candle body (open to close) is the zone &mdash; wicks are less significant</Bullet>
            <Bullet>Higher timeframe OBs hold more weight (H4 &gt; H1 &gt; M15)</Bullet>
            <Bullet>Price returns to the OB to fill remaining institutional orders &mdash; this is your entry</Bullet>
            <Bullet>If price trades through an OB aggressively, it&apos;s been <strong>mitigated</strong> &mdash; invalidated</Bullet>
          </BulletList>
        </StageCard>

        <StageCard>
          <StageNum>PD Array 02</StageNum>
          <StageTitle>Fair Value Gaps (FVG)</StageTitle>
          <StageSub>Three-candle pattern showing an imbalance in price delivery</StageSub>
          <BulletList>
            <Bullet><strong>Bullish FVG:</strong> Gap between Candle 1&apos;s high and Candle 3&apos;s low (Candle 2 is the displacement)</Bullet>
            <Bullet><strong>Bearish FVG:</strong> Gap between Candle 1&apos;s low and Candle 3&apos;s high</Bullet>
            <Bullet>FVGs act as magnets &mdash; price tends to return and fill the imbalance</Bullet>
            <Bullet>The consequent encroachment (50% of FVG) is the key reaction level</Bullet>
            <Bullet>Unfilled FVGs on higher timeframes are strong draw-on-liquidity targets</Bullet>
            <Bullet>FVGs created during killzones carry more institutional weight</Bullet>
          </BulletList>
        </StageCard>

        <StageCard>
          <StageNum>PD Array 03</StageNum>
          <StageTitle>Breaker Blocks</StageTitle>
          <StageSub>Failed order blocks that flip from resistance to support (or vice versa)</StageSub>
          <BulletList>
            <Bullet><strong>Bullish Breaker:</strong> A bearish OB that fails &mdash; price breaks above it, then returns as support</Bullet>
            <Bullet><strong>Bearish Breaker:</strong> A bullish OB that fails &mdash; price breaks below it, then returns as resistance</Bullet>
            <Bullet>Breakers form at CHoCH/MSS points &mdash; they mark the structural turn</Bullet>
            <Bullet>Candle close through a breaker = Change in State of Delivery (CISD)</Bullet>
            <Bullet>One of the highest-confluence entry PD arrays in the ICT framework</Bullet>
          </BulletList>
        </StageCard>

        <StageCard>
          <StageNum>PD Array 04</StageNum>
          <StageTitle>Rejection Blocks (RB)</StageTitle>
          <StageSub>Candle wicks that form at extreme premium or discount</StageSub>
          <BulletList>
            <Bullet>The range of the wick (high to body) of a candle that tapped a liquidity pool</Bullet>
            <Bullet>Shows rejection of a price level &mdash; institutional orders defending that zone</Bullet>
            <Bullet>Less precise than OBs but useful as confluence with other PD arrays</Bullet>
            <Bullet>Most effective at H4+ timeframes near external liquidity levels</Bullet>
          </BulletList>
        </StageCard>

        <StageCard>
          <StageNum>PD Array 05</StageNum>
          <StageTitle>Optimal Trade Entry (OTE)</StageTitle>
          <StageSub>The Fibonacci 62%&ndash;79% retracement zone</StageSub>
          <BulletList>
            <Bullet>After a displacement (BOS or MSS), measure the move with a Fibonacci tool</Bullet>
            <Bullet>The 62%&ndash;79% retracement zone is the OTE &mdash; the sweet spot for entries</Bullet>
            <Bullet>When an OB, FVG, or Breaker sits inside the OTE zone, confluence is maximized</Bullet>
            <Bullet>Stop loss goes below/above the swing that created the displacement</Bullet>
            <Bullet>OTE works on every timeframe but is most reliable on H1/M15 for intraday</Bullet>
          </BulletList>
        </StageCard>

        <StageCard>
          <StageNum>PD Array 06</StageNum>
          <StageTitle>Mitigation Blocks</StageTitle>
          <StageSub>Where institutions return to close losing positions at breakeven</StageSub>
          <BulletList>
            <Bullet>When smart money gets trapped (their OB fails), they wait for price to return</Bullet>
            <Bullet>They close those positions at breakeven &mdash; creating a reaction at that level</Bullet>
            <Bullet>Mitigation blocks are failed OBs that get one more tap before continuation</Bullet>
            <Bullet>Different from breakers: price reacts but doesn&apos;t reverse &mdash; it continues the original direction</Bullet>
          </BulletList>
        </StageCard>

        {/* Visual Device: Hierarchy — PD Array Priority */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          PD Array Priority Ranking
        </h3>
        <p style={{ color: T.textMuted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          When multiple PD arrays overlap, higher-priority ones provide better entries:
        </p>
        <FlowRow>
          <FlowStep style={{ borderColor: T.accent }}>
            <div style={{ fontSize: '0.7rem', color: T.accent }}>Highest</div>
            Breaker + OTE
          </FlowStep>
          <FlowArrow>&rarr;</FlowArrow>
          <FlowStep style={{ borderColor: T.green }}>
            <div style={{ fontSize: '0.7rem', color: T.green }}>High</div>
            OB in OTE
          </FlowStep>
          <FlowArrow>&rarr;</FlowArrow>
          <FlowStep style={{ borderColor: T.amber }}>
            <div style={{ fontSize: '0.7rem', color: T.amber }}>Medium</div>
            FVG + CE
          </FlowStep>
          <FlowArrow>&rarr;</FlowArrow>
          <FlowStep style={{ borderColor: T.textDim }}>
            <div style={{ fontSize: '0.7rem', color: T.textDim }}>Lower</div>
            RB alone
          </FlowStep>
        </FlowRow>
      </SectionWrapper>

      {/* ═══ 10 — KILLZONES & ICT MACROS ═══ */}
      <SectionDivider />
      <SectionWrapper id="killzones">
        <SectionLabel>Timing</SectionLabel>
        <SectionTitle>Killzones & ICT Macros</SectionTitle>
        <SectionIntro>
          Algorithms deliver price at specific times. These windows are when
          the highest-probability setups form &mdash; and when the most liquidity gets swept.
        </SectionIntro>

        {/* Visual Device: Continuum — Killzones */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '2rem 0 1rem' }}>
          Killzones (EST / New York Time)
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: T.border, borderRadius: '12px', overflow: 'hidden', border: `1px solid ${T.border}`, margin: '1.5rem 0' }}>
          {[
            { zone: 'Asian KZ', time: '20:00–00:00', role: 'Consolidation / Range building', note: 'Defines the range for London to sweep. Mark the Asian highs and lows.', color: T.textDim },
            { zone: 'London KZ', time: '02:00–05:00', role: 'Manipulation / Judas Swing', note: 'The primary reversal window. Most consistent for all assets.', color: T.accent },
            { zone: 'NY AM KZ', time: '08:30–11:00', role: 'Expansion / Distribution', note: 'Bulk of daily range. News-driven. Maximum volatility.', color: T.green },
            { zone: 'NY Lunch', time: '12:00–13:30', role: 'Consolidation / Chop', note: 'Avoid. Low volume, erratic price action, stop hunts.', color: T.red },
            { zone: 'NY PM KZ', time: '13:30–16:00', role: 'Continuation or reversal', note: 'Can extend the daily move or reverse into close. Use with caution.', color: T.amber },
          ].map((kz, i) => (
            <div key={i} style={{ background: T.surface, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', fontWeight: 700, color: kz.color, minWidth: '100px' }}>{kz.zone}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: T.textMuted, minWidth: '110px' }}>{kz.time}</span>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{kz.role}</div>
                <div style={{ fontSize: '0.8rem', color: T.textDim }}>{kz.note}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ICT Macros */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          ICT Macro Windows
        </h3>
        <p style={{ color: T.textMuted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Specific 20–30 minute windows when the algorithm targets liquidity pools.
          These are the sniper windows inside each killzone.
        </p>

        <CardGrid>
          <CardItem>
            <CardNumber>Macro 01</CardNumber>
            <CardTitle>09:50 – 10:10</CardTitle>
            <CardDesc>Opening range liquidity sweep. Algorithms run stops from the 9:30 open, then reverse. The most common NY AM macro.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Macro 02</CardNumber>
            <CardTitle>10:50 – 11:10</CardTitle>
            <CardDesc>Second-wave liquidity run. Targets stops from the 10:10 reversal. Often extends or confirms the AM session direction.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Macro 03</CardNumber>
            <CardTitle>13:10 – 13:40</CardTitle>
            <CardDesc>Post-lunch liquidity grab. If the AM session left unfilled FVGs, this window often drives toward them.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Macro 04</CardNumber>
            <CardTitle>15:15 – 15:45</CardTitle>
            <CardDesc>End-of-day macro. Last algorithmic push before the 16:00 close. Can create or sweep the day&apos;s high/low.</CardDesc>
          </CardItem>
        </CardGrid>

        {/* Silver Bullet */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          The ICT Silver Bullet
        </h3>
        <TwoCol>
          <ColBox>
            <ColTitle>🥇 AM Silver Bullet</ColTitle>
            <CardDesc style={{ marginBottom: '1rem', color: T.textDim }}>10:00 – 11:00 EST</CardDesc>
            <BulletList>
              <Bullet>Wait for the 09:30–10:00 manipulation to complete</Bullet>
              <Bullet>Identify a FVG created during the manipulation move</Bullet>
              <Bullet>Enter on the FVG fill between 10:00–11:00</Bullet>
              <Bullet>Target: opposing liquidity pool or session high/low</Bullet>
              <Bullet>One of the most consistent intraday patterns in ICT</Bullet>
            </BulletList>
          </ColBox>
          <ColBox>
            <ColTitle>🥈 PM Silver Bullet</ColTitle>
            <CardDesc style={{ marginBottom: '1rem', color: T.textDim }}>14:00 – 15:00 EST</CardDesc>
            <BulletList>
              <Bullet>After the lunch consolidation, look for a new displacement</Bullet>
              <Bullet>A FVG forms on M1–M5 during the displacement</Bullet>
              <Bullet>Enter on the retrace into the FVG between 14:00–15:00</Bullet>
              <Bullet>Target: end-of-day liquidity or the day&apos;s draw on liquidity</Bullet>
              <Bullet>Lower probability than AM but still a clean pattern</Bullet>
            </BulletList>
          </ColBox>
        </TwoCol>

        <QuoteBlock>
          <QuoteText>&ldquo;Time is more important than price. If you&apos;re at the right price but the wrong time, the trade fails. If you&apos;re at the right time in the right zone, the trade works.&rdquo;</QuoteText>
          <QuoteAuthor>&mdash; ICT Concept</QuoteAuthor>
        </QuoteBlock>
      </SectionWrapper>

      {/* ═══ 11 — SMT DIVERGENCE ═══ */}
      <SectionDivider />
      <SectionWrapper id="smt">
        <SectionLabel>Correlation</SectionLabel>
        <SectionTitle>SMT Divergence & Correlation</SectionTitle>
        <SectionIntro>
          Smart Money Technique (SMT) divergence is how you confirm that a liquidity
          sweep is real. When correlated assets disagree, one of them is lying.
        </SectionIntro>

        {/* Visual Device: Comparison */}
        <TwoCol>
          <ColBox>
            <ColTitle>📈 Bullish SMT Divergence</ColTitle>
            <CardDesc style={{ marginBottom: '1rem', color: T.textDim, fontStyle: 'italic' }}>
              One asset makes a lower low, the correlated asset does not
            </CardDesc>
            <BulletList>
              <Bullet>Asset A sweeps a swing low (takes SSL)</Bullet>
              <Bullet>Asset B (positively correlated) holds its corresponding low</Bullet>
              <Bullet>The divergence signals that the sell-off is engineered, not real</Bullet>
              <Bullet>High-probability bullish reversal confirmation</Bullet>
            </BulletList>
          </ColBox>
          <ColBox>
            <ColTitle>📉 Bearish SMT Divergence</ColTitle>
            <CardDesc style={{ marginBottom: '1rem', color: T.textDim, fontStyle: 'italic' }}>
              One asset makes a higher high, the correlated asset does not
            </CardDesc>
            <BulletList>
              <Bullet>Asset A sweeps a swing high (takes BSL)</Bullet>
              <Bullet>Asset B (positively correlated) fails to make a new high</Bullet>
              <Bullet>The divergence signals the rally is a liquidity grab</Bullet>
              <Bullet>High-probability bearish reversal confirmation</Bullet>
            </BulletList>
          </ColBox>
        </TwoCol>

        {/* Common SMT Pairs */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          Common SMT Pairs
        </h3>
        <CardGrid>
          <CardItem>
            <CardNumber>Forex</CardNumber>
            <CardTitle>EUR/USD &harr; GBP/USD</CardTitle>
            <CardDesc>Positively correlated. If EUR/USD makes a new low but GBP/USD doesn&apos;t, bullish SMT.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Forex (Inverse)</CardNumber>
            <CardTitle>EUR/USD &harr; DXY</CardTitle>
            <CardDesc>Negatively correlated. If DXY makes a new high but EUR/USD holds its low, bullish SMT on EUR.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Indices</CardNumber>
            <CardTitle>ES (S&amp;P) &harr; NQ (Nasdaq)</CardTitle>
            <CardDesc>Positively correlated. Divergence between the two during a sweep = reversal signal.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Crypto</CardNumber>
            <CardTitle>BTC &harr; ETH</CardTitle>
            <CardDesc>Positively correlated. If BTC sweeps a low but ETH holds, bullish divergence for both.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Crypto (Alt)</CardNumber>
            <CardTitle>BTC &harr; SOL / BTC &harr; Total2</CardTitle>
            <CardDesc>Use Total2 (total crypto market cap minus BTC) for broader altcoin divergence reads.</CardDesc>
          </CardItem>
          <CardItem>
            <CardNumber>Cross-Asset</CardNumber>
            <CardTitle>DXY &harr; Everything Else</CardTitle>
            <CardDesc>Dollar strength inversely correlates with most risk assets. DXY divergence is a macro-level SMT signal.</CardDesc>
          </CardItem>
        </CardGrid>

        {/* Visual Device: Loop — How to use SMT */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          SMT Confirmation Process
        </h3>
        <LoopContainer>
          <LoopNode>Identify Sweep</LoopNode>
          <LoopArrow>&rarr;</LoopArrow>
          <LoopNode>Check Correlated Pair</LoopNode>
          <LoopArrow>&rarr;</LoopArrow>
          <LoopNode>Divergence?</LoopNode>
          <LoopArrow>&rarr;</LoopArrow>
          <LoopNode>Confirm with PD Array</LoopNode>
          <LoopArrow>&rarr;</LoopArrow>
          <LoopNode>Execute</LoopNode>
        </LoopContainer>

        <QuoteBlock>
          <QuoteText>&ldquo;When correlated markets diverge at liquidity levels, it&apos;s not random &mdash; it&apos;s the algorithm showing its hand.&rdquo;</QuoteText>
          <QuoteAuthor>&mdash; ICT Concept</QuoteAuthor>
        </QuoteBlock>
      </SectionWrapper>

      {/* ═══ 12 — IPDA & STANDARD DEVIATIONS ═══ */}
      <SectionDivider />
      <SectionWrapper id="ipda">
        <SectionLabel>Algorithm</SectionLabel>
        <SectionTitle>IPDA & Standard Deviations</SectionTitle>
        <SectionIntro>
          The Interbank Price Delivery Algorithm (IPDA) is ICT&apos;s framework for
          understanding that price delivery is not random &mdash; it&apos;s algorithmic,
          looking back at specific data ranges to determine the next target.
        </SectionIntro>

        {/* IPDA Data Ranges */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '2rem 0 1rem' }}>
          IPDA Data Ranges
        </h3>
        <p style={{ color: T.textMuted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          The algorithm references liquidity and PD arrays from these lookback windows.
          Mark the key levels from each range on your chart.
        </p>

        <StatGrid>
          <StatCell>
            <StatValue>20</StatValue>
            <StatLabel>Trading days &mdash; Short-term liquidity reference (1 month)</StatLabel>
          </StatCell>
          <StatCell>
            <StatValue>40</StatValue>
            <StatLabel>Trading days &mdash; Medium-term institutional range (2 months)</StatLabel>
          </StatCell>
          <StatCell>
            <StatValue>60</StatValue>
            <StatLabel>Trading days &mdash; Quarterly algorithmic lookback (3 months)</StatLabel>
          </StatCell>
        </StatGrid>

        <BulletList style={{ margin: '1.5rem 0' }}>
          <Bullet>Go back 20, 40, and 60 trading days from today</Bullet>
          <Bullet>Mark the highest high and lowest low within each range</Bullet>
          <Bullet>Identify any unfilled FVGs, unmitigated OBs, or untapped liquidity pools</Bullet>
          <Bullet>The algorithm will seek to deliver price to these levels &mdash; they are the draw on liquidity</Bullet>
          <Bullet>IPDA explains why price seemingly &ldquo;remembers&rdquo; levels from weeks or months ago</Bullet>
        </BulletList>

        {/* Standard Deviations */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          Standard Deviation Projections
        </h3>
        <p style={{ color: T.textMuted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          After a manipulation event (Judas swing), use the opening price as the
          anchor and project standard deviations to find expansion targets.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: T.border, borderRadius: '12px', overflow: 'hidden', border: `1px solid ${T.border}`, margin: '1.5rem 0' }}>
          {[
            { sd: 'Opening Price', desc: 'Midnight open (daily), session open, or weekly open', note: 'The anchor point for all projections', color: T.textMuted },
            { sd: '+/- 0.5 SD', desc: 'Asian range or initial accumulation boundary', note: 'Defines the consolidation range before manipulation', color: T.textDim },
            { sd: '+/- 1.0 SD', desc: 'Standard expansion target', note: 'Minimum expected move after confirmed manipulation', color: T.green },
            { sd: '+/- 1.5 SD', desc: 'Extended expansion', note: 'Common target on trend days with multiple killzone alignment', color: T.accent },
            { sd: '+/- 2.0 SD', desc: 'Full expansion / extreme target', note: 'Maximum expected daily range. Hit on high-impact news or strong profile days', color: T.amber },
            { sd: '+/- 2.5 SD', desc: 'Outlier move', note: 'Rare. Only on FOMC, NFP, or major geopolitical events', color: T.red },
          ].map((item, i) => (
            <div key={i} style={{ background: T.surface, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', fontWeight: 700, color: item.color, minWidth: '100px' }}>{item.sd}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.desc}</div>
                <div style={{ fontSize: '0.8rem', color: T.textDim }}>{item.note}</div>
              </div>
            </div>
          ))}
        </div>

        {/* The MMXM Model */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          Market Maker Model (MMXM)
        </h3>
        <p style={{ color: T.textMuted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          The complete framework for how market makers engineer price from
          accumulation to distribution. This is the meta-model that all profiles sit within.
        </p>

        <FlowRow>
          <FlowStep>
            <div style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>1</div>
            Original Consolidation
            <div style={{ fontSize: '0.7rem', color: T.textDim }}>Smart money accumulates</div>
          </FlowStep>
          <FlowArrow>&rarr;</FlowArrow>
          <FlowStep>
            <div style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>2</div>
            Smart Money Reversal
            <div style={{ fontSize: '0.7rem', color: T.textDim }}>Judas swing / liquidity sweep</div>
          </FlowStep>
          <FlowArrow>&rarr;</FlowArrow>
          <FlowStep>
            <div style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>3</div>
            Re-Distribution
            <div style={{ fontSize: '0.7rem', color: T.textDim }}>FVGs + displacement</div>
          </FlowStep>
          <FlowArrow>&rarr;</FlowArrow>
          <FlowStep>
            <div style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>4</div>
            Reversal Distribution
            <div style={{ fontSize: '0.7rem', color: T.textDim }}>Target liquidity pool reached</div>
          </FlowStep>
        </FlowRow>

        <BulletList style={{ margin: '2rem 0' }}>
          <Bullet><strong>Phase 1:</strong> Consolidation forms the range &mdash; mark the high and low. This is where stops accumulate.</Bullet>
          <Bullet><strong>Phase 2:</strong> Smart Money Reversal (SMR) &mdash; price sweeps one side of the range, takes liquidity, and reverses.</Bullet>
          <Bullet><strong>Phase 3:</strong> Aggressive displacement creates FVGs. Price re-distributes through the range with momentum.</Bullet>
          <Bullet><strong>Phase 4:</strong> Price reaches the opposing liquidity pool &mdash; the completion of the model.</Bullet>
        </BulletList>

        <QuoteBlock>
          <QuoteText>&ldquo;Price is not random. It is algorithmically delivered to where the most orders are resting &mdash; and that is always where stops are.&rdquo;</QuoteText>
          <QuoteAuthor>&mdash; ICT Concept</QuoteAuthor>
        </QuoteBlock>
      </SectionWrapper>

      {/* ═══ 13 — VISUAL COMMUNICATION (TRAIN) ═══ */}
      <SectionDivider />
      <SectionWrapper id="visual">
        <SectionLabel>Design</SectionLabel>
        <SectionTitle>Visual Communication</SectionTitle>
        <SectionIntro>
          Your brain processes charts 60,000× faster than text. The TRAIN system
          builds visual literacy that compounds — because cleaner charts produce
          cleaner decisions.
        </SectionIntro>

        {/* Visual Device: Scale — TRAIN Letters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: T.border, borderRadius: '12px', overflow: 'hidden', border: `1px solid ${T.border}`, margin: '2rem 0' }}>
          {[
            { letter: 'T', name: 'Typography', desc: 'Label your charts with consistent type. Every weight, size, and color choice communicates urgency, timeframe, or zone. A clean label hierarchy means instant reads under pressure.' },
            { letter: 'R', name: 'Restraint', desc: 'One color for premium, one for discount, one for equilibrium. Three is enough. Every extra indicator, trendline, or annotation dilutes the signal. Less noise, more edge.' },
            { letter: 'A', name: 'Alignment', desc: 'Anchor your analysis to the grid — session opens, midnight open, weekly open. Invisible alignment creates "clean charts" that build subconscious trust in your reads.' },
            { letter: 'I', name: 'Image Treatment', desc: 'Consistent chart screenshots. Same dark theme, same timeframe labels, same annotation style. When every chart looks the same, pattern recognition becomes automatic.' },
            { letter: 'N', name: 'Negative Space', desc: 'Don\'t fill every inch of your chart. Whitespace around PD arrays lets the zone breathe. The fewer markups on screen, the faster you process what matters.' },
          ].map((item, i) => (
            <div key={i} style={{ background: T.surface, padding: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '2rem',
                fontWeight: 800,
                background: T.gradientText,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                minWidth: '40px',
                lineHeight: 1,
              }}>
                {item.letter}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.35rem' }}>{item.name}</div>
                <div style={{ fontSize: '0.9rem', color: T.textMuted, lineHeight: 1.65 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Visual Devices Grid */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '3rem 0 1rem' }}>
          12 Visual Devices for Chart Analysis
        </h3>
        <p style={{ color: T.textMuted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Universal visual language — applied to market structure:
        </p>
        <DeviceGrid>
          {[
            { icon: '📏', name: 'Scale', desc: 'Timeframe = significance' },
            { icon: '⚖️', name: 'Comparison', desc: 'Premium vs. discount' },
            { icon: '🔮', name: 'Metaphor', desc: 'Judas swing = betrayal' },
            { icon: '🔁', name: 'Pattern', desc: 'AMD repeats everywhere' },
            { icon: '➡️', name: 'Flow', desc: 'Accumulate → Distribute' },
            { icon: '📚', name: 'Stacking', desc: 'Multi-TF confluence' },
            { icon: '📊', name: 'Continuum', desc: 'Session time spectrum' },
            { icon: '⭕', name: 'Venn', desc: 'Confluence requirements' },
            { icon: '🏗️', name: 'Hierarchy', desc: 'H4 → H1 → M15 → M1' },
            { icon: '📈', name: 'Cartesian', desc: 'Price × time charts' },
            { icon: '♻️', name: 'Loops', desc: 'Weekly profile cycle' },
            { icon: '🌈', name: 'Spectrum', desc: 'OB → BRK → FVG range' },
          ].map((d, i) => (
            <DeviceCell key={i}>
              <DeviceIcon>{d.icon}</DeviceIcon>
              <DeviceName>{d.name}</DeviceName>
              <DeviceDesc>{d.desc}</DeviceDesc>
            </DeviceCell>
          ))}
        </DeviceGrid>
      </SectionWrapper>

      {/* ═══ 14 — EVIDENCE ═══ */}
      <SectionDivider />
      <SectionWrapper id="evidence">
        <SectionLabel>Evidence</SectionLabel>
        <SectionTitle>The Data Behind It</SectionTitle>
        <SectionIntro>
          Every principle in this playbook is backed by observable market behavior
          and trader performance research. Here&apos;s what the data says.
        </SectionIntro>

        <StatGrid>
          <StatCell>
            <StatValue>3</StatValue>
            <StatLabel>Weekly profiles cover the entire candle taxonomy</StatLabel>
          </StatCell>
          <StatCell>
            <StatValue>3</StatValue>
            <StatLabel>Daily profiles map every intraday candle formation</StatLabel>
          </StatCell>
          <StatCell>
            <StatValue>5/5</StatValue>
            <StatLabel>Rating days within each profile (the 80/20 of execution)</StatLabel>
          </StatCell>
        </StatGrid>

        <StatGrid>
          <StatCell>
            <StatValue>60,000×</StatValue>
            <StatLabel>Your brain processes visuals faster than text — chart first, confirm second</StatLabel>
          </StatCell>
          <StatCell>
            <StatValue>66 days</StatValue>
            <StatLabel>How long it takes to make a behavior automatic (Lally, UCL)</StatLabel>
          </StatCell>
          <StatCell>
            <StatValue>42%</StatValue>
            <StatLabel>More likely to hit goals when written down (Dr. Matthews)</StatLabel>
          </StatCell>
        </StatGrid>

        <StatGrid>
          <StatCell>
            <StatValue>95%</StatValue>
            <StatLabel>Follow-through rate with accountability partner vs. 10% alone (ASTD)</StatLabel>
          </StatCell>
          <StatCell>
            <StatValue>37.78×</StatValue>
            <StatLabel>1% daily improvement compounded over one year (Atomic Habits)</StatLabel>
          </StatCell>
          <StatCell>
            <StatValue>76%</StatValue>
            <StatLabel>Of workers report burnout — systematic trading prevents grind (Gallup)</StatLabel>
          </StatCell>
        </StatGrid>

        <QuoteBlock>
          <QuoteText>&ldquo;The world doesn&apos;t reward people who are best at solving problems. It rewards people who communicate problems best.&rdquo;</QuoteText>
          <QuoteAuthor>— David Perell</QuoteAuthor>
        </QuoteBlock>

        <QuoteBlock>
          <QuoteText>&ldquo;If you can&apos;t describe what you are doing as a process, you don&apos;t know what you&apos;re doing.&rdquo;</QuoteText>
          <QuoteAuthor>— W. Edwards Deming</QuoteAuthor>
        </QuoteBlock>

        <QuoteBlock>
          <QuoteText>&ldquo;Compound interest is the eighth wonder of the world. He who understands it, earns it.&rdquo;</QuoteText>
          <QuoteAuthor>— Albert Einstein</QuoteAuthor>
        </QuoteBlock>
      </SectionWrapper>

      {/* ═══ 15 — GLOSSARY ═══ */}
      <SectionDivider />
      <SectionWrapper id="glossary">
        <SectionLabel>Reference</SectionLabel>
        <SectionTitle>ICT Quick Reference</SectionTitle>
        <SectionIntro>
          Every abbreviation and acronym used in ICT methodology — decoded.
          Bookmark this page.
        </SectionIntro>

        {/* Structure & Price Action */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: T.accent, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', marginBottom: '1rem', textTransform: 'uppercase' }}>Structure &amp; Price Action</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem' }}>
            {[
              ['MSS', 'Market Structure Shift', 'Confirmed change of trend direction via displacement through a key swing point'],
              ['BOS', 'Break of Structure', 'Price breaks a previous swing high/low, confirming continuation of current trend'],
              ['STH / STL', 'Short Term High / Low', 'Minor swing points on LTF — used for entries and stop placement'],
              ['ITH / ITL', 'Intermediate Term High / Low', 'Mid-range swing points — define the current dealing range'],
              ['LTH / LTL', 'Long Term High / Low', 'Major HTF swing points — define primary trend direction'],
              ['OHLC', 'Open, High, Low, Close', 'The four price points of any candle — the foundation of all analysis'],
              ['IOF', 'Institutional Order Flow', 'The direction smart money is actively transacting — confirmed by displacement'],
            ].map(([abbr, full, desc]) => (
              <div key={abbr} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '0.75rem 1rem', borderLeft: `2px solid ${T.accent}` }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', fontWeight: 700, color: T.accent }}>{abbr}</span>
                  <span style={{ fontSize: '0.75rem', color: T.textMuted }}>{full}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: T.textDim, lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Liquidity */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: T.green, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', marginBottom: '1rem', textTransform: 'uppercase' }}>Liquidity</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem' }}>
            {[
              ['BSL', 'Buyside Liquidity', 'Resting stop losses above swing highs — target for smart money sells'],
              ['SSL', 'Sellside Liquidity', 'Resting stop losses below swing lows — target for smart money buys'],
              ['EQH', 'Equal Highs', 'Two or more highs at the same level — a liquidity magnet'],
              ['EQL', 'Equal Lows', 'Two or more lows at the same level — obvious sellside pool'],
              ['PDH / PDL', 'Previous Day High / Low', 'Key daily liquidity references — magnets in the current session'],
              ['PWH / PWL', 'Previous Week High / Low', 'Weekly liquidity pools — used for HTF bias confirmation'],
              ['IDM', 'Inducement', 'A minor liquidity sweep designed to trap traders before the real move'],
              ['DOL', 'Draw on Liquidity', 'The target pool price is being attracted toward — your directional bias'],
            ].map(([abbr, full, desc]) => (
              <div key={abbr} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '0.75rem 1rem', borderLeft: `2px solid ${T.green}` }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', fontWeight: 700, color: T.green }}>{abbr}</span>
                  <span style={{ fontSize: '0.75rem', color: T.textMuted }}>{full}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: T.textDim, lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PD Arrays & Inefficiencies */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: T.red, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', marginBottom: '1rem', textTransform: 'uppercase' }}>PD Arrays &amp; Inefficiencies</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem' }}>
            {[
              ['FVG', 'Fair Value Gap', '3-candle pattern with an imbalance between candle 1 and candle 3 — price seeks to fill'],
              ['BISI', 'Buyside Imbalance, Sellside Inefficiency', 'A bullish FVG — created by upward displacement'],
              ['SIBI', 'Sellside Imbalance, Buyside Inefficiency', 'A bearish FVG — created by downward displacement'],
              ['OB', 'Order Block', 'Last opposing candle before displacement — where institutions loaded orders'],
              ['BB', 'Breaker Block', 'A failed order block that inverts into support/resistance'],
              ['MB', 'Mitigation Block', 'A previously unmitigated OB that price returns to — one-touch reaction'],
              ['VI', 'Volume Imbalance', 'Gap between consecutive candle bodies — a single-candle FVG'],
              ['CE', 'Consequent Encroachment', '50% level of an FVG — the mean of any inefficiency'],
              ['MTH', 'Mean Threshold', '50% level of an order block — optimal entry within the OB body'],
            ].map(([abbr, full, desc]) => (
              <div key={abbr} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '0.75rem 1rem', borderLeft: `2px solid ${T.red}` }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', fontWeight: 700, color: T.red }}>{abbr}</span>
                  <span style={{ fontSize: '0.75rem', color: T.textMuted }}>{full}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: T.textDim, lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Models & Frameworks */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a78bfa', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', marginBottom: '1rem', textTransform: 'uppercase' }}>Models &amp; Frameworks</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem' }}>
            {[
              ['MMBM', 'Market Maker Buy Model', 'The algorithmic pattern for accumulation → smart money longs'],
              ['MMSM', 'Market Maker Sell Model', 'The algorithmic pattern for distribution → smart money shorts'],
              ['PO3', 'Power of Three', 'Every candle is Accumulation → Manipulation → Distribution (AMD)'],
              ['AMD', 'Accumulation, Manipulation, Distribution', 'The three phases of every price move at every timeframe'],
              ['OTE', 'Optimal Trade Entry', 'The 62%–79% retracement zone of a displacement leg — highest R:R zone'],
              ['SMT', 'Smart Money Technique', 'Divergence between correlated assets confirming reversal'],
              ['POI', 'Point of Interest', 'A confluent price level with multiple reasons to engage'],
              ['STDV', 'Standard Deviation', 'Measured move projection from the initial dealing range'],
            ].map(([abbr, full, desc]) => (
              <div key={abbr} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '0.75rem 1rem', borderLeft: '2px solid #a78bfa' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', fontWeight: 700, color: '#a78bfa' }}>{abbr}</span>
                  <span style={{ fontSize: '0.75rem', color: T.textMuted }}>{full}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: T.textDim, lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Time & Sessions */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', marginBottom: '1rem', textTransform: 'uppercase' }}>Time &amp; Sessions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem' }}>
            {[
              ['MOP', 'Midnight Opening Price', 'The 00:00 EST open — the reference level for premium/discount on the day'],
              ['HTF', 'High Timeframe', 'Weekly, daily, 4H — used for directional bias and narrative'],
              ['LTF', 'Low Timeframe', '15m, 5m, 1m — used for entries, confirmations, and precision'],
              ['LO', 'London Open Kill Zone', '2:00–5:00 AM EST — first major liquidity injection of the day'],
              ['NYKZ', 'New York Kill Zone', '9:30–11:00 AM EST — highest volume and volatility window'],
              ['NYL', 'New York Lunch', '12:00–1:00 PM EST — consolidation / manipulation zone'],
              ['LC', 'London Close Kill Zone', '10:00 AM–12:00 PM EST — final directional push before lunch'],
            ].map(([abbr, full, desc]) => (
              <div key={abbr} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '0.75rem 1rem', borderLeft: '2px solid #fbbf24' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24' }}>{abbr}</span>
                  <span style={{ fontSize: '0.75rem', color: T.textMuted }}>{full}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: T.textDim, lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* ═══ 16 — MSS VISUALS ═══ */}
      <SectionDivider />
      <SectionWrapper id="mssvisual">
        <SectionLabel>Visuals</SectionLabel>
        <SectionTitle>Structure &amp; Inefficiency Visuals</SectionTitle>
        <SectionIntro>
          How market structure actually shifts — and how breaker blocks form from failed order blocks.
          These are the displacement patterns that confirm smart money has committed.
        </SectionIntro>

        {/* Bullish MSS */}
        <ChartContainer style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: T.textMain, marginBottom: '0.15rem' }}>Bullish Market Structure Shift</div>
          <div style={{ fontSize: '0.7rem', color: T.textDim, marginBottom: '1.5rem' }}>downtrend → displacement through previous STH → trend reversal confirmed</div>
          <div style={{ position: 'relative', height: 180, display: 'flex', alignItems: 'flex-end', gap: 6, padding: '0 1rem' }}>
            {/* Downtrend candles */}
            <div style={{ position: 'relative', width: 14, height: 180 }}>
              <div style={{ position: 'absolute', left: 6, bottom: 80, width: 2, height: 70, background: T.red }} />
              <div style={{ position: 'absolute', left: 2, bottom: 85, width: 10, height: 40, background: T.red, borderRadius: 2 }} />
            </div>
            <div style={{ position: 'relative', width: 14, height: 180 }}>
              <div style={{ position: 'absolute', left: 6, bottom: 60, width: 2, height: 65, background: T.red }} />
              <div style={{ position: 'absolute', left: 2, bottom: 65, width: 10, height: 35, background: T.red, borderRadius: 2 }} />
            </div>
            {/* STH bounce */}
            <div style={{ position: 'relative', width: 14, height: 180 }}>
              <div style={{ position: 'absolute', left: 6, bottom: 50, width: 2, height: 60, background: T.green }} />
              <div style={{ position: 'absolute', left: 2, bottom: 70, width: 10, height: 30, background: T.green, borderRadius: 2 }} />
            </div>
            {/* Lower low */}
            <div style={{ position: 'relative', width: 14, height: 180 }}>
              <div style={{ position: 'absolute', left: 6, bottom: 40, width: 2, height: 55, background: T.red }} />
              <div style={{ position: 'absolute', left: 2, bottom: 45, width: 10, height: 30, background: T.red, borderRadius: 2 }} />
            </div>
            {/* SSL sweep — the low */}
            <div style={{ position: 'relative', width: 16, height: 180 }}>
              <div style={{ position: 'absolute', left: 7, bottom: 15, width: 2, height: 80, background: T.green }} />
              <div style={{ position: 'absolute', left: 2, bottom: 55, width: 12, height: 35, background: T.green, borderRadius: 2 }} />
              <div style={{ position: 'absolute', left: -4, bottom: 12, width: 24, height: 16, border: `1px dashed ${T.green}`, borderRadius: 4 }} />
            </div>
            {/* Displacement candle through STH */}
            <div style={{ position: 'relative', width: 16, height: 180 }}>
              <div style={{ position: 'absolute', left: 7, bottom: 60, width: 2, height: 100, background: T.green }} />
              <div style={{ position: 'absolute', left: 2, bottom: 75, width: 12, height: 70, background: T.green, borderRadius: 2 }} />
            </div>
            {/* Continuation */}
            <div style={{ position: 'relative', width: 14, height: 180 }}>
              <div style={{ position: 'absolute', left: 6, bottom: 110, width: 2, height: 55, background: T.green }} />
              <div style={{ position: 'absolute', left: 2, bottom: 120, width: 10, height: 35, background: T.green, borderRadius: 2 }} />
            </div>
            <div style={{ position: 'relative', width: 14, height: 180 }}>
              <div style={{ position: 'absolute', left: 6, bottom: 125, width: 2, height: 45, background: T.green }} />
              <div style={{ position: 'absolute', left: 2, bottom: 135, width: 10, height: 28, background: T.green, borderRadius: 2 }} />
            </div>
            {/* STH dashed line */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 100, height: 0, borderTop: `1px dashed rgba(255,255,255,0.2)` }} />
            <div style={{ position: 'absolute', right: 8, bottom: 102, fontSize: '0.6rem', color: T.textDim, fontFamily: "'JetBrains Mono', monospace" }}>STH</div>
            {/* SSL label */}
            <div style={{ position: 'absolute', left: 60, bottom: 4, fontSize: '0.6rem', color: T.green, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>SSL sweep</div>
            {/* MSS label */}
            <div style={{ position: 'absolute', left: '55%', bottom: 102, fontSize: '0.65rem', color: T.accent, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>MSS ↑</div>
          </div>
        </ChartContainer>

        {/* Bearish MSS */}
        <ChartContainer style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: T.textMain, marginBottom: '0.15rem' }}>Bearish Market Structure Shift</div>
          <div style={{ fontSize: '0.7rem', color: T.textDim, marginBottom: '1.5rem' }}>uptrend → displacement through previous STL → trend reversal confirmed</div>
          <div style={{ position: 'relative', height: 180, display: 'flex', alignItems: 'flex-end', gap: 6, padding: '0 1rem' }}>
            {/* Uptrend candles */}
            <div style={{ position: 'relative', width: 14, height: 180 }}>
              <div style={{ position: 'absolute', left: 6, bottom: 30, width: 2, height: 65, background: T.green }} />
              <div style={{ position: 'absolute', left: 2, bottom: 50, width: 10, height: 35, background: T.green, borderRadius: 2 }} />
            </div>
            <div style={{ position: 'relative', width: 14, height: 180 }}>
              <div style={{ position: 'absolute', left: 6, bottom: 55, width: 2, height: 70, background: T.green }} />
              <div style={{ position: 'absolute', left: 2, bottom: 75, width: 10, height: 40, background: T.green, borderRadius: 2 }} />
            </div>
            {/* STL pullback */}
            <div style={{ position: 'relative', width: 14, height: 180 }}>
              <div style={{ position: 'absolute', left: 6, bottom: 60, width: 2, height: 55, background: T.red }} />
              <div style={{ position: 'absolute', left: 2, bottom: 60, width: 10, height: 30, background: T.red, borderRadius: 2 }} />
            </div>
            {/* Higher high */}
            <div style={{ position: 'relative', width: 14, height: 180 }}>
              <div style={{ position: 'absolute', left: 6, bottom: 80, width: 2, height: 65, background: T.green }} />
              <div style={{ position: 'absolute', left: 2, bottom: 100, width: 10, height: 35, background: T.green, borderRadius: 2 }} />
            </div>
            {/* BSL sweep — the high */}
            <div style={{ position: 'relative', width: 16, height: 180 }}>
              <div style={{ position: 'absolute', left: 7, bottom: 80, width: 2, height: 85, background: T.red }} />
              <div style={{ position: 'absolute', left: 2, bottom: 80, width: 12, height: 40, background: T.red, borderRadius: 2 }} />
              <div style={{ position: 'absolute', left: -4, bottom: 148, width: 24, height: 16, border: `1px dashed ${T.red}`, borderRadius: 4 }} />
            </div>
            {/* Displacement candle through STL */}
            <div style={{ position: 'relative', width: 16, height: 180 }}>
              <div style={{ position: 'absolute', left: 7, bottom: 10, width: 2, height: 100, background: T.red }} />
              <div style={{ position: 'absolute', left: 2, bottom: 10, width: 12, height: 70, background: T.red, borderRadius: 2 }} />
            </div>
            {/* Continuation */}
            <div style={{ position: 'relative', width: 14, height: 180 }}>
              <div style={{ position: 'absolute', left: 6, bottom: 5, width: 2, height: 40, background: T.red }} />
              <div style={{ position: 'absolute', left: 2, bottom: 5, width: 10, height: 25, background: T.red, borderRadius: 2 }} />
            </div>
            {/* STL dashed line */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 60, height: 0, borderTop: `1px dashed rgba(255,255,255,0.2)` }} />
            <div style={{ position: 'absolute', right: 8, bottom: 62, fontSize: '0.6rem', color: T.textDim, fontFamily: "'JetBrains Mono', monospace" }}>STL</div>
            {/* BSL label */}
            <div style={{ position: 'absolute', left: 80, top: 4, fontSize: '0.6rem', color: T.red, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>BSL sweep</div>
            {/* MSS label */}
            <div style={{ position: 'absolute', left: '55%', bottom: 62, fontSize: '0.65rem', color: T.accent, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>MSS ↓</div>
          </div>
        </ChartContainer>

        {/* Breaker Block Formation */}
        <ChartContainer style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: T.textMain, marginBottom: '0.15rem' }}>Breaker Block Formation</div>
          <div style={{ fontSize: '0.7rem', color: T.textDim, marginBottom: '1.5rem' }}>order block fails → becomes opposing S/R → high-probability re-entry zone</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Bullish Breaker */}
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.green, fontFamily: "'JetBrains Mono', monospace", marginBottom: '0.75rem' }}>BULLISH BREAKER</div>
              <div style={{ position: 'relative', height: 140, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                {/* Move down, OB forms */}
                <div style={{ position: 'relative', width: 12, height: 140 }}>
                  <div style={{ position: 'absolute', left: 5, bottom: 50, width: 2, height: 55, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 55, width: 10, height: 35, background: T.red, borderRadius: 1.5 }} />
                </div>
                {/* The -OB that fails */}
                <div style={{ position: 'relative', width: 14, height: 140 }}>
                  <div style={{ position: 'absolute', left: 6, bottom: 30, width: 2, height: 50, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 30, width: 12, height: 30, background: T.red, borderRadius: 2 }} />
                  <div style={{ position: 'absolute', left: -3, bottom: 28, width: 20, height: 34, border: `1.5px dashed rgba(239,68,68,0.6)`, borderRadius: 4 }} />
                </div>
                {/* Bounce */}
                <div style={{ position: 'relative', width: 12, height: 140 }}>
                  <div style={{ position: 'absolute', left: 5, bottom: 35, width: 2, height: 60, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 60, width: 10, height: 28, background: T.green, borderRadius: 1.5 }} />
                </div>
                {/* Price breaks OB → now breaker */}
                <div style={{ position: 'relative', width: 14, height: 140 }}>
                  <div style={{ position: 'absolute', left: 6, bottom: 25, width: 2, height: 90, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 50, width: 12, height: 60, background: T.green, borderRadius: 2 }} />
                </div>
                {/* Return to breaker */}
                <div style={{ position: 'relative', width: 12, height: 140 }}>
                  <div style={{ position: 'absolute', left: 5, bottom: 55, width: 2, height: 45, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 55, width: 10, height: 25, background: T.red, borderRadius: 1.5 }} />
                </div>
                {/* Bounce off breaker = entry */}
                <div style={{ position: 'relative', width: 14, height: 140 }}>
                  <div style={{ position: 'absolute', left: 6, bottom: 55, width: 2, height: 70, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 70, width: 12, height: 50, background: T.green, borderRadius: 2 }} />
                  <div style={{ position: 'absolute', left: -3, bottom: 53, width: 20, height: 20, border: `1.5px dashed ${T.green}`, borderRadius: 4 }} />
                </div>
                {/* Breaker zone */}
                <div style={{ position: 'absolute', left: 10, right: 10, bottom: 55, height: 8, background: 'rgba(74,222,128,0.15)', border: `1px solid rgba(74,222,128,0.3)`, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: '0.6rem', color: T.textDim, marginTop: '0.5rem', textAlign: 'center' }}>failed &minus;OB → support (breaker)</div>
            </div>
            {/* Bearish Breaker */}
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.red, fontFamily: "'JetBrains Mono', monospace", marginBottom: '0.75rem' }}>BEARISH BREAKER</div>
              <div style={{ position: 'relative', height: 140, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ position: 'relative', width: 12, height: 140 }}>
                  <div style={{ position: 'absolute', left: 5, bottom: 40, width: 2, height: 60, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 60, width: 10, height: 30, background: T.green, borderRadius: 1.5 }} />
                </div>
                {/* +OB that fails */}
                <div style={{ position: 'relative', width: 14, height: 140 }}>
                  <div style={{ position: 'absolute', left: 6, bottom: 60, width: 2, height: 55, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 75, width: 12, height: 30, background: T.green, borderRadius: 2 }} />
                  <div style={{ position: 'absolute', left: -3, bottom: 73, width: 20, height: 34, border: `1.5px dashed rgba(74,222,128,0.6)`, borderRadius: 4 }} />
                </div>
                {/* Pullback */}
                <div style={{ position: 'relative', width: 12, height: 140 }}>
                  <div style={{ position: 'absolute', left: 5, bottom: 55, width: 2, height: 50, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 55, width: 10, height: 28, background: T.red, borderRadius: 1.5 }} />
                </div>
                {/* Break through OB → breaker */}
                <div style={{ position: 'relative', width: 14, height: 140 }}>
                  <div style={{ position: 'absolute', left: 6, bottom: 5, width: 2, height: 95, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 5, width: 12, height: 60, background: T.red, borderRadius: 2 }} />
                </div>
                {/* Return to breaker */}
                <div style={{ position: 'relative', width: 12, height: 140 }}>
                  <div style={{ position: 'absolute', left: 5, bottom: 50, width: 2, height: 45, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 70, width: 10, height: 22, background: T.green, borderRadius: 1.5 }} />
                </div>
                {/* Reject off breaker = entry */}
                <div style={{ position: 'relative', width: 14, height: 140 }}>
                  <div style={{ position: 'absolute', left: 6, bottom: 5, width: 2, height: 75, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 5, width: 12, height: 50, background: T.red, borderRadius: 2 }} />
                  <div style={{ position: 'absolute', left: -3, bottom: 68, width: 20, height: 18, border: `1.5px dashed ${T.red}`, borderRadius: 4 }} />
                </div>
                {/* Breaker zone */}
                <div style={{ position: 'absolute', left: 10, right: 10, bottom: 78, height: 8, background: 'rgba(239,68,68,0.15)', border: `1px solid rgba(239,68,68,0.3)`, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: '0.6rem', color: T.textDim, marginTop: '0.5rem', textAlign: 'center' }}>failed +OB → resistance (breaker)</div>
            </div>
          </div>
        </ChartContainer>

        {/* BOS vs MSS comparison */}
        <TwoCol>
          <ColBox>
            <ColTitle style={{ color: T.accent }}>BOS — Break of Structure</ColTitle>
            <BulletList>
              <Bullet>Price breaks a swing point in the <strong>direction of the existing trend</strong></Bullet>
              <Bullet>Confirms continuation — not reversal</Bullet>
              <Bullet>Bullish BOS: HH breaks above previous HH</Bullet>
              <Bullet>Bearish BOS: LL breaks below previous LL</Bullet>
              <Bullet>Wait for displacement + close beyond the level</Bullet>
            </BulletList>
          </ColBox>
          <ColBox>
            <ColTitle style={{ color: '#f59e0b' }}>MSS — Market Structure Shift</ColTitle>
            <BulletList>
              <Bullet>Price breaks a swing point <strong>against the existing trend</strong></Bullet>
              <Bullet>Confirms reversal — trend direction has changed</Bullet>
              <Bullet>Bullish MSS: price breaks above a STH after sweeping SSL</Bullet>
              <Bullet>Bearish MSS: price breaks below a STL after sweeping BSL</Bullet>
              <Bullet>Must be accompanied by displacement (strong candle body, not wick)</Bullet>
            </BulletList>
          </ColBox>
        </TwoCol>

      </SectionWrapper>

      {/* ═══ 17 — ENTRY ENGINEERING ═══ */}
      <SectionDivider />
      <SectionWrapper id="entryeng">
        <SectionLabel>Execution</SectionLabel>
        <SectionTitle>Entry &amp; Stop Engineering</SectionTitle>
        <SectionIntro>
          Precision entries and intelligent stop placement — the difference between a good idea
          and a profitable trade. Every pip of stop width is risk; every pip of precision is edge.
        </SectionIntro>

        {/* Entry Types Visual — Enhanced */}
        <ChartContainer style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.15rem' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: T.text }}>Entry Types</div>
            <div style={{ fontSize: '0.55rem', fontWeight: 600, color: T.accent, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 20, padding: '2px 8px', letterSpacing: '0.06em' }}>FVG / PD ARRAY</div>
          </div>
          <div style={{ fontSize: '0.7rem', color: T.textDim, marginBottom: '1.5rem' }}>3 ways to engage an FVG / PD array — choose based on conviction, volatility, and session context</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>

            {/* Complete Fill */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(74,222,128,0.3)', borderRadius: 10, padding: '1rem 0.75rem 0.75rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.5rem', fontWeight: 700, color: T.green, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em' }}>CONSERVATIVE</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: T.green, marginBottom: '0.25rem' }}>Complete Fill</div>
              <div style={{ fontSize: '0.55rem', color: T.textMuted, marginBottom: '0.75rem', fontStyle: 'italic' }}>wait for price to fully fill the imbalance</div>
              <div style={{ position: 'relative', height: 200, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 4 }}>
                {/* Initial bullish candle */}
                <div style={{ position: 'relative', width: 11, height: 200 }}>
                  <div style={{ position: 'absolute', left: 4.5, bottom: 100, width: 2, height: 55, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 110, width: 9, height: 35, background: T.green, borderRadius: 1.5 }} />
                </div>
                {/* Big bearish displacement */}
                <div style={{ position: 'relative', width: 14, height: 200 }}>
                  <div style={{ position: 'absolute', left: 6, bottom: 22, width: 2, height: 135, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 22, width: 12, height: 95, background: T.red, borderRadius: 2 }} />
                </div>
                {/* Consolidation */}
                <div style={{ position: 'relative', width: 9, height: 200 }}>
                  <div style={{ position: 'absolute', left: 3.5, bottom: 55, width: 2, height: 30, background: 'transparent', border: `1px solid ${T.textDim}` }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 60, width: 7, height: 15, background: 'transparent', border: `1px solid ${T.textDim}`, borderRadius: 1 }} />
                </div>
                <div style={{ position: 'relative', width: 11, height: 200 }}>
                  <div style={{ position: 'absolute', left: 4.5, bottom: 38, width: 2, height: 45, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 43, width: 9, height: 25, background: T.red, borderRadius: 1 }} />
                </div>
                <div style={{ position: 'relative', width: 9, height: 200 }}>
                  <div style={{ position: 'absolute', left: 3.5, bottom: 26, width: 2, height: 25, background: 'transparent', border: `1px solid ${T.textDim}` }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 30, width: 7, height: 12, background: 'transparent', border: `1px solid ${T.textDim}`, borderRadius: 1 }} />
                </div>
                {/* Entry candle fills the gap */}
                <div style={{ position: 'relative', width: 11, height: 200 }}>
                  <div style={{ position: 'absolute', left: 4.5, bottom: 6, width: 2, height: 50, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 6, width: 9, height: 30, background: T.red, borderRadius: 1 }} />
                </div>
                {/* FVG zone */}
                <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: 6, height: 24, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 3 }} />
                {/* Entry arrow */}
                <div style={{ position: 'absolute', right: 6, bottom: 9, fontSize: '0.55rem', fontWeight: 700, color: T.green }}>▸ entry</div>
                {/* SL line */}
                <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: 0, height: 0, borderTop: `1.5px dashed ${T.red}` }} />
                <div style={{ position: 'absolute', left: '8%', bottom: -10, fontSize: '0.45rem', color: T.red, fontFamily: "'JetBrains Mono', monospace" }}>SL</div>
                {/* TP zone */}
                <div style={{ position: 'absolute', left: '8%', right: '8%', top: 15, height: 0, borderTop: `1.5px dashed ${T.green}` }} />
                <div style={{ position: 'absolute', left: '8%', top: 5, fontSize: '0.45rem', color: T.green, fontFamily: "'JetBrains Mono', monospace" }}>TP</div>
              </div>
              {/* Stats row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', padding: '0.4rem 0.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: T.green }}>~75%</div>
                  <div style={{ fontSize: '0.45rem', color: T.textDim }}>fill rate</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: T.accent }}>2–4R</div>
                  <div style={{ fontSize: '0.45rem', color: T.textDim }}>avg R:R</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: T.amber }}>Widest</div>
                  <div style={{ fontSize: '0.45rem', color: T.textDim }}>SL width</div>
                </div>
              </div>
              <div style={{ fontSize: '0.55rem', color: T.textDim, marginTop: '0.35rem', lineHeight: 1.5 }}>Highest probability. Best for low-conviction setups, choppy sessions, or when the FVG is small. You sacrifice R:R for certainty.</div>
            </div>

            {/* Consequent Encroachment */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(34,211,238,0.3)', borderRadius: 10, padding: '1rem 0.75rem 0.75rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.5rem', fontWeight: 700, color: T.accent, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em' }}>BALANCED</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: T.accent, marginBottom: '0.25rem' }}>Consequent Encroachment</div>
              <div style={{ fontSize: '0.55rem', color: T.textMuted, marginBottom: '0.75rem', fontStyle: 'italic' }}>enter at the 50% midpoint of the FVG</div>
              <div style={{ position: 'relative', height: 200, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 4 }}>
                {/* Upward candles */}
                <div style={{ position: 'relative', width: 9, height: 200 }}>
                  <div style={{ position: 'absolute', left: 3.5, bottom: 125, width: 2, height: 40, background: 'transparent', border: `1px solid ${T.textDim}` }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 130, width: 7, height: 20, background: 'transparent', border: `1px solid ${T.textDim}`, borderRadius: 1 }} />
                </div>
                <div style={{ position: 'relative', width: 11, height: 200 }}>
                  <div style={{ position: 'absolute', left: 4.5, bottom: 130, width: 2, height: 50, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 135, width: 9, height: 32, background: T.red, borderRadius: 1 }} />
                </div>
                <div style={{ position: 'relative', width: 9, height: 200 }}>
                  <div style={{ position: 'absolute', left: 3.5, bottom: 115, width: 2, height: 30, background: 'transparent', border: `1px solid ${T.textDim}` }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 120, width: 7, height: 15, background: 'transparent', border: `1px solid ${T.textDim}`, borderRadius: 1 }} />
                </div>
                {/* Big bearish displacement */}
                <div style={{ position: 'relative', width: 14, height: 200 }}>
                  <div style={{ position: 'absolute', left: 6, bottom: 30, width: 2, height: 130, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 30, width: 12, height: 85, background: T.red, borderRadius: 2 }} />
                </div>
                {/* Retrace candles */}
                <div style={{ position: 'relative', width: 9, height: 200 }}>
                  <div style={{ position: 'absolute', left: 3.5, bottom: 48, width: 2, height: 35, background: 'transparent', border: `1px solid ${T.textDim}` }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 53, width: 7, height: 16, background: 'transparent', border: `1px solid ${T.textDim}`, borderRadius: 1 }} />
                </div>
                <div style={{ position: 'relative', width: 11, height: 200 }}>
                  <div style={{ position: 'absolute', left: 4.5, bottom: 22, width: 2, height: 55, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 22, width: 9, height: 30, background: T.red, borderRadius: 1 }} />
                </div>
                {/* FVG zone */}
                <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: 58, height: 32, background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 3 }} />
                {/* CE dashed line at 50% */}
                <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: 74, height: 0, borderTop: '1.5px dashed rgba(34,211,238,0.6)' }} />
                <div style={{ position: 'absolute', right: 6, bottom: 68, fontSize: '0.55rem', fontWeight: 700, color: T.accent }}>▸ CE entry</div>
                {/* SL line */}
                <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: 52, height: 0, borderTop: `1.5px dashed ${T.red}` }} />
                <div style={{ position: 'absolute', left: '8%', bottom: 42, fontSize: '0.45rem', color: T.red, fontFamily: "'JetBrains Mono', monospace" }}>SL</div>
                {/* TP zone */}
                <div style={{ position: 'absolute', left: '8%', right: '8%', top: 10, height: 0, borderTop: `1.5px dashed ${T.green}` }} />
                <div style={{ position: 'absolute', left: '8%', top: 0, fontSize: '0.45rem', color: T.green, fontFamily: "'JetBrains Mono', monospace" }}>TP</div>
              </div>
              {/* Stats row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', padding: '0.4rem 0.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: T.accent }}>~90%</div>
                  <div style={{ fontSize: '0.45rem', color: T.textDim }}>fill rate</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: T.green }}>3–6R</div>
                  <div style={{ fontSize: '0.45rem', color: T.textDim }}>avg R:R</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: T.accent }}>Medium</div>
                  <div style={{ fontSize: '0.45rem', color: T.textDim }}>SL width</div>
                </div>
              </div>
              <div style={{ fontSize: '0.55rem', color: T.textDim, marginTop: '0.35rem', lineHeight: 1.5 }}>The sweet spot. Best for most setups — good fill probability with a meaningful R:R. Default choice when HTF alignment is clear.</div>
            </div>

            {/* Entry Drill (FVG Edge) */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '1rem 0.75rem 0.75rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.5rem', fontWeight: 700, color: T.red, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em' }}>AGGRESSIVE</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: T.red, marginBottom: '0.25rem' }}>FVG Edge / Drill</div>
              <div style={{ fontSize: '0.55rem', color: T.textMuted, marginBottom: '0.75rem', fontStyle: 'italic' }}>enter at the nearest edge of the FVG</div>
              <div style={{ position: 'relative', height: 200, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 4 }}>
                {/* Top candles */}
                <div style={{ position: 'relative', width: 9, height: 200 }}>
                  <div style={{ position: 'absolute', left: 3.5, bottom: 150, width: 2, height: 35, background: 'transparent', border: `1px solid ${T.textDim}` }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 155, width: 7, height: 17, background: 'transparent', border: `1px solid ${T.textDim}`, borderRadius: 1 }} />
                </div>
                <div style={{ position: 'relative', width: 9, height: 200 }}>
                  <div style={{ position: 'absolute', left: 3.5, bottom: 145, width: 2, height: 40, background: 'transparent', border: `1px solid ${T.textDim}` }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 150, width: 7, height: 20, background: 'transparent', border: `1px solid ${T.textDim}`, borderRadius: 1 }} />
                </div>
                {/* Bearish displacement */}
                <div style={{ position: 'relative', width: 14, height: 200 }}>
                  <div style={{ position: 'absolute', left: 6, bottom: 40, width: 2, height: 125, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 40, width: 12, height: 80, background: T.red, borderRadius: 2 }} />
                </div>
                {/* Recovery */}
                <div style={{ position: 'relative', width: 9, height: 200 }}>
                  <div style={{ position: 'absolute', left: 3.5, bottom: 55, width: 2, height: 38, background: 'transparent', border: `1px solid ${T.textDim}` }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 60, width: 7, height: 20, background: 'transparent', border: `1px solid ${T.textDim}`, borderRadius: 1 }} />
                </div>
                <div style={{ position: 'relative', width: 11, height: 200 }}>
                  <div style={{ position: 'absolute', left: 4.5, bottom: 30, width: 2, height: 60, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 30, width: 9, height: 32, background: T.red, borderRadius: 1 }} />
                </div>
                {/* Large FVG zone */}
                <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: 105, height: 45, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 3 }} />
                {/* Entry at top edge */}
                <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: 148, height: 0, borderTop: '1.5px dashed rgba(248,113,113,0.6)' }} />
                <div style={{ position: 'absolute', right: 6, bottom: 142, fontSize: '0.55rem', fontWeight: 700, color: T.red }}>▸ entry</div>
                {/* SL very tight */}
                <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: 155, height: 0, borderTop: `1.5px dashed ${T.red}` }} />
                <div style={{ position: 'absolute', left: '8%', bottom: 157, fontSize: '0.45rem', color: T.red, fontFamily: "'JetBrains Mono', monospace" }}>SL</div>
                {/* TP zone */}
                <div style={{ position: 'absolute', left: '8%', right: '8%', top: 15, height: 0, borderTop: `1.5px dashed ${T.green}` }} />
                <div style={{ position: 'absolute', left: '8%', top: 5, fontSize: '0.45rem', color: T.green, fontFamily: "'JetBrains Mono', monospace" }}>TP</div>
              </div>
              {/* Stats row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', padding: '0.4rem 0.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: T.red }}>~95%</div>
                  <div style={{ fontSize: '0.45rem', color: T.textDim }}>fill rate</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: T.green }}>5–10R</div>
                  <div style={{ fontSize: '0.45rem', color: T.textDim }}>avg R:R</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: T.red }}>Tightest</div>
                  <div style={{ fontSize: '0.45rem', color: T.textDim }}>SL width</div>
                </div>
              </div>
              <div style={{ fontSize: '0.55rem', color: T.textDim, marginTop: '0.35rem', lineHeight: 1.5 }}>Maximum R:R but lowest hold rate. Best for high-conviction HTF setups with strong displacement. Expect more stop-outs — compensated by massive winners.</div>
            </div>

          </div>

          {/* Decision Matrix */}
          <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em', marginBottom: '0.6rem' }}>WHEN TO USE EACH</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.6rem', color: T.textDim, lineHeight: 1.6 }}>
                <span style={{ color: T.green, fontWeight: 700 }}>Complete Fill</span> — Small FVGs, choppy sessions, counter-trend trades, no HTF displacement, Asian overlap
              </div>
              <div style={{ fontSize: '0.6rem', color: T.textDim, lineHeight: 1.6 }}>
                <span style={{ color: T.accent, fontWeight: 700 }}>CE Entry</span> — Default choice. Clear HTF alignment, medium FVGs, London/NY killzones, trending days
              </div>
              <div style={{ fontSize: '0.6rem', color: T.textDim, lineHeight: 1.6 }}>
                <span style={{ color: T.red, fontWeight: 700 }}>FVG Edge</span> — Large FVGs after displacement, high-conviction HTF setups, FOMC/NFP days, when you want max R:R
              </div>
            </div>
          </div>
        </ChartContainer>

        {/* Stop Loss Types Visual — Enhanced */}
        <ChartContainer style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.15rem' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: T.text }}>Stop Loss Placement</div>
            <div style={{ fontSize: '0.55rem', fontWeight: 600, color: T.red, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 20, padding: '2px 8px', letterSpacing: '0.06em' }}>INVALIDATION</div>
          </div>
          <div style={{ fontSize: '0.7rem', color: T.textDim, marginBottom: '1.5rem' }}>where your thesis is wrong — every pip of stop width is risk you&apos;re paying for</div>

          {/* Width comparison bar */}
          <div style={{ marginBottom: '1.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em', marginBottom: '0.6rem' }}>STOP WIDTH COMPARISON</div>
            {[
              { label: 'Candle Body', width: '20%', color: T.accent, pips: '3–8 pips', rr: '8–15R' },
              { label: 'FVG Invalidation', width: '35%', color: '#f59e0b', pips: '8–15 pips', rr: '4–8R' },
              { label: 'OB Invalidation', width: '55%', color: '#f59e0b', pips: '12–25 pips', rr: '3–5R' },
              { label: 'Swing Point', width: '80%', color: T.red, pips: '20–50 pips', rr: '1.5–3R' },
            ].map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 600, color: T.textDim, minWidth: 95, textAlign: 'right' }}>{s.label}</div>
                <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: s.width, height: '100%', background: `linear-gradient(90deg, ${s.color}40, ${s.color})`, borderRadius: 5 }} />
                </div>
                <div style={{ fontSize: '0.55rem', color: T.textMuted, minWidth: 55, fontFamily: "'JetBrains Mono', monospace" }}>{s.pips}</div>
                <div style={{ fontSize: '0.55rem', color: s.color, minWidth: 40, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{s.rr}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>

            {/* Candle Body Stop */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(34,211,238,0.25)', borderRadius: 10, padding: '0.75rem 0.5rem 0.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 6, right: 6, fontSize: '0.45rem', fontWeight: 700, color: T.accent, background: 'rgba(34,211,238,0.1)', borderRadius: 3, padding: '1px 5px' }}>TIGHTEST</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, marginBottom: '0.2rem' }}>Candle Body</div>
              <div style={{ position: 'relative', height: 140, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 3 }}>
                {/* Preceding candles */}
                <div style={{ position: 'relative', width: 9, height: 140 }}>
                  <div style={{ position: 'absolute', left: 3.5, bottom: 75, width: 2, height: 45, background: T.green }} />
                  <div style={{ position: 'absolute', left: 0.5, bottom: 80, width: 8, height: 28, background: T.green, borderRadius: 1.5 }} />
                </div>
                {/* Displacement candle */}
                <div style={{ position: 'relative', width: 12, height: 140 }}>
                  <div style={{ position: 'absolute', left: 5, bottom: 18, width: 2, height: 100, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 18, width: 10, height: 65, background: T.red, borderRadius: 2 }} />
                </div>
                {/* Retrace */}
                <div style={{ position: 'relative', width: 9, height: 140 }}>
                  <div style={{ position: 'absolute', left: 3.5, bottom: 28, width: 2, height: 35, background: 'transparent', border: `1px solid ${T.textDim}` }} />
                  <div style={{ position: 'absolute', left: 0.5, bottom: 33, width: 8, height: 16, background: 'transparent', border: `1px solid ${T.textDim}`, borderRadius: 1 }} />
                </div>
                {/* Entry arrow */}
                <div style={{ position: 'absolute', right: 5, bottom: 84, fontSize: '0.5rem', color: T.green, fontWeight: 700 }}>▸</div>
                {/* Entry line */}
                <div style={{ position: 'absolute', left: '10%', right: '10%', bottom: 83, height: 0, borderTop: `1px dashed ${T.green}` }} />
                {/* SL at candle body */}
                <div style={{ position: 'absolute', left: '10%', right: '10%', bottom: 76, height: 0, borderTop: `1.5px solid ${T.red}` }} />
                <div style={{ position: 'absolute', left: '10%', bottom: 67, fontSize: '0.4rem', color: T.red, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>SL — body close</div>
                {/* Candle body highlight */}
                <div style={{ position: 'absolute', left: '25%', width: 10, bottom: 76, height: 7, background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: '0.5rem', color: T.textDim, marginTop: '0.35rem', lineHeight: 1.5 }}>SL just beyond the body (not wick) of the entry/displacement candle. Maximum R:R — requires high conviction.</div>
            </div>

            {/* FVG Invalidation */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '0.75rem 0.5rem 0.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 6, right: 6, fontSize: '0.45rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderRadius: 3, padding: '1px 5px' }}>TIGHT</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.2rem' }}>FVG Invalidation</div>
              <div style={{ position: 'relative', height: 140, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 3 }}>
                <div style={{ position: 'relative', width: 9, height: 140 }}>
                  <div style={{ position: 'absolute', left: 3.5, bottom: 85, width: 2, height: 40, background: T.green }} />
                  <div style={{ position: 'absolute', left: 0.5, bottom: 92, width: 8, height: 25, background: T.green, borderRadius: 1.5 }} />
                </div>
                <div style={{ position: 'relative', width: 12, height: 140 }}>
                  <div style={{ position: 'absolute', left: 5, bottom: 15, width: 2, height: 100, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 15, width: 10, height: 65, background: T.red, borderRadius: 2 }} />
                </div>
                <div style={{ position: 'relative', width: 9, height: 140 }}>
                  <div style={{ position: 'absolute', left: 3.5, bottom: 35, width: 2, height: 45, background: T.red }} />
                  <div style={{ position: 'absolute', left: 0.5, bottom: 38, width: 8, height: 22, background: T.red, borderRadius: 1 }} />
                </div>
                <div style={{ position: 'relative', width: 8, height: 140 }}>
                  <div style={{ position: 'absolute', left: 3, bottom: 8, width: 2, height: 32, background: T.red }} />
                  <div style={{ position: 'absolute', left: 0.5, bottom: 8, width: 7, height: 16, background: T.red, borderRadius: 1 }} />
                </div>
                {/* FVG zone */}
                <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: 14, height: 26, background: 'rgba(245,158,11,0.06)', border: '1px dashed rgba(245,158,11,0.3)', borderRadius: 3 }} />
                {/* Entry */}
                <div style={{ position: 'absolute', left: '10%', right: '10%', bottom: 32, height: 0, borderTop: `1px dashed ${T.green}` }} />
                <div style={{ position: 'absolute', right: 5, bottom: 34, fontSize: '0.5rem', color: T.green, fontWeight: 700 }}>▸</div>
                {/* SL at far boundary of FVG */}
                <div style={{ position: 'absolute', left: '10%', right: '10%', bottom: 8, height: 0, borderTop: `1.5px solid ${T.red}` }} />
                <div style={{ position: 'absolute', left: '10%', bottom: 0, fontSize: '0.4rem', color: T.red, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>SL — FVG boundary</div>
              </div>
              <div style={{ fontSize: '0.5rem', color: T.textDim, marginTop: '0.35rem', lineHeight: 1.5 }}>SL beyond the far boundary of the FVG. If the gap is fully violated, the imbalance thesis is dead.</div>
            </div>

            {/* OB Invalidation */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '0.75rem 0.5rem 0.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 6, right: 6, fontSize: '0.45rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderRadius: 3, padding: '1px 5px' }}>MEDIUM</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.2rem' }}>OB Invalidation</div>
              <div style={{ position: 'relative', height: 140, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 3 }}>
                <div style={{ position: 'relative', width: 9, height: 140 }}>
                  <div style={{ position: 'absolute', left: 3.5, bottom: 90, width: 2, height: 38, background: T.red }} />
                  <div style={{ position: 'absolute', left: 0.5, bottom: 95, width: 8, height: 24, background: T.red, borderRadius: 1.5 }} />
                </div>
                <div style={{ position: 'relative', width: 8, height: 140 }}>
                  <div style={{ position: 'absolute', left: 3, bottom: 72, width: 2, height: 28, background: 'transparent', border: `1px solid ${T.textDim}` }} />
                  <div style={{ position: 'absolute', left: 0.5, bottom: 77, width: 7, height: 13, background: 'transparent', border: `1px solid ${T.textDim}`, borderRadius: 1 }} />
                </div>
                <div style={{ position: 'relative', width: 12, height: 140 }}>
                  <div style={{ position: 'absolute', left: 5, bottom: 20, width: 2, height: 90, background: T.red }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 20, width: 10, height: 58, background: T.red, borderRadius: 2 }} />
                </div>
                <div style={{ position: 'relative', width: 9, height: 140 }}>
                  <div style={{ position: 'absolute', left: 3.5, bottom: 30, width: 2, height: 35, background: T.red }} />
                  <div style={{ position: 'absolute', left: 0.5, bottom: 33, width: 8, height: 18, background: T.red, borderRadius: 1 }} />
                </div>
                {/* OB zone */}
                <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: 24, height: 30, background: 'rgba(245,158,11,0.06)', border: '1px dashed rgba(245,158,11,0.3)', borderRadius: 3 }} />
                {/* Entry */}
                <div style={{ position: 'absolute', left: '10%', right: '10%', bottom: 42, height: 0, borderTop: `1px dashed ${T.green}` }} />
                <div style={{ position: 'absolute', right: 5, bottom: 44, fontSize: '0.5rem', color: T.green, fontWeight: 700 }}>▸</div>
                {/* SL below OB */}
                <div style={{ position: 'absolute', left: '10%', right: '10%', bottom: 14, height: 0, borderTop: `1.5px solid ${T.red}` }} />
                <div style={{ position: 'absolute', left: '10%', bottom: 4, fontSize: '0.4rem', color: T.red, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>SL — below OB</div>
              </div>
              <div style={{ fontSize: '0.5rem', color: T.textDim, marginTop: '0.35rem', lineHeight: 1.5 }}>SL 1–2 ticks beyond the far edge of the order block. Full OB body displacement = thesis invalidated.</div>
            </div>

            {/* Swing Point */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(248,113,113,0.25)', borderRadius: 10, padding: '0.75rem 0.5rem 0.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 6, right: 6, fontSize: '0.45rem', fontWeight: 700, color: T.red, background: 'rgba(248,113,113,0.1)', borderRadius: 3, padding: '1px 5px' }}>WIDEST</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.red, marginBottom: '0.2rem' }}>Swing Point</div>
              <div style={{ position: 'relative', height: 140, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 3 }}>
                <div style={{ position: 'relative', width: 8, height: 140 }}>
                  <div style={{ position: 'absolute', left: 3, bottom: 90, width: 2, height: 35, background: 'transparent', border: `1px solid ${T.textDim}` }} />
                  <div style={{ position: 'absolute', left: 0.5, bottom: 98, width: 7, height: 16, background: 'transparent', border: `1px solid ${T.textDim}`, borderRadius: 1 }} />
                </div>
                <div style={{ position: 'relative', width: 10, height: 140 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 75, width: 2, height: 50, background: T.red }} />
                  <div style={{ position: 'absolute', left: 0.5, bottom: 75, width: 9, height: 30, background: T.red, borderRadius: 1 }} />
                </div>
                <div style={{ position: 'relative', width: 8, height: 140 }}>
                  <div style={{ position: 'absolute', left: 3, bottom: 48, width: 2, height: 40, background: 'transparent', border: `1px solid ${T.textDim}` }} />
                  <div style={{ position: 'absolute', left: 0.5, bottom: 53, width: 7, height: 20, background: 'transparent', border: `1px solid ${T.textDim}`, borderRadius: 1 }} />
                </div>
                <div style={{ position: 'relative', width: 10, height: 140 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 32, width: 2, height: 45, background: T.red }} />
                  <div style={{ position: 'absolute', left: 0.5, bottom: 32, width: 9, height: 25, background: T.red, borderRadius: 1 }} />
                </div>
                <div style={{ position: 'relative', width: 10, height: 140 }}>
                  <div style={{ position: 'absolute', left: 4, bottom: 5, width: 2, height: 48, background: T.red }} />
                  <div style={{ position: 'absolute', left: 0.5, bottom: 5, width: 9, height: 26, background: T.red, borderRadius: 1 }} />
                </div>
                {/* Swing low marker */}
                <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: 50, height: 32, background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.12)', borderRadius: 3 }} />
                {/* Entry */}
                <div style={{ position: 'absolute', left: '10%', right: '10%', bottom: 72, height: 0, borderTop: `1px dashed ${T.green}` }} />
                <div style={{ position: 'absolute', right: 5, bottom: 74, fontSize: '0.5rem', color: T.green, fontWeight: 700 }}>▸</div>
                {/* SL at swing low */}
                <div style={{ position: 'absolute', left: '10%', right: '10%', bottom: 2, height: 0, borderTop: `1.5px solid ${T.red}` }} />
                <div style={{ position: 'absolute', left: '10%', bottom: -8, fontSize: '0.4rem', color: T.red, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>SL — swing low</div>
              </div>
              <div style={{ fontSize: '0.5rem', color: T.textDim, marginTop: '0.35rem', lineHeight: 1.5 }}>SL beyond the recent swing high/low. Safest but reduces R:R. Use on HTF setups where you need room to breathe.</div>
            </div>
          </div>

          {/* Stop Loss Decision Framework */}
          <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em', marginBottom: '0.6rem' }}>STOP LOSS DECISION TREE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.6rem', color: T.textDim, lineHeight: 1.6, padding: '0.5rem', background: 'rgba(74,222,128,0.03)', borderRadius: 6, border: '1px solid rgba(74,222,128,0.1)' }}>
                <span style={{ color: T.green, fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Use Tighter Stops When:</span>
                High HTF confluence • Clean displacement • FVG + OB overlap • Killzone timing • Single-pair focus day
              </div>
              <div style={{ fontSize: '0.6rem', color: T.textDim, lineHeight: 1.6, padding: '0.5rem', background: 'rgba(248,113,113,0.03)', borderRadius: 6, border: '1px solid rgba(248,113,113,0.1)' }}>
                <span style={{ color: T.red, fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Use Wider Stops When:</span>
                Counter-trend entries • News proximity • Asian session entries • Multiple TF conflicts • Volatile pairs (GBP/JPY)
              </div>
            </div>
          </div>
        </ChartContainer>

        {/* Entry Models Grid — Enhanced */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: T.accent, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em' }}>ENTRY MODELS</div>
          <div style={{ fontSize: '0.55rem', color: T.textDim }}>ranked by difficulty &amp; conviction</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            {
              num: '01', title: 'OTE — Optimal Trade Entry', color: T.green,
              diff: 'Beginner', diffColor: T.green, rr: '3–6R', tf: 'M5–M15',
              desc: 'Enter at the 62%–79% fib retracement of a displacement leg. The sweet spot where stop distance is minimized and reward is maximized.',
              when: 'Use the fib tool from swing low to swing high (bullish). Best when retracement enters the discount/premium zone of the range.',
              avoid: 'Not effective in ranging/consolidating markets or when displacement is weak.',
            },
            {
              num: '02', title: 'FVG Entry', color: T.green,
              diff: 'Beginner', diffColor: T.green, rr: '4–8R', tf: 'M5–H1',
              desc: 'Enter when price returns to fill a Fair Value Gap. Place limit order at the CE (50% of the FVG). The imbalance acts as a magnet.',
              when: 'Works best when FVG aligns with HTF PD arrays and a clear draw on liquidity. Stack with OTE for maximum confluence.',
              avoid: 'Skip if FVG has already been partially filled or if it formed during low-volume sessions.',
            },
            {
              num: '03', title: 'Order Block Entry', color: T.accent,
              diff: 'Intermediate', diffColor: T.accent, rr: '3–5R', tf: 'M15–H4',
              desc: 'Enter at the mean threshold (50%) of a validated order block — the last opposing candle before displacement.',
              when: 'Confirmation needed: LTF MSS or FVG formation within the OB body. Best when OB is the first touch after displacement.',
              avoid: 'Invalid if the OB has been tapped 2+ times already (demand/supply exhaustion).',
            },
            {
              num: '04', title: 'PO3 Close Proximity', color: T.accent,
              diff: 'Intermediate', diffColor: T.accent, rr: '5–10R', tf: 'H1–Daily',
              desc: 'When the daily candle is in its manipulation phase, enter near the open. The close targets the opposite direction — capturing the full distribution.',
              when: 'Require clear Monday/Tuesday open-to-manipulation range. Enter during London or early NY killzone.',
              avoid: 'Does not work on Fridays, during consolidation weeks, or when weekly profile is unclear.',
            },
            {
              num: '05', title: 'Breaker Block Entry', color: '#818cf8',
              diff: 'Advanced', diffColor: '#818cf8', rr: '4–8R', tf: 'M15–H4',
              desc: 'Enter when price returns to a confirmed breaker — a failed OB that has been displaced through, now acting as opposite S/R.',
              when: 'Higher conviction than standard OBs because structure has already confirmed the reversal. Best after clean MSS.',
              avoid: 'Don\'t confuse with regular broken structure. Must see full displacement through the original OB.',
            },
            {
              num: '06', title: 'Liquidity Sweep Entry', color: '#818cf8',
              diff: 'Advanced', diffColor: '#818cf8', rr: '5–15R', tf: 'M1–M5',
              desc: 'Wait for price to sweep a known liquidity pool (EQH/EQL, PDH/PDL, PWH/PWL), then enter on the reversal candle.',
              when: 'Must have LTF confirmation — a sweep alone is NOT an entry signal. Best during killzones with HTF bias alignment.',
              avoid: 'Never chase a sweep without displacement + shift. Avoid during news spikes — natural volatility ≠ manipulation.',
            },
          ].map((m) => (
            <div key={m.num} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '1.25rem', border: `1px solid rgba(255,255,255,0.06)`, position: 'relative', overflow: 'hidden' }}>
              {/* Number watermark */}
              <div style={{ position: 'absolute', top: -8, right: 8, fontSize: '3rem', fontWeight: 900, color: 'rgba(255,255,255,0.02)', fontFamily: "'JetBrains Mono', monospace" }}>{m.num}</div>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: T.text, marginBottom: '0.2rem' }}>{m.title}</div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.5rem', fontWeight: 600, color: m.diffColor, background: `${m.diffColor}15`, border: `1px solid ${m.diffColor}30`, borderRadius: 3, padding: '1px 6px' }}>{m.diff}</span>
                    <span style={{ fontSize: '0.5rem', fontWeight: 600, color: T.textMuted, background: 'rgba(255,255,255,0.04)', borderRadius: 3, padding: '1px 6px', fontFamily: "'JetBrains Mono', monospace" }}>{m.tf}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>{m.rr}</div>
                  <div style={{ fontSize: '0.45rem', color: T.textDim }}>typical R:R</div>
                </div>
              </div>
              {/* Description */}
              <div style={{ fontSize: '0.7rem', color: T.textDim, lineHeight: 1.6, marginBottom: '0.6rem' }}>{m.desc}</div>
              {/* When to use */}
              <div style={{ fontSize: '0.6rem', color: T.textMuted, lineHeight: 1.5, padding: '0.4rem 0.5rem', background: 'rgba(74,222,128,0.03)', borderRadius: 5, borderLeft: `2px solid ${T.green}`, marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: 700, color: T.green }}>When: </span>{m.when}
              </div>
              {/* When to avoid */}
              <div style={{ fontSize: '0.6rem', color: T.textMuted, lineHeight: 1.5, padding: '0.4rem 0.5rem', background: 'rgba(248,113,113,0.03)', borderRadius: 5, borderLeft: `2px solid ${T.red}` }}>
                <span style={{ fontWeight: 700, color: T.red }}>Avoid: </span>{m.avoid}
              </div>
            </div>
          ))}
        </div>

        {/* Stop Loss Placement — Enhanced */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '2rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: T.red, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em' }}>STOP LOSS STRATEGY</div>
          <div style={{ fontSize: '0.55rem', color: T.textDim }}>match your stop to your entry model</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
          {[
            {
              title: 'Swing Point Stop', color: T.red, badge: 'SAFEST',
              desc: 'Place SL beyond the most recent swing high/low that created the setup.',
              pair: 'OTE, PO3, Liquidity Sweep',
              note: 'Gives maximum breathing room — use when you need structure-level invalidation or holding through news.',
              width: 95,
            },
            {
              title: 'OB Invalidation', color: '#f59e0b', badge: 'STANDARD',
              desc: 'Place SL 1–2 ticks beyond the far edge of the order block body.',
              pair: 'Order Block, Breaker Block',
              note: 'If price displaces through the entire OB body, the institutional footprint thesis is dead. Clean invalidation.',
              width: 65,
            },
            {
              title: 'FVG Invalidation', color: '#f59e0b', badge: 'PRECISION',
              desc: 'Place SL beyond the far boundary of the Fair Value Gap.',
              pair: 'FVG Entry, CE Entry',
              note: 'If the imbalance is fully rebalanced and price trades through, there\'s no inefficiency left to trade. Logic is gone.',
              width: 42,
            },
            {
              title: 'Candle Body Stop', color: T.accent, badge: 'AGGRESSIVE',
              desc: 'Place SL just beyond the body (not wick) of the entry or displacement candle.',
              pair: 'FVG Edge/Drill, Scalps',
              note: 'Tighter than swing stops — maximum R:R. Requires precision timing and high-conviction setups only.',
              width: 22,
            },
          ].map((s) => (
            <div key={s.title} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '1rem', borderTop: `2px solid ${s.color}`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 10, right: 8, fontSize: '0.45rem', fontWeight: 700, color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}30`, borderRadius: 3, padding: '1px 5px', letterSpacing: '0.04em' }}>{s.badge}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: T.text, marginBottom: '0.35rem' }}>{s.title}</div>
              <div style={{ fontSize: '0.65rem', color: T.textDim, lineHeight: 1.6, marginBottom: '0.5rem' }}>{s.desc}</div>
              {/* Width bar */}
              <div style={{ marginBottom: '0.4rem' }}>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${s.width}%`, height: '100%', background: `linear-gradient(90deg, ${s.color}40, ${s.color})`, borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: '0.45rem', color: T.textMuted, marginTop: 2 }}>relative stop width</div>
              </div>
              {/* Best paired with */}
              <div style={{ fontSize: '0.55rem', color: T.textMuted, lineHeight: 1.5, padding: '0.3rem 0.4rem', background: 'rgba(255,255,255,0.02)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontWeight: 700, color: T.textDim }}>Pairs with: </span>{s.pair}
              </div>
              <div style={{ fontSize: '0.55rem', color: T.textDim, lineHeight: 1.5, marginTop: '0.4rem', fontStyle: 'italic' }}>{s.note}</div>
            </div>
          ))}
        </div>

        {/* Fibonacci Settings */}
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a78bfa', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', marginBottom: '1rem' }}>FIBONACCI SETTINGS</div>
        <TwoCol>
          <ColBox>
            <ColTitle style={{ color: '#a78bfa' }}>Retracement Levels</ColTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                ['0.0%', 'Swing origin', T.textDim],
                ['50.0%', 'Equilibrium — CE of the range', T.textMuted],
                ['62.0%', 'OTE zone start', T.accent],
                ['70.5%', 'Optimal sweet spot', T.green],
                ['79.0%', 'OTE zone end — max precision', T.green],
                ['100.0%', 'Full retracement', T.textDim],
              ].map(([level, label, color]) => (
                <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color, minWidth: 50 }}>{level}</span>
                  <span style={{ fontSize: '0.7rem', color: T.textDim }}>{label}</span>
                </div>
              ))}
            </div>
          </ColBox>
          <ColBox>
            <ColTitle style={{ color: '#a78bfa' }}>Extension Levels (Targets)</ColTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                ['-27.0%', 'Standard 1st target', T.textMuted],
                ['-62.0%', 'OTE extension — most common TP', T.accent],
                ['-100.0%', '1:1 measured move', T.green],
                ['-127.0%', 'Extended target', T.green],
                ['-162.0%', 'Aggressive extension', '#f59e0b'],
                ['-200.0%', '2:1 measured move — full expansion', T.red],
              ].map(([level, label, color]) => (
                <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color, minWidth: 50 }}>{level}</span>
                  <span style={{ fontSize: '0.7rem', color: T.textDim }}>{label}</span>
                </div>
              ))}
            </div>
          </ColBox>
        </TwoCol>

        <QuoteBlock>
          <QuoteText>&ldquo;Your entry determines your risk. Your risk determines your size. Your size determines your survival.&rdquo;</QuoteText>
          <QuoteAuthor>— ICT Concept</QuoteAuthor>
        </QuoteBlock>

      </SectionWrapper>

      {/* ═══ 18 — LIQUIDITY MECHANICS ═══ */}
      <SectionDivider />
      <SectionWrapper id="liqmech">
        <SectionLabel>Mechanics</SectionLabel>
        <SectionTitle>Liquidity Mechanics</SectionTitle>
        <SectionIntro>
          Markets don&apos;t move randomly — they move toward liquidity. Understanding where
          stops are resting, which pools are obvious, and how resistance differs
          is the foundation of directional bias.
        </SectionIntro>

        {/* Inefficiency Types Visual — from PDF page 6 */}
        <ChartContainer style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: T.textMain, marginBottom: '0.15rem' }}>Inefficiency Types</div>
          <div style={{ fontSize: '0.7rem', color: T.textDim, marginBottom: '1.5rem' }}>gaps in the delivery of price — all are potential PD arrays</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>

            {/* Fair Value Gap */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '1rem 0.75rem 0.75rem', textAlign: 'center', border: '1px solid rgba(74,222,128,0.15)' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', fontWeight: 700, color: T.green, marginBottom: '0.25rem' }}>fair value gap</div>
              <div style={{ fontSize: '0.6rem', color: T.textMuted, marginBottom: '0.75rem', fontStyle: 'italic' }}>one-sided price offering</div>
              <div style={{ position: 'relative', height: 160, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 6 }}>
                {/* Candle 1 */}
                <div style={{ position: 'relative', width: 14, height: 160 }}>
                  <div style={{ position: 'absolute', left: 6, bottom: 10, width: 2, height: 60, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 20, width: 12, height: 40, background: T.green, borderRadius: 1.5 }} />
                </div>
                {/* Candle 2 — displacement */}
                <div style={{ position: 'relative', width: 16, height: 160 }}>
                  <div style={{ position: 'absolute', left: 7, bottom: 50, width: 2, height: 90, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 55, width: 14, height: 70, background: T.green, borderRadius: 2 }} />
                </div>
                {/* Candle 3 */}
                <div style={{ position: 'relative', width: 14, height: 160 }}>
                  <div style={{ position: 'absolute', left: 6, bottom: 100, width: 2, height: 48, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 110, width: 12, height: 28, background: T.green, borderRadius: 1.5 }} />
                </div>
                {/* FVG zone — gap between C1 high and C3 low */}
                <div style={{ position: 'absolute', left: '10%', right: '10%', bottom: 60, height: 40, background: 'rgba(74,222,128,0.08)', border: `1px dashed rgba(74,222,128,0.35)`, borderRadius: 3 }} />
                {/* CE line */}
                <div style={{ position: 'absolute', left: '10%', right: '10%', bottom: 80, height: 0, borderTop: `1px dotted rgba(255,255,255,0.3)` }} />
                <div style={{ position: 'absolute', right: 6, bottom: 74, fontSize: '0.5rem', color: T.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>CE</div>
                {/* Labels */}
                <div style={{ position: 'absolute', left: 4, bottom: 60, fontSize: '0.5rem', color: T.green, fontFamily: "'JetBrains Mono', monospace", writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>FVG</div>
              </div>
            </div>

            {/* Volume Imbalance */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '1rem 0.75rem 0.75rem', textAlign: 'center', border: '1px solid rgba(74,222,128,0.15)' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', fontWeight: 700, color: T.green, marginBottom: '0.25rem' }}>volume imbalance</div>
              <div style={{ fontSize: '0.6rem', color: T.textMuted, marginBottom: '0.75rem', fontStyle: 'italic' }}>absence of body volume</div>
              <div style={{ position: 'relative', height: 160, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 10 }}>
                {/* Candle 1 */}
                <div style={{ position: 'relative', width: 18, height: 160 }}>
                  <div style={{ position: 'absolute', left: 8, bottom: 10, width: 2, height: 70, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 15, width: 16, height: 50, background: T.green, borderRadius: 2 }} />
                </div>
                {/* Candle 2 — gapped up */}
                <div style={{ position: 'relative', width: 18, height: 160 }}>
                  <div style={{ position: 'absolute', left: 8, bottom: 75, width: 2, height: 70, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 80, width: 16, height: 50, background: T.green, borderRadius: 2 }} />
                </div>
                {/* VI zone — gap between C1 body top and C2 body bottom */}
                <div style={{ position: 'absolute', left: '15%', right: '15%', bottom: 65, height: 15, background: 'rgba(74,222,128,0.08)', border: `1px dashed rgba(74,222,128,0.35)`, borderRadius: 3 }} />
                <div style={{ position: 'absolute', right: 10, bottom: 66, fontSize: '0.5rem', color: T.green, fontFamily: "'JetBrains Mono', monospace" }}>VI</div>
              </div>
            </div>

            {/* Opening Gap */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '1rem 0.75rem 0.75rem', textAlign: 'center', border: '1px solid rgba(74,222,128,0.15)' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', fontWeight: 700, color: T.green, marginBottom: '0.25rem' }}>opening gap</div>
              <div style={{ fontSize: '0.6rem', color: T.textMuted, marginBottom: '0.75rem', fontStyle: 'italic' }}>un-offered price range</div>
              <div style={{ position: 'relative', height: 160, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 16 }}>
                {/* Session 1 close candle */}
                <div style={{ position: 'relative', width: 18, height: 160 }}>
                  <div style={{ position: 'absolute', left: 8, bottom: 10, width: 2, height: 65, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 15, width: 16, height: 45, background: T.green, borderRadius: 2 }} />
                  <div style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', fontSize: '0.45rem', color: T.textDim, whiteSpace: 'nowrap' }}>close</div>
                </div>
                {/* Session 2 open candle — gapped up */}
                <div style={{ position: 'relative', width: 18, height: 160 }}>
                  <div style={{ position: 'absolute', left: 8, bottom: 85, width: 2, height: 60, background: T.green }} />
                  <div style={{ position: 'absolute', left: 1, bottom: 90, width: 16, height: 40, background: T.green, borderRadius: 2 }} />
                  <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', fontSize: '0.45rem', color: T.textDim, whiteSpace: 'nowrap' }}>open</div>
                </div>
                {/* Gap zone */}
                <div style={{ position: 'absolute', left: '12%', right: '12%', bottom: 60, height: 25, background: 'rgba(74,222,128,0.08)', border: `1px dashed rgba(74,222,128,0.35)`, borderRadius: 3 }} />
                <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 63, fontSize: '0.5rem', color: T.green, fontFamily: "'JetBrains Mono', monospace" }}>GAP</div>
                {/* Divider line between sessions */}
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: `1px dotted rgba(255,255,255,0.12)` }} />
              </div>
            </div>
          </div>
        </ChartContainer>

        {/* Liquidity Types Visual */}
        <ChartContainer style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: T.textMain, marginBottom: '0.15rem' }}>Liquidity Types</div>
          <div style={{ fontSize: '0.7rem', color: T.textDim, marginBottom: '1.5rem' }}>where stops rest = where price is drawn</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>

            {/* Trendline Low (SSL) */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '0.75rem', textAlign: 'center', border: '1px solid rgba(74,222,128,0.15)' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: T.green, marginBottom: '0.5rem' }}>trendline low</div>
              <svg viewBox="0 0 120 80" style={{ width: '100%', height: 80 }}>
                {/* Ascending trendline */}
                <line x1="10" y1="65" x2="95" y2="20" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,2" />
                {/* Zigzag price — higher lows, higher highs */}
                <polyline points="10,55 25,25 40,45 55,15 70,35 85,8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                {/* Sweep below trendline */}
                <polyline points="85,8 95,50 100,42" fill="none" stroke={T.green} strokeWidth="2" />
                {/* $ markers at lows */}
                <text x="40" y="52" fill={T.green} fontSize="7" fontFamily="JetBrains Mono" fontWeight="700">$</text>
                <text x="70" y="42" fill={T.green} fontSize="7" fontFamily="JetBrains Mono" fontWeight="700">$</text>
                <text x="95" y="58" fill={T.green} fontSize="8" fontFamily="JetBrains Mono" fontWeight="700">$</text>
                {/* Arrow up */}
                <polygon points="100,42 103,48 97,48" fill={T.green} />
              </svg>
              <div style={{ fontSize: '0.55rem', color: T.textDim }}>sweep below ascending trendline → reversal</div>
            </div>

            {/* Old Low (SSL) */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '0.75rem', textAlign: 'center', border: '1px solid rgba(74,222,128,0.15)' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: T.green, marginBottom: '0.5rem' }}>old low</div>
              <svg viewBox="0 0 120 80" style={{ width: '100%', height: 80 }}>
                {/* Old low level */}
                <line x1="8" y1="55" x2="90" y2="55" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="3,2" />
                {/* Price action — drops, bounces, comes back */}
                <polyline points="10,20 25,55 40,30 55,15 70,35 85,55" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                {/* Sweep below old low */}
                <polyline points="85,55 95,65 105,35" fill="none" stroke={T.green} strokeWidth="2" />
                {/* $ marker */}
                <text x="25" y="63" fill={T.green} fontSize="7" fontFamily="JetBrains Mono" fontWeight="700">$</text>
                <text x="95" y="73" fill={T.green} fontSize="8" fontFamily="JetBrains Mono" fontWeight="700">$</text>
                <text x="8" y="52" fill="rgba(255,255,255,0.25)" fontSize="6" fontFamily="JetBrains Mono">old low</text>
                <polygon points="105,35 108,42 102,42" fill={T.green} />
              </svg>
              <div style={{ fontSize: '0.55rem', color: T.textDim }}>revisit &amp; sweep prior swing low → reversal</div>
            </div>

            {/* Equal Lows (SSL) */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '0.75rem', textAlign: 'center', border: '1px solid rgba(74,222,128,0.15)' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: T.green, marginBottom: '0.5rem' }}>equal lows</div>
              <svg viewBox="0 0 120 80" style={{ width: '100%', height: 80 }}>
                {/* Equal low level */}
                <line x1="8" y1="55" x2="100" y2="55" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="3,2" />
                {/* Double bottom zigzag */}
                <polyline points="10,20 30,55 50,15 70,55 85,25" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                {/* Sweep below equals */}
                <polyline points="85,25 95,62 105,30" fill="none" stroke={T.green} strokeWidth="2" />
                {/* $ markers at each equal low */}
                <text x="30" y="63" fill={T.green} fontSize="7" fontFamily="JetBrains Mono" fontWeight="700">$</text>
                <text x="70" y="63" fill={T.green} fontSize="7" fontFamily="JetBrains Mono" fontWeight="700">$</text>
                <text x="95" y="72" fill={T.green} fontSize="8" fontFamily="JetBrains Mono" fontWeight="700">$</text>
                <polygon points="105,30 108,37 102,37" fill={T.green} />
              </svg>
              <div style={{ fontSize: '0.55rem', color: T.textDim }}>double/triple bottom sweep → reversal</div>
            </div>

            {/* Trendline High (BSL) */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '0.75rem', textAlign: 'center', border: '1px solid rgba(239,68,68,0.15)' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: T.red, marginBottom: '0.5rem' }}>trendline high</div>
              <svg viewBox="0 0 120 80" style={{ width: '100%', height: 80 }}>
                {/* Descending trendline */}
                <line x1="10" y1="15" x2="95" y2="60" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,2" />
                {/* Zigzag — lower highs, lower lows */}
                <polyline points="10,25 25,55 40,35 55,65 70,45 85,70" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                {/* Sweep above trendline */}
                <polyline points="85,70 95,28 100,38" fill="none" stroke={T.red} strokeWidth="2" />
                {/* $ markers at highs */}
                <text x="10" y="22" fill={T.red} fontSize="7" fontFamily="JetBrains Mono" fontWeight="700">$</text>
                <text x="40" y="32" fill={T.red} fontSize="7" fontFamily="JetBrains Mono" fontWeight="700">$</text>
                <text x="95" y="25" fill={T.red} fontSize="8" fontFamily="JetBrains Mono" fontWeight="700">$</text>
                <polygon points="100,38 103,31 97,31" fill={T.red} />
              </svg>
              <div style={{ fontSize: '0.55rem', color: T.textDim }}>sweep above descending trendline → reversal</div>
            </div>

            {/* Old High (BSL) */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '0.75rem', textAlign: 'center', border: '1px solid rgba(239,68,68,0.15)' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: T.red, marginBottom: '0.5rem' }}>old high</div>
              <svg viewBox="0 0 120 80" style={{ width: '100%', height: 80 }}>
                {/* Old high level */}
                <line x1="8" y1="25" x2="90" y2="25" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="3,2" />
                {/* Price action — rises, pulls back, comes back */}
                <polyline points="10,60 25,25 40,50 55,65 70,45 85,25" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                {/* Sweep above old high */}
                <polyline points="85,25 95,15 105,50" fill="none" stroke={T.red} strokeWidth="2" />
                <text x="25" y="20" fill={T.red} fontSize="7" fontFamily="JetBrains Mono" fontWeight="700">$</text>
                <text x="95" y="12" fill={T.red} fontSize="8" fontFamily="JetBrains Mono" fontWeight="700">$</text>
                <text x="8" y="22" fill="rgba(255,255,255,0.25)" fontSize="6" fontFamily="JetBrains Mono">old high</text>
                <polygon points="105,50 108,43 102,43" fill={T.red} />
              </svg>
              <div style={{ fontSize: '0.55rem', color: T.textDim }}>revisit &amp; sweep prior swing high → reversal</div>
            </div>

            {/* Equal Highs (BSL) */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '0.75rem', textAlign: 'center', border: '1px solid rgba(239,68,68,0.15)' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: T.red, marginBottom: '0.5rem' }}>equal highs</div>
              <svg viewBox="0 0 120 80" style={{ width: '100%', height: 80 }}>
                {/* Equal high level */}
                <line x1="8" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="3,2" />
                {/* Double top zigzag */}
                <polyline points="10,60 30,25 50,65 70,25 85,55" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                {/* Sweep above equals */}
                <polyline points="85,55 95,18 105,55" fill="none" stroke={T.red} strokeWidth="2" />
                {/* $ markers */}
                <text x="30" y="20" fill={T.red} fontSize="7" fontFamily="JetBrains Mono" fontWeight="700">$</text>
                <text x="70" y="20" fill={T.red} fontSize="7" fontFamily="JetBrains Mono" fontWeight="700">$</text>
                <text x="95" y="15" fill={T.red} fontSize="8" fontFamily="JetBrains Mono" fontWeight="700">$</text>
                <polygon points="105,55 108,48 102,48" fill={T.red} />
              </svg>
              <div style={{ fontSize: '0.55rem', color: T.textDim }}>double/triple top sweep → reversal</div>
            </div>
          </div>
        </ChartContainer>

        {/* High vs Low Resistance */}
        <TwoCol>
          <ColBox>
            <ColTitle style={{ color: T.green }}>Low Resistance Liquidity Run</ColTitle>
            <BulletList>
              <Bullet>Price moves toward the DOL with <strong>minimal opposing PD arrays</strong> in the path</Bullet>
              <Bullet>Clean space between current price and the target pool</Bullet>
              <Bullet>Candles are <strong>displacement-style</strong> — large bodies, small wicks</Bullet>
              <Bullet>This is the side you want to trade — path of least resistance</Bullet>
              <Bullet>Example: price sweeps SSL, no FVGs or OBs between current price and BSL above</Bullet>
            </BulletList>
          </ColBox>
          <ColBox>
            <ColTitle style={{ color: T.red }}>High Resistance Liquidity Run</ColTitle>
            <BulletList>
              <Bullet>Price moves toward a target but <strong>multiple opposing PD arrays</strong> are stacked in the way</Bullet>
              <Bullet>FVGs, OBs, and breakers all sitting between price and the DOL</Bullet>
              <Bullet>Candles show <strong>effort</strong> — overlapping bodies, wicks getting longer</Bullet>
              <Bullet>This side is harder to trade — expect chop, stalls, and retracements</Bullet>
              <Bullet>If you must trade this side, use partial exits at each PD array</Bullet>
            </BulletList>
          </ColBox>
        </TwoCol>

        {/* Liquidity Within Trend */}
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: T.accent, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', marginTop: '1rem', marginBottom: '1rem' }}>LIQUIDITY WITHIN TREND STATES</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {[
            ['Consolidation', 'Range-bound with equal highs and lows building on both sides. Liquidity pools grow at range extremes. Do NOT trade the middle — wait for expansion.', T.textDim, '◼'],
            ['Expansion', 'Price displaces from consolidation and runs through liquidity. Large bodied candles, minimal retracement. This is where money is made. Trade the direction.', T.green, '▲'],
            ['Retracement', 'Price pulls back to fill an FVG or test an OB left behind by the expansion. This creates your entry opportunity. The trend is NOT over.', T.accent, '↩'],
            ['Reversal', 'Trend change confirmed by MSS. Previous HTF PD array has been reached, liquidity swept, and structure shifted. New trend direction begins.', T.red, '⟲'],
          ].map(([title, desc, color, icon]) => (
            <div key={title} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '1rem 1.25rem', borderLeft: `2px solid ${color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '1rem' }}>{icon}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: T.textMain }}>{title}</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: T.textDim, lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Kill Zones from PDF page 6 */}
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', marginTop: '2rem', marginBottom: '1rem' }}>INDEX FUTURES KILL ZONES (EST)</div>
        <SessionBarRow>
          <SessionBarItem>
            <SessionBarLabel>London Open</SessionBarLabel>
            <SessionBarTrack>
              <SessionBarFill $color={T.accent} style={{ left: '8.3%', width: '12.5%' }} />
              <SessionBarTime style={{ left: '8.3%' }}>2:00</SessionBarTime>
              <SessionBarTime style={{ left: '20.8%' }}>5:00</SessionBarTime>
            </SessionBarTrack>
            <SessionBarNote>First displacement — sets the daily bias</SessionBarNote>
          </SessionBarItem>
          <SessionBarItem>
            <SessionBarLabel>New York Open</SessionBarLabel>
            <SessionBarTrack>
              <SessionBarFill $color={T.green} style={{ left: '39.5%', width: '10.5%' }} />
              <SessionBarTime style={{ left: '39.5%' }}>9:30</SessionBarTime>
              <SessionBarTime style={{ left: '50%' }}>12:00</SessionBarTime>
            </SessionBarTrack>
            <SessionBarNote>Highest volume — confirmation or reversal of London</SessionBarNote>
          </SessionBarItem>
          <SessionBarItem>
            <SessionBarLabel>NY Lunch</SessionBarLabel>
            <SessionBarTrack>
              <SessionBarFill $color="rgba(255,255,255,0.15)" style={{ left: '50%', width: '5.5%' }} />
              <SessionBarTime style={{ left: '50%' }}>12:00</SessionBarTime>
              <SessionBarTime style={{ left: '55.5%' }}>1:20</SessionBarTime>
            </SessionBarTrack>
            <SessionBarNote>Dead zone — manipulation, no new entries</SessionBarNote>
          </SessionBarItem>
          <SessionBarItem>
            <SessionBarLabel>PM Session</SessionBarLabel>
            <SessionBarTrack>
              <SessionBarFill $color="#a78bfa" style={{ left: '55.5%', width: '10.5%' }} />
              <SessionBarTime style={{ left: '55.5%' }}>1:30</SessionBarTime>
              <SessionBarTime style={{ left: '66%' }}>4:00</SessionBarTime>
            </SessionBarTrack>
            <SessionBarNote>Final push toward daily target — close proximity window</SessionBarNote>
          </SessionBarItem>
        </SessionBarRow>

      </SectionWrapper>

      {/* ═══ 19 — CONTINUATION & NEWS ═══ */}
      <SectionDivider />
      <SectionWrapper id="continnews">
        <SectionLabel>Protocol</SectionLabel>
        <SectionTitle>Continuation &amp; News Protocol</SectionTitle>
        <SectionIntro>
          How to identify continuation setups after the initial displacement, manage
          timeframe alignment, and trade around high-impact news events using ICT principles.
        </SectionIntro>

        {/* Timeframe Awareness */}
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: T.accent, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', marginBottom: '1rem' }}>TIMEFRAME AWARENESS</div>
        <FlowRow>
          <FlowStep>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a78bfa' }}>Monthly / Weekly</div>
            <div style={{ fontSize: '0.6rem', color: T.textDim, marginTop: '0.25rem' }}>Determine narrative &amp; DOL</div>
          </FlowStep>
          <FlowArrow>→</FlowArrow>
          <FlowStep>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent }}>Daily / 4H</div>
            <div style={{ fontSize: '0.6rem', color: T.textDim, marginTop: '0.25rem' }}>Identify PD arrays &amp; bias</div>
          </FlowStep>
          <FlowArrow>→</FlowArrow>
          <FlowStep>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.green }}>1H / 15m</div>
            <div style={{ fontSize: '0.6rem', color: T.textDim, marginTop: '0.25rem' }}>Find setup &amp; structure shift</div>
          </FlowStep>
          <FlowArrow>→</FlowArrow>
          <FlowStep>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fbbf24' }}>5m / 1m</div>
            <div style={{ fontSize: '0.6rem', color: T.textDim, marginTop: '0.25rem' }}>Precision entry &amp; stop</div>
          </FlowStep>
        </FlowRow>

        <TwoCol>
          <ColBox>
            <ColTitle style={{ color: T.accent }}>HTF → LTF Rule</ColTitle>
            <BulletList>
              <Bullet>HTF sets the <strong>narrative</strong> — what is the draw on liquidity?</Bullet>
              <Bullet>LTF provides the <strong>entry</strong> — where is the MSS or FVG?</Bullet>
              <Bullet>Never take a LTF entry that contradicts the HTF bias</Bullet>
              <Bullet>If HTF is bearish, only look for sells on LTF — even if LTF looks bullish</Bullet>
              <Bullet>The only exception: when HTF PD array is reached and MSS confirms reversal</Bullet>
            </BulletList>
          </ColBox>
          <ColBox>
            <ColTitle style={{ color: T.green }}>Continuation Setups</ColTitle>
            <BulletList>
              <Bullet>After the initial MSS + displacement, price retraces to FVG or OB</Bullet>
              <Bullet>LTF shows a <strong>mini-MSS</strong> into the PD array → re-entry</Bullet>
              <Bullet>Each continuation is a fractal of the original setup</Bullet>
              <Bullet>Use the same PD array logic on the pullback leg</Bullet>
              <Bullet>Trail stops to the most recent LTF swing point after each continuation</Bullet>
            </BulletList>
          </ColBox>
        </TwoCol>

        {/* Weekly Profile Shift (from PDF page 8) */}
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a78bfa', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', marginTop: '2rem', marginBottom: '1rem' }}>WEEKLY PROFILE SHIFT</div>
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '1.25rem', border: `1px solid rgba(255,255,255,0.05)`, marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, i) => (
              <div key={day} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: T.textDim, marginBottom: '0.5rem' }}>{day}</div>
                <div style={{ position: 'relative', height: 80, display: 'flex', justifyContent: 'center' }}>
                  {i === 0 && (
                    <div style={{ position: 'relative', width: 16, height: 80 }}>
                      <div style={{ position: 'absolute', left: 7, bottom: 15, width: 2, height: 50, background: T.textDim }} />
                      <div style={{ position: 'absolute', left: 2, bottom: 20, width: 12, height: 25, background: T.textDim, borderRadius: 2 }} />
                    </div>
                  )}
                  {i === 1 && (
                    <div style={{ position: 'relative', width: 16, height: 80 }}>
                      <div style={{ position: 'absolute', left: 7, bottom: 5, width: 2, height: 55, background: T.red }} />
                      <div style={{ position: 'absolute', left: 2, bottom: 5, width: 12, height: 32, background: T.red, borderRadius: 2 }} />
                    </div>
                  )}
                  {i === 2 && (
                    <div style={{ position: 'relative', width: 16, height: 80 }}>
                      <div style={{ position: 'absolute', left: 7, bottom: 0, width: 2, height: 70, background: T.green }} />
                      <div style={{ position: 'absolute', left: 2, bottom: 35, width: 12, height: 30, background: T.green, borderRadius: 2 }} />
                    </div>
                  )}
                  {i === 3 && (
                    <div style={{ position: 'relative', width: 16, height: 80 }}>
                      <div style={{ position: 'absolute', left: 7, bottom: 25, width: 2, height: 50, background: T.green }} />
                      <div style={{ position: 'absolute', left: 2, bottom: 40, width: 12, height: 30, background: T.green, borderRadius: 2 }} />
                    </div>
                  )}
                  {i === 4 && (
                    <div style={{ position: 'relative', width: 16, height: 80 }}>
                      <div style={{ position: 'absolute', left: 7, bottom: 35, width: 2, height: 40, background: T.green }} />
                      <div style={{ position: 'absolute', left: 2, bottom: 45, width: 12, height: 22, background: T.green, borderRadius: 2 }} />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.55rem', color: i <= 1 ? T.red : T.green, fontFamily: "'JetBrains Mono', monospace", marginTop: '0.3rem' }}>
                  {['range', 'judas', 'reversal', 'expansion', 'target'][i]}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.7rem', color: T.textDim, lineHeight: 1.6, borderTop: `1px solid rgba(255,255,255,0.06)`, paddingTop: '0.75rem' }}>
            <strong style={{ color: T.textMuted }}>Midweek Reversal Profile:</strong> Monday consolidates, Tuesday makes the
            Judas swing (fake move), Wednesday reverses at a key PD array, Thursday expands in the true direction,
            Friday seeks the weekly DOL and closes near the target.
          </div>
        </div>

        {/* High Impact News Protocol (from PDF page 14) */}
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', marginTop: '1rem', marginBottom: '1rem' }}>HIGH IMPACT NEWS PROTOCOL</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {[
            ['Before the Event', 'Identify the HTF PD array price is sitting in. Mark BSL and SSL within the current dealing range. Note which pool is more obvious — that is likely where price will be drawn AFTER the news volatility.', '📋', T.accent],
            ['During the Event', 'Do NOT enter during the initial spike. The first move is manipulation — it will sweep the obvious liquidity pool. Wait 5-15 minutes for the dust to settle and a LTF MSS to form.', '⚡', '#f59e0b'],
            ['After the Sweep', 'Once the liquidity has been swept and a MSS confirms on 1m-5m, enter the trade in the direction of the TRUE move. The news event was the catalyst — the PD array was the target.', '🎯', T.green],
            ['Risk Management', 'Reduce position size by 50% on news trades. Wider stops required due to spread expansion. Use the opposite side of the FVG/OB formed during the spike as your stop level.', '🛡️', T.red],
          ].map(([title, desc, icon, color]) => (
            <div key={title} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '1rem 1.25rem', borderTop: `2px solid ${color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '1rem' }}>{icon}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: T.textMain }}>{title}</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: T.textDim, lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>

        <NegativeBox>
          <NegativeTitle>News Trading Red Flags</NegativeTitle>
          <NegativeItem>⊘ Entering during the initial spike before MSS confirmation</NegativeItem>
          <NegativeItem>⊘ Using normal position size — spread can be 3-5× during news</NegativeItem>
          <NegativeItem>⊘ Trading FOMC, NFP, or CPI without marking PD arrays first</NegativeItem>
          <NegativeItem>⊘ Ignoring the 15-minute settling period after the initial volatility</NegativeItem>
        </NegativeBox>

      </SectionWrapper>

      {/* ═══ 20 — ANNOTATED TRADE LIBRARY ═══ */}
      <SectionDivider />
      <SectionWrapper id="tradelib">
        <SectionLabel>Examples</SectionLabel>
        <SectionTitle>Annotated Trade Library</SectionTitle>
        <SectionIntro>
          Real trade setups with ICT concepts applied. Each example identifies the model,
          entry logic, PD array, and draw on liquidity. Study the pattern — not the ticker.
        </SectionIntro>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          {/* Trade 1: OHLC Opposite Range */}
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '1.25rem', border: `1px solid rgba(255,255,255,0.05)` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: T.accent }}>01 — OHLC Opposite Range</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: T.green, padding: '0.15rem 0.5rem', background: 'rgba(74,222,128,0.1)', borderRadius: 4 }}>BUY</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.35rem' }}>Setup Logic</div>
                <div style={{ fontSize: '0.7rem', color: T.textDim, lineHeight: 1.6 }}>
                  Previous day closed bearish. Today opens near PDL. Price sweeps below the open,
                  then reverses — the daily candle will close on the opposite side of the open from the manipulation.
                  Entry on the LTF MSS after the sweep of the open.
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.35rem' }}>Key Concepts</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {['PO3', 'MOP', 'PDL sweep', 'MSS', 'FVG entry'].map(c => (
                    <span key={c} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', padding: '0.15rem 0.5rem', background: 'rgba(34,211,238,0.1)', color: T.accent, borderRadius: 4 }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Trade 2: Re-accumulation OTE */}
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '1.25rem', border: `1px solid rgba(255,255,255,0.05)` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: T.accent }}>02 — Re-Accumulation OTE</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: T.green, padding: '0.15rem 0.5rem', background: 'rgba(74,222,128,0.1)', borderRadius: 4 }}>BUY</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.35rem' }}>Setup Logic</div>
                <div style={{ fontSize: '0.7rem', color: T.textDim, lineHeight: 1.6 }}>
                  HTF bullish. After initial expansion, price retraces into the 62-79% OTE zone
                  of the displacement leg. LTF shows re-accumulation (consolidation within the OTE zone)
                  followed by a MSS confirming continuation.
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.35rem' }}>Key Concepts</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {['OTE', 'HTF bias', 'Re-accumulation', '+OB', 'BISI'].map(c => (
                    <span key={c} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', padding: '0.15rem 0.5rem', background: 'rgba(34,211,238,0.1)', color: T.accent, borderRadius: 4 }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Trade 3: Re-distribution 9:30 Driver */}
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '1.25rem', border: `1px solid rgba(255,255,255,0.05)` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: T.accent }}>03 — Re-Distribution (9:30 Driver)</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: T.red, padding: '0.15rem 0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: 4 }}>SELL</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.35rem' }}>Setup Logic</div>
                <div style={{ fontSize: '0.7rem', color: T.textDim, lineHeight: 1.6 }}>
                  HTF bearish. London pushed up into a &minus;OB. At 9:30 NY open, price makes a
                  final push into BSL then immediately reverses. The 9:30 candle is the &ldquo;time distortion&rdquo; —
                  it uses the NY open energy to complete the manipulation phase.
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.35rem' }}>Key Concepts</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {['MMSM', 'BSL sweep', '-OB', 'NYKZ', 'Time distortion'].map(c => (
                    <span key={c} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', padding: '0.15rem 0.5rem', background: 'rgba(34,211,238,0.1)', color: T.accent, borderRadius: 4 }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Trade 4: Sell Model Framework */}
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '1.25rem', border: `1px solid rgba(255,255,255,0.05)` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: T.accent }}>04 — Sell Model: Reprice Inefficiency</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: T.red, padding: '0.15rem 0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: 4 }}>SELL</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.35rem' }}>Setup Logic</div>
                <div style={{ fontSize: '0.7rem', color: T.textDim, lineHeight: 1.6 }}>
                  Daily SIBI (bearish FVG) left unfilled from previous expansion. Price returns to
                  fill the inefficiency — this is the &ldquo;reprice.&rdquo; At the CE of the SIBI, enter short
                  with stop above the FVG boundary. Target: the next SSL pool below.
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.35rem' }}>Key Concepts</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {['SIBI', 'CE entry', 'SSL target', 'HTF FVG', 'Reprice'].map(c => (
                    <span key={c} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', padding: '0.15rem 0.5rem', background: 'rgba(34,211,238,0.1)', color: T.accent, borderRadius: 4 }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Trade 5: Expansion vs Retracement SMT */}
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '1.25rem', border: `1px solid rgba(255,255,255,0.05)` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: T.accent }}>05 — Expansion vs Retracement (SMT)</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: T.green, padding: '0.15rem 0.5rem', background: 'rgba(74,222,128,0.1)', borderRadius: 4 }}>BUY</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.35rem' }}>Setup Logic</div>
                <div style={{ fontSize: '0.7rem', color: T.textDim, lineHeight: 1.6 }}>
                  ES makes a lower low but NQ fails to — SMT divergence confirmed at a discount
                  PD array. The expansion leg is the one moving away from the PD array; the retracement
                  is the one returning. Trade the expansion side with SMT confirmation.
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.35rem' }}>Key Concepts</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {['SMT', 'ES/NQ divergence', '+OB', 'SSL sweep', 'Expansion'].map(c => (
                    <span key={c} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', padding: '0.15rem 0.5rem', background: 'rgba(34,211,238,0.1)', color: T.accent, borderRadius: 4 }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Trade 6: Buy Model Return Premium */}
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '1.25rem', border: `1px solid rgba(255,255,255,0.05)` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: T.accent }}>06 — Buy Model: Return to Premium</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: T.green, padding: '0.15rem 0.5rem', background: 'rgba(74,222,128,0.1)', borderRadius: 4 }}>BUY</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.35rem' }}>Setup Logic</div>
                <div style={{ fontSize: '0.7rem', color: T.textDim, lineHeight: 1.6 }}>
                  MMBM in play — smart money is accumulating. After displacement up, price returns
                  to discount to reload. Entry at the +OB or BISI with LTF confirmation.
                  Target: return to premium — the BSL pool above the current dealing range.
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.35rem' }}>Key Concepts</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {['MMBM', '+OB', 'BISI', 'BSL target', 'Discount entry'].map(c => (
                    <span key={c} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', padding: '0.15rem 0.5rem', background: 'rgba(34,211,238,0.1)', color: T.accent, borderRadius: 4 }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Trade 7: Order Flow Continuation */}
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '1.25rem', border: `1px solid rgba(255,255,255,0.05)` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: T.accent }}>07 — Order Flow Continuation</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: T.green, padding: '0.15rem 0.5rem', background: 'rgba(74,222,128,0.1)', borderRadius: 4 }}>BUY</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.35rem' }}>Setup Logic</div>
                <div style={{ fontSize: '0.7rem', color: T.textDim, lineHeight: 1.6 }}>
                  Bullish order flow confirmed — each swing low is higher than the last, each
                  expansion creates a BISI. Enter at each new FVG as price stair-steps up.
                  This is the &ldquo;set and forget&rdquo; continuation model — multiple entries, same bias.
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.35rem' }}>Key Concepts</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {['IOF', 'BISI chain', 'BOS confirmed', 'Trail stops', 'Staircase'].map(c => (
                    <span key={c} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', padding: '0.15rem 0.5rem', background: 'rgba(34,211,238,0.1)', color: T.accent, borderRadius: 4 }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Trade 8: High Impact News Reprice */}
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '1.25rem', border: `1px solid rgba(255,255,255,0.05)` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: T.accent }}>08 — High Impact News Reprice</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: T.red, padding: '0.15rem 0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: 4 }}>SELL</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.35rem' }}>Setup Logic</div>
                <div style={{ fontSize: '0.7rem', color: T.textDim, lineHeight: 1.6 }}>
                  CPI release at 8:30. HTF sitting in a premium &minus;OB. Initial spike sweeps BSL above —
                  manipulation. After 15 minutes, 1m MSS forms bearish. Enter short at the FVG left
                  by the reversal candle. Target: SSL pool below the dealing range.
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textMuted, marginBottom: '0.35rem' }}>Key Concepts</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {['News protocol', 'BSL sweep', '-OB', '1m MSS', 'SIBI entry'].map(c => (
                    <span key={c} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', padding: '0.15rem 0.5rem', background: 'rgba(34,211,238,0.1)', color: T.accent, borderRadius: 4 }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <QuoteBlock>
          <QuoteText>&ldquo;Every expert was once a beginner. Study the setups. Journal the outcomes. The patterns will reveal themselves.&rdquo;</QuoteText>
          <QuoteAuthor>— Trading Wisdom</QuoteAuthor>
        </QuoteBlock>

      </SectionWrapper>

      {/* ═══ CTA ═══ */}
      <SectionDivider />
      <CTASection>
        <CTATitle>Stop Watching.<br />Start Profiling.</CTATitle>
        <CTASub>
          Every session you miss is a profile you didn&apos;t read.
          The framework is here — the execution is on you.
        </CTASub>
        <CTAButton href="/polymarket">
          Open the Dashboard →
        </CTAButton>
        <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: T.textDim }}>
          MarketPlayMaker × The Trading Playbook
        </div>
      </CTASection>
    </Page>
  );
}
