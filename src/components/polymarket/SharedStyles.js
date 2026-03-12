import styled, { keyframes, css } from 'styled-components';

// ─── Animations ──────────────────────────────────────────────────────
export const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

export const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const glow = keyframes`
  0%, 100% { box-shadow: 0 0 5px rgba(99, 102, 241, 0.3); }
  50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.6); }
`;

export const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// ─── Styled Components ───────────────────────────────────────────────
export const PageWrapper = styled.div`
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

export const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

export const Header = styled.header`
  text-align: center;
  margin-bottom: 1.25rem;
  animation: ${slideUp} 0.6s ease-out;

  @media (min-width: 768px) {
    margin-bottom: 2rem;
  }
`;

export const Title = styled.h1`
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

export const Subtitle = styled.p`
  color: #94a3b8;
  font-size: 0.9rem;
  max-width: 600px;
  margin: 0 auto;
  padding: 0 0.5rem;

  @media (min-width: 768px) {
    font-size: 1.1rem;
  }
`;

export const Grid = styled.div`
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

export const FullWidthSection = styled.div`
  grid-column: 1 / -1;
`;

export const Card = styled.div`
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

export const CardTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 700;
  color: #c7d2fe;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const StatCard = styled.div`
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

export const StatValue = styled.div`
  font-size: 1.15rem;
  font-weight: 800;
  color: ${(props) => props.$color || '#818cf8'};
  font-variant-numeric: tabular-nums;

  @media (min-width: 768px) {
    font-size: 1.5rem;
  }
`;

export const StatLabel = styled.div`
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.25rem;
`;

export const Button = styled.button`
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

export const Badge = styled.span`
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

export const Input = styled.input`
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

export const Table = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

export const TableRow = styled.div`
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

export const PriceBar = styled.div`
  height: 6px;
  background: rgba(99, 102, 241, 0.15);
  border-radius: 3px;
  overflow: hidden;
  width: 100%;
`;

export const PriceFill = styled.div`
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

export const LiveDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(props) => (props.$active ? '#10b981' : '#ef4444')};
  animation: ${(props) => (props.$active ? pulse : 'none')} 2s infinite;
  margin-right: 0.5rem;
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #64748b;
  font-size: 0.9rem;
`;

export const LoadingBar = styled.div`
  height: 4px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 1rem;
`;

export const LoadingFill = styled.div`
  height: 100%;
  width: 30%;
  background: linear-gradient(90deg, transparent, #6366f1, transparent);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 2px;
`;

export const TabBar = styled.div`
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

export const Tab = styled.button`
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

export const Chip = styled.span`
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
