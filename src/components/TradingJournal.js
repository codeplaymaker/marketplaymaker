import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  collection, getDocs, addDoc, query, where, doc, deleteDoc, updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import useModal from '../hooks/useModal';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

/* ═══════════════════════════════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════════════════════════════ */
const T = {
  bg:       '#0a0a12',
  card:     'rgba(22, 22, 38, 0.85)',
  border:   'rgba(99, 102, 241, 0.12)',
  borderHi: 'rgba(99, 102, 241, 0.35)',
  text:     '#e2e8f0',
  muted:    '#94a3b8',
  dim:      '#64748b',
  indigo:   '#6366f1',
  purple:   '#818cf8',
  lavender: '#a5b4fc',
  green:    '#34d399',
  greenBg:  'rgba(52, 211, 153, 0.12)',
  red:      '#f87171',
  redBg:    'rgba(248, 113, 113, 0.12)',
  amber:    '#fbbf24',
  radius:   '14px',
};

/* ═══════════════════════════════════════════════════════════════════════
   ANIMATIONS
   ═══════════════════════════════════════════════════════════════════════ */
const slideUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

/* ═══════════════════════════════════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════════════════════════════════ */
const Page = styled.div`
  min-height: 100vh;
  background: linear-gradient(160deg, #0a0a14 0%, #12122a 50%, #14203a 100%);
  color: ${T.text};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  padding: 1rem 0.75rem 3rem;
  @media (min-width: 768px) { padding: 2rem 2rem 4rem; }
`;

const Container = styled.div`
  max-width: 1280px;
  margin: 0 auto;
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 1.5rem;
  animation: ${slideUp} 0.5s ease-out;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #fff, ${T.lavender}, ${T.purple});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.35rem;
  @media (min-width: 768px) { font-size: 2.75rem; }
`;

const Subtitle = styled.p`
  color: ${T.muted};
  font-size: 0.9rem;
  margin: 0;
`;

/* ─── Tabs ─────────────────────────────────────────────────────────── */
const TabBar = styled.nav`
  display: flex;
  gap: 0.25rem;
  background: rgba(15, 15, 28, 0.6);
  border: 1px solid ${T.border};
  border-radius: 12px;
  padding: 4px;
  margin: 0 auto 1.5rem;
  max-width: 460px;
  animation: ${slideUp} 0.5s ease-out 0.1s both;
`;

const Tab = styled.button`
  flex: 1;
  padding: 0.55rem 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s;
  background: ${p => p.$active ? `linear-gradient(135deg, ${T.indigo}, ${T.purple})` : 'transparent'};
  color: ${p => p.$active ? '#fff' : T.muted};
  &:hover { color: #fff; }
  @media (min-width: 768px) { font-size: 0.85rem; padding: 0.6rem 1rem; }
`;

/* ─── Cards ────────────────────────────────────────────────────────── */
const Card = styled.div`
  background: ${T.card};
  border: 1px solid ${T.border};
  border-radius: ${T.radius};
  padding: 1rem;
  backdrop-filter: blur(10px);
  transition: border-color 0.3s, transform 0.3s;
  animation: ${slideUp} 0.5s ease-out ${p => p.$delay || '0s'} both;
  &:hover { border-color: ${T.borderHi}; }
  @media (min-width: 768px) { padding: 1.25rem; }
`;

const CardTitle = styled.h2`
  font-size: 0.95rem;
  font-weight: 700;
  color: #c7d2fe;
  margin: 0 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

/* ─── KPI Strip ────────────────────────────────────────────────────── */
const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
  animation: ${slideUp} 0.5s ease-out 0.15s both;

  @media (min-width: 768px) {
    grid-template-columns: repeat(6, 1fr);
    gap: 0.75rem;
  }
`;

const KPICard = styled.div`
  background: ${T.card};
  border: 1px solid ${T.border};
  border-radius: 12px;
  padding: 0.75rem 0.5rem;
  text-align: center;
  transition: border-color 0.3s, transform 0.3s;
  &:hover { border-color: ${T.borderHi}; transform: translateY(-2px); }
`;

const KPILabel = styled.div`
  font-size: 0.65rem;
  font-weight: 600;
  color: ${T.dim};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
  @media (min-width: 768px) { font-size: 0.7rem; }
`;

const KPIValue = styled.div`
  font-size: 1.15rem;
  font-weight: 800;
  color: ${p => p.$color || T.text};
  @media (min-width: 768px) { font-size: 1.35rem; }
`;

/* ─── Two-column layout ────────────────────────────────────────────── */
const TwoCol = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
  @media (min-width: 1024px) {
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
  }
`;

/* ─── Trade Table ──────────────────────────────────────────────────── */
const TradeRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid ${T.border};
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: rgba(99, 102, 241, 0.06); }
  &:last-child { border-bottom: none; }

  @media (min-width: 768px) {
    grid-template-columns: 100px 1fr auto auto auto auto;
  }
`;

const TradeRowHeader = styled(TradeRow)`
  font-size: 0.7rem;
  font-weight: 700;
  color: ${T.dim};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: default;
  &:hover { background: none; }
  border-bottom: 1px solid ${T.borderHi};
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  ${p => p.$variant === 'win' && css`background: ${T.greenBg}; color: ${T.green};`}
  ${p => p.$variant === 'loss' && css`background: ${T.redBg}; color: ${T.red};`}
  ${p => p.$variant === 'be' && css`background: rgba(251, 191, 36, 0.12); color: ${T.amber};`}
  ${p => p.$variant === 'long' && css`background: ${T.greenBg}; color: ${T.green};`}
  ${p => p.$variant === 'short' && css`background: ${T.redBg}; color: ${T.red};`}
`;

const PnlText = styled.span`
  font-weight: 700;
  font-size: 0.85rem;
  color: ${p => p.$val > 0 ? T.green : p.$val < 0 ? T.red : T.muted};
`;

/* ─── Form Styles ──────────────────────────────────────────────────── */
const FormGrid = styled.div`
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;
  @media (min-width: 600px) { grid-template-columns: 1fr 1fr; }
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  ${p => p.$full && css`
    @media (min-width: 600px) { grid-column: 1 / -1; }
  `}
`;

const Label = styled.label`
  font-size: 0.7rem;
  font-weight: 600;
  color: ${T.dim};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const Input = styled.input`
  padding: 0.6rem 0.75rem;
  font-size: 15px;
  border: 1px solid ${T.border};
  border-radius: 10px;
  background: rgba(10, 10, 18, 0.6);
  color: ${T.text};
  transition: border-color 0.2s, box-shadow 0.2s;
  &:focus {
    border-color: ${T.indigo};
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }
  &::placeholder { color: ${T.dim}; }
`;

const Select = styled.select`
  padding: 0.6rem 0.75rem;
  font-size: 15px;
  border: 1px solid ${T.border};
  border-radius: 10px;
  background: rgba(10, 10, 18, 0.6);
  color: ${T.text};
  cursor: pointer;
  transition: border-color 0.2s;
  &:focus {
    border-color: ${T.indigo};
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }
  option { background: #12122a; color: ${T.text}; }
`;

const TextArea = styled.textarea`
  padding: 0.6rem 0.75rem;
  font-size: 15px;
  border: 1px solid ${T.border};
  border-radius: 10px;
  background: rgba(10, 10, 18, 0.6);
  color: ${T.text};
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
  transition: border-color 0.2s;
  &:focus {
    border-color: ${T.indigo};
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }
  &::placeholder { color: ${T.dim}; }
`;

const BtnRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
  ${p => p.$full && css`
    @media (min-width: 600px) { grid-column: 1 / -1; }
  `}
`;

const Btn = styled.button`
  padding: 0.6rem 1.25rem;
  font-size: 0.85rem;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
  &:hover { opacity: 0.9; }
  &:active { transform: scale(0.97); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  ${p => p.$primary && css`
    background: linear-gradient(135deg, ${T.indigo}, ${T.purple});
    color: #fff;
  `}
  ${p => p.$ghost && css`
    background: rgba(99, 102, 241, 0.1);
    color: ${T.lavender};
    border: 1px solid ${T.border};
  `}
  ${p => p.$danger && css`
    background: ${T.redBg};
    color: ${T.red};
    border: 1px solid rgba(248, 113, 113, 0.2);
  `}
`;

/* ─── Calendar overrides ───────────────────────────────────────────── */
const CalendarWrap = styled.div`
  .react-calendar {
    width: 100%;
    background: transparent;
    border: none;
    font-family: inherit;
    color: ${T.text};
  }
  .react-calendar__navigation { margin-bottom: 0.25rem; }
  .react-calendar__navigation button {
    color: ${T.text};
    font-weight: 600;
    font-size: 0.9rem;
    border-radius: 8px;
    &:hover, &:focus { background: rgba(99, 102, 241, 0.1); }
    &:disabled { color: ${T.dim}; }
  }
  .react-calendar__month-view__weekdays {
    font-size: 0.65rem;
    text-transform: uppercase;
    color: ${T.dim};
    font-weight: 700;
    abbr { text-decoration: none; }
  }
  .react-calendar__tile {
    padding: 0.5rem 0.15rem;
    border-radius: 8px;
    color: ${T.text};
    font-size: 0.75rem;
    position: relative;
    transition: background 0.2s;
    &:hover { background: rgba(99, 102, 241, 0.08); }
  }
  .react-calendar__tile--now {
    background: rgba(99, 102, 241, 0.1);
    font-weight: 700;
  }
  .react-calendar__tile--active {
    background: linear-gradient(135deg, ${T.indigo}, ${T.purple}) !important;
    color: #fff;
    border-radius: 8px;
  }
  .react-calendar__month-view__days__day--neighboringMonth { color: ${T.dim}; opacity: 0.4; }
`;

const DayDot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin: 2px auto 0;
  background: ${p => p.$color};
`;

/* ─── Modal ────────────────────────────────────────────────────────── */
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${fadeIn} 0.2s ease-out;
  padding: 1rem;
`;

const ModalCard = styled.div`
  background: #12122a;
  border: 1px solid ${T.borderHi};
  border-radius: 16px;
  padding: 1.5rem;
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  overflow-y: auto;
  position: relative;
  animation: ${slideUp} 0.3s ease-out;
`;

const ModalClose = styled.button`
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid ${T.border};
  color: ${T.muted};
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { color: #fff; border-color: ${T.borderHi}; }
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const DetailItem = styled.div`
  background: rgba(10, 10, 20, 0.5);
  border: 1px solid ${T.border};
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  ${p => p.$full && css`grid-column: 1 / -1;`}
`;

const DetailLabel = styled.div`
  font-size: 0.65rem;
  font-weight: 600;
  color: ${T.dim};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.15rem;
`;

const DetailValue = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${p => p.$color || T.text};
`;

/* ─── Empty state ──────────────────────────────────────────────────── */
const EmptyState = styled.div`
  text-align: center;
  padding: 2.5rem 1rem;
  color: ${T.muted};
  animation: ${fadeIn} 0.5s ease-out;
`;

const EmptyIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  opacity: 0.6;
`;

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════ */
const strip = v => String(v || '').replace(/[^0-9.\x2D]+/g, '');
const fmtPnl = v => {
  const n = parseFloat(strip(v));
  if (isNaN(n)) return '$0.00';
  return `${n >= 0 ? '+' : ''}$${n.toFixed(2)}`;
};
const fmtPct = v => {
  const n = parseFloat(strip(v));
  if (isNaN(n)) return '0%';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
};
const fmtDate = d => {
  const dt = new Date(d);
  if (isNaN(dt)) return new Date().toISOString().split('T')[0];
  return dt.toISOString().split('T')[0];
};
const toDateKey = d => {
  const dt = new Date(d);
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${m}-${day}`;
};

const DIRECTION_OPTS = ['Long', 'Short'];
const OUTCOME_OPTS  = ['Win', 'Loss', 'Break Even'];
const KILLZONE_OPTS = ['London Open', 'NY Open', 'London Close', 'Asian', 'Overlap', 'Other'];
const MODEL_OPTS    = ['ICT OTE', 'FVG', 'Breaker Block', 'Order Block', 'Liquidity Sweep',
                       'SMT Divergence', 'Turtle Soup', 'Silver Bullet', 'Other'];

const PIE_COLORS = [T.green, T.red, T.amber];

const EMPTY_ENTRY = {
  pair: '', direction: '', date: '', outcome: '', pnl: '', gain: '',
  risk: '', rrr: '', entryTf: '', entryWindow: '', day: '',
  model: '', killzone: '', timeInTrade: '', notes: '',
};

/* ═══════════════════════════════════════════════════════════════════════
   MINI SPARKLINE (pure SVG)
   ═══════════════════════════════════════════════════════════════════════ */
const Sparkline = ({ data, width = 200, height = 50, color = T.indigo }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`
  ).join(' ');
  const gradId = `sp-${color.replace('#', '')}`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${pts} ${width},${height}`}
        fill={`url(#${gradId})`}
      />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */
const TradingJournal = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [tab, setTab] = useState('dashboard');
  const [calDate, setCalDate] = useState(new Date());
  const [form, setForm] = useState({ ...EMPTY_ENTRY });
  const [editMode, setEditMode] = useState(false);
  const [modalEntry, setModalEntry] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sortField, setSortField] = useState('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterOutcome, setFilterOutcome] = useState('all');

  /* ─── Data fetching ────────────────────────────────────────────── */
  const fetchEntries = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const q = query(collection(db, 'tradingJournal'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      setError('Failed to load journal. Please refresh.');
    }
  }, [user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  /* ─── Stats ────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    let totalPnl = 0, wins = 0, losses = 0, winPnl = 0, lossPnl = 0;
    let best = -Infinity, worst = Infinity;
    let streak = 0, maxStreak = 0, curStreakType = null;
    const daily = {};

    const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach(e => {
      const pnl = parseFloat(strip(e.pnl));
      if (isNaN(pnl)) return;
      totalPnl += pnl;
      if (pnl > 0) { wins++; winPnl += pnl; best = Math.max(best, pnl); }
      else if (pnl < 0) { losses++; lossPnl += pnl; worst = Math.min(worst, pnl); }

      const type = pnl > 0 ? 'w' : pnl < 0 ? 'l' : null;
      if (type && type === curStreakType) { streak++; }
      else if (type) { streak = 1; curStreakType = type; }
      maxStreak = Math.max(maxStreak, streak);

      const dk = toDateKey(e.date);
      daily[dk] = (daily[dk] || 0) + pnl;
    });

    const total = wins + losses;
    const winRate = total ? (wins / total) * 100 : 0;
    const pf = lossPnl === 0 ? (winPnl > 0 ? Infinity : 0) : winPnl / Math.abs(lossPnl);
    const avgWin = wins ? winPnl / wins : 0;
    const avgLoss = losses ? lossPnl / losses : 0;

    // Cumulative equity curve
    const dailyKeys = Object.keys(daily).sort();
    let cum = 0;
    const equity = dailyKeys.map(k => { cum += daily[k]; return { date: k, pnl: daily[k], cumPnl: cum }; });

    // Cumulative sparkline data
    const sparkData = equity.map(e => e.cumPnl);

    return {
      totalPnl, wins, losses, total, winRate, pf, avgWin, avgLoss,
      best: best === -Infinity ? 0 : best,
      worst: worst === Infinity ? 0 : worst,
      streak, streakType: curStreakType, maxStreak,
      equity, sparkData, daily,
    };
  }, [entries]);

  /* ─── Sorting & filtering ──────────────────────────────────────── */
  const filteredEntries = useMemo(() => {
    let list = [...entries];
    if (filterOutcome !== 'all') {
      list = list.filter(e => {
        const out = (e.outcome || '').toLowerCase();
        if (filterOutcome === 'win') return out === 'win';
        if (filterOutcome === 'loss') return out === 'loss';
        return out === 'break even' || out === 'be';
      });
    }
    list.sort((a, b) => {
      let va = a[sortField] || '', vb = b[sortField] || '';
      if (sortField === 'pnl') { va = parseFloat(strip(va)) || 0; vb = parseFloat(strip(vb)) || 0; }
      if (sortField === 'date') { va = new Date(va); vb = new Date(vb); }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [entries, filterOutcome, sortField, sortAsc]);

  /* ─── Calendar entries ─────────────────────────────────────────── */
  const calEntries = useMemo(() => {
    const key = toDateKey(calDate);
    return entries.filter(e => toDateKey(e.date) === key);
  }, [entries, calDate]);

  /* ─── Handlers ─────────────────────────────────────────────────── */
  const handleSort = field => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(field === 'date' ? false : true); }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const resetForm = () => { setForm({ ...EMPTY_ENTRY }); setEditMode(false); };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const data = { ...form };
      // Clean pnl
      if (data.pnl && !data.pnl.startsWith('$') && !data.pnl.startsWith('-$')) {
        const n = parseFloat(strip(data.pnl));
        if (!isNaN(n)) data.pnl = `$${n.toFixed(2)}`;
      }
      if (editMode) {
        const ref = doc(db, 'tradingJournal', form.id);
        // eslint-disable-next-line no-unused-vars
        const { id: _id, ...rest } = data;
        await updateDoc(ref, rest);
        setEditMode(false);
      } else {
        await addDoc(collection(db, 'tradingJournal'), { ...data, userId: user.uid });
      }
      resetForm();
      fetchEntries();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = entry => {
    setForm(entry);
    setEditMode(true);
    setTab('add');
  };

  const handleDelete = async id => {
    try {
      await deleteDoc(doc(db, 'tradingJournal', id));
      setDeleteConfirm(null);
      setModalEntry(null);
      fetchEntries();
    } catch {
      setError('Failed to delete.');
    }
  };

  const closeModal = useCallback(() => setModalEntry(null), []);
  useModal(!!modalEntry, closeModal);

  /* ─── Calendar tile content ────────────────────────────────────── */
  const tileContent = ({ date: d }) => {
    const k = toDateKey(d);
    const dayPnl = stats.daily[k];
    if (dayPnl === undefined) return null;
    return <DayDot $color={dayPnl > 0 ? T.green : dayPnl < 0 ? T.red : T.amber} />;
  };

  /* ─── Pie data ─────────────────────────────────────────────────── */
  const pieData = useMemo(() => [
    { name: 'Wins', value: stats.wins },
    { name: 'Losses', value: stats.losses },
    { name: 'B/E', value: Math.max(0, stats.total > 0 ? entries.length - stats.wins - stats.losses : 0) },
  ].filter(d => d.value > 0), [stats, entries.length]);

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <Page>
      <Container>
        <Header>
          <Title>Trading Journal</Title>
          <Subtitle>Track every trade. Measure every edge. Improve every day.</Subtitle>
        </Header>

        <TabBar>
          <Tab $active={tab === 'dashboard'} onClick={() => setTab('dashboard')}>📊 Dashboard</Tab>
          <Tab $active={tab === 'trades'} onClick={() => setTab('trades')}>📋 Trades</Tab>
          <Tab $active={tab === 'calendar'} onClick={() => setTab('calendar')}>📅 Calendar</Tab>
          <Tab $active={tab === 'add'} onClick={() => { setTab('add'); if (!editMode) resetForm(); }}>
            ✏️ {editMode ? 'Edit' : 'Log Trade'}
          </Tab>
        </TabBar>

        {error && (
          <div style={{ textAlign: 'center', color: T.red, fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</div>
        )}

        {/* ─── DASHBOARD TAB ──────────────────────────────────────── */}
        {tab === 'dashboard' && (
          <>
            <KPIGrid>
              <KPICard>
                <KPILabel>Total P&L</KPILabel>
                <KPIValue $color={stats.totalPnl >= 0 ? T.green : T.red}>
                  {fmtPnl(String(stats.totalPnl))}
                </KPIValue>
              </KPICard>
              <KPICard>
                <KPILabel>Win Rate</KPILabel>
                <KPIValue $color={stats.winRate >= 50 ? T.green : stats.winRate > 0 ? T.amber : T.muted}>
                  {stats.winRate.toFixed(1)}%
                </KPIValue>
              </KPICard>
              <KPICard>
                <KPILabel>Profit Factor</KPILabel>
                <KPIValue $color={stats.pf >= 1.5 ? T.green : stats.pf >= 1 ? T.amber : T.red}>
                  {stats.pf === Infinity ? '∞' : stats.pf.toFixed(2)}
                </KPIValue>
              </KPICard>
              <KPICard>
                <KPILabel>Total Trades</KPILabel>
                <KPIValue>{entries.length}</KPIValue>
              </KPICard>
              <KPICard>
                <KPILabel>Best Trade</KPILabel>
                <KPIValue $color={T.green}>{fmtPnl(String(stats.best))}</KPIValue>
              </KPICard>
              <KPICard>
                <KPILabel>Worst Trade</KPILabel>
                <KPIValue $color={T.red}>{fmtPnl(String(stats.worst))}</KPIValue>
              </KPICard>
            </KPIGrid>

            {entries.length === 0 ? (
              <EmptyState>
                <EmptyIcon>📓</EmptyIcon>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: T.text, marginBottom: '0.5rem' }}>
                  Your journal is empty
                </div>
                <div style={{ marginBottom: '1rem' }}>Log your first trade to unlock analytics, equity curves, and win-rate tracking.</div>
                <Btn $primary onClick={() => setTab('add')}>Log First Trade →</Btn>
              </EmptyState>
            ) : (
              <>
                {/* Equity Curve */}
                <Card $delay="0.2s" style={{ marginBottom: '1rem' }}>
                  <CardTitle>📈 Equity Curve</CardTitle>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={stats.equity} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                      <defs>
                        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={stats.totalPnl >= 0 ? T.green : T.red} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={stats.totalPnl >= 0 ? T.green : T.red} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                      <XAxis dataKey="date" stroke={T.dim} tick={{ fill: T.dim, fontSize: 11 }}
                        tickFormatter={v => v.slice(5)} />
                      <YAxis stroke={T.dim} tick={{ fill: T.dim, fontSize: 11 }}
                        tickFormatter={v => `$${v}`} />
                      <Tooltip
                        contentStyle={{
                          background: '#12122a', border: `1px solid ${T.borderHi}`,
                          borderRadius: '10px', fontSize: '0.8rem', color: T.text,
                        }}
                        formatter={(v) => [`$${v.toFixed(2)}`, 'Cumulative P&L']}
                        labelFormatter={l => `Date: ${l}`}
                      />
                      <Area type="monotone" dataKey="cumPnl" stroke={stats.totalPnl >= 0 ? T.green : T.red}
                        strokeWidth={2.5} fill="url(#eqGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                <TwoCol>
                  {/* Win/Loss Pie */}
                  <Card $delay="0.3s">
                    <CardTitle>🎯 Win / Loss Distribution</CardTitle>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
                      <PieChart width={130} height={130}>
                        <Pie data={pieData} cx={65} cy={65} innerRadius={38} outerRadius={58}
                          paddingAngle={3} dataKey="value" strokeWidth={0}>
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                      <div style={{ fontSize: '0.8rem' }}>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <span style={{ color: T.green, fontWeight: 700 }}>● </span>
                          Wins: <strong>{stats.wins}</strong>
                          <span style={{ color: T.dim, marginLeft: '0.5rem' }}>avg {fmtPnl(String(stats.avgWin))}</span>
                        </div>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <span style={{ color: T.red, fontWeight: 700 }}>● </span>
                          Losses: <strong>{stats.losses}</strong>
                          <span style={{ color: T.dim, marginLeft: '0.5rem' }}>avg {fmtPnl(String(stats.avgLoss))}</span>
                        </div>
                        {stats.streak > 1 && (
                          <div style={{ marginTop: '0.75rem', color: stats.streakType === 'w' ? T.green : T.red, fontWeight: 600, fontSize: '0.85rem' }}>
                            🔥 {stats.streak}-{stats.streakType === 'w' ? 'win' : 'loss'} streak
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Quick Stats */}
                  <Card $delay="0.35s">
                    <CardTitle>⚡ Performance Snapshot</CardTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      {[
                        { label: 'Avg Win', val: fmtPnl(String(stats.avgWin)), color: T.green },
                        { label: 'Avg Loss', val: fmtPnl(String(stats.avgLoss)), color: T.red },
                        { label: 'W / L', val: `${stats.wins} / ${stats.losses}`, color: T.text },
                        { label: 'Max Streak', val: String(stats.maxStreak), color: T.amber },
                      ].map(s => (
                        <div key={s.label} style={{ background: 'rgba(10,10,20,0.5)', border: `1px solid ${T.border}`, borderRadius: '10px', padding: '0.6rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.65rem', color: T.dim, fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.15rem' }}>{s.label}</div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: s.color }}>{s.val}</div>
                        </div>
                      ))}
                    </div>
                    {stats.sparkData.length > 2 && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ fontSize: '0.65rem', color: T.dim, fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>P&L Trend</div>
                        <Sparkline data={stats.sparkData} width={280} height={40}
                          color={stats.totalPnl >= 0 ? T.green : T.red} />
                      </div>
                    )}
                  </Card>
                </TwoCol>
              </>
            )}
          </>
        )}

        {/* ─── TRADES TAB ─────────────────────────────────────────── */}
        {tab === 'trades' && (
          <Card $delay="0.1s">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <CardTitle style={{ margin: 0 }}>📋 Trade Log ({filteredEntries.length})</CardTitle>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {['all', 'win', 'loss', 'be'].map(f => (
                  <Btn key={f} $ghost={filterOutcome !== f} $primary={filterOutcome === f}
                    onClick={() => setFilterOutcome(f)}
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}>
                    {f === 'all' ? 'All' : f === 'be' ? 'B/E' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </Btn>
                ))}
              </div>
            </div>

            {filteredEntries.length === 0 ? (
              <EmptyState>
                <EmptyIcon>📝</EmptyIcon>
                <div>No trades yet. Log your first one!</div>
                <Btn $primary onClick={() => setTab('add')} style={{ marginTop: '0.75rem' }}>Log Trade</Btn>
              </EmptyState>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <TradeRowHeader>
                  <div style={{ display: 'none', '@media (min-width: 768px)': { display: 'block' } }}
                    onClick={() => handleSort('date')}>
                    Date {sortField === 'date' ? (sortAsc ? '↑' : '↓') : ''}
                  </div>
                  <div onClick={() => handleSort('pair')} style={{ cursor: 'pointer' }}>
                    Pair {sortField === 'pair' ? (sortAsc ? '↑' : '↓') : ''}
                  </div>
                  <div>Direction</div>
                  <div onClick={() => handleSort('pnl')} style={{ cursor: 'pointer' }}>
                    P&L {sortField === 'pnl' ? (sortAsc ? '↑' : '↓') : ''}
                  </div>
                  <div style={{ display: 'none' }}>RRR</div>
                  <div style={{ display: 'none' }}>Actions</div>
                </TradeRowHeader>

                {filteredEntries.map(entry => {
                  const pnl = parseFloat(strip(entry.pnl)) || 0;
                  const dir = (entry.direction || '').toLowerCase();
                  return (
                    <TradeRow key={entry.id} onClick={() => setModalEntry(entry)}>
                      <div style={{ display: 'none', '@media (min-width: 768px)': { display: 'block' }, fontSize: '0.8rem', color: T.muted }}>
                        {entry.date ? fmtDate(entry.date).slice(5) : '—'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{entry.pair || '—'}</div>
                        <div style={{ fontSize: '0.7rem', color: T.dim }}>
                          {entry.date ? fmtDate(entry.date) : ''} {entry.killzone ? `· ${entry.killzone}` : ''}
                        </div>
                      </div>
                      <Badge $variant={dir === 'long' ? 'long' : dir === 'short' ? 'short' : undefined}>
                        {entry.direction || '—'}
                      </Badge>
                      <PnlText $val={pnl}>{fmtPnl(entry.pnl)}</PnlText>
                      <div style={{ fontSize: '0.8rem', color: T.muted, display: 'none' }}>
                        {entry.rrr || '—'}
                      </div>
                      <div style={{ display: 'none' }}>
                        <Btn $ghost onClick={e => { e.stopPropagation(); handleEdit(entry); }}
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}>Edit</Btn>
                      </div>
                    </TradeRow>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* ─── CALENDAR TAB ───────────────────────────────────────── */}
        {tab === 'calendar' && (
          <TwoCol>
            <Card $delay="0.1s">
              <CardTitle>📅 Trade Calendar</CardTitle>
              <CalendarWrap>
                <Calendar onChange={setCalDate} value={calDate} tileContent={tileContent} />
              </CalendarWrap>
              <div style={{ marginTop: '0.75rem', textAlign: 'center', fontSize: '0.75rem', color: T.dim }}>
                <span style={{ marginRight: '1rem' }}><span style={{ color: T.green }}>●</span> Profit day</span>
                <span style={{ marginRight: '1rem' }}><span style={{ color: T.red }}>●</span> Loss day</span>
                <span><span style={{ color: T.amber }}>●</span> Break even</span>
              </div>
            </Card>

            <Card $delay="0.15s">
              <CardTitle>
                Trades on {calDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </CardTitle>
              {calEntries.length === 0 ? (
                <EmptyState style={{ padding: '1.5rem' }}>
                  <EmptyIcon>😴</EmptyIcon>
                  <div>No trades on this day</div>
                </EmptyState>
              ) : (
                calEntries.map((entry, i) => {
                  const pnl = parseFloat(strip(entry.pnl)) || 0;
                  return (
                    <div key={entry.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.6rem 0.75rem', borderBottom: i < calEntries.length - 1 ? `1px solid ${T.border}` : 'none',
                      cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s',
                    }}
                    onClick={() => setModalEntry(entry)}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{entry.pair || 'Untitled'}</div>
                        <div style={{ fontSize: '0.7rem', color: T.dim }}>
                          {entry.direction || ''} {entry.model ? `· ${entry.model}` : ''}
                        </div>
                      </div>
                      <PnlText $val={pnl}>{fmtPnl(entry.pnl)}</PnlText>
                    </div>
                  );
                })
              )}
              {calEntries.length > 0 && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(10,10,20,0.5)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: T.dim }}>Day total</span>
                  <PnlText $val={calEntries.reduce((s, e) => s + (parseFloat(strip(e.pnl)) || 0), 0)}>
                    {fmtPnl(String(calEntries.reduce((s, e) => s + (parseFloat(strip(e.pnl)) || 0), 0)))}
                  </PnlText>
                </div>
              )}
            </Card>
          </TwoCol>
        )}

        {/* ─── ADD / EDIT TAB ─────────────────────────────────────── */}
        {tab === 'add' && (
          <Card $delay="0.1s" style={{ maxWidth: '700px', margin: '0 auto' }}>
            <CardTitle>{editMode ? '✏️ Edit Trade' : '📝 Log New Trade'}</CardTitle>
            <form onSubmit={handleSubmit}>
              <FormGrid>
                {/* ── Trade Info ───── */}
                <FieldGroup>
                  <Label htmlFor="j-pair">Pair / Market</Label>
                  <Input id="j-pair" name="pair" placeholder="e.g. EUR/USD, NQ, BTC"
                    value={form.pair} onChange={handleChange} required />
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="j-direction">Direction</Label>
                  <Select id="j-direction" name="direction" value={form.direction} onChange={handleChange} required>
                    <option value="">Select...</option>
                    {DIRECTION_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                  </Select>
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="j-date">Date</Label>
                  <Input id="j-date" type="date" name="date" value={form.date} onChange={handleChange} required />
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="j-outcome">Outcome</Label>
                  <Select id="j-outcome" name="outcome" value={form.outcome} onChange={handleChange} required>
                    <option value="">Select...</option>
                    {OUTCOME_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                  </Select>
                </FieldGroup>

                {/* ── Numbers ───── */}
                <FieldGroup>
                  <Label htmlFor="j-pnl">P&L ($)</Label>
                  <Input id="j-pnl" name="pnl" placeholder="e.g. 150 or -50"
                    value={form.pnl} onChange={handleChange} />
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="j-gain">Gain (%)</Label>
                  <Input id="j-gain" name="gain" placeholder="e.g. 2.5"
                    value={form.gain} onChange={handleChange} />
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="j-risk">Risk ($)</Label>
                  <Input id="j-risk" name="risk" placeholder="e.g. 100"
                    value={form.risk} onChange={handleChange} />
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="j-rrr">R:R Ratio</Label>
                  <Input id="j-rrr" name="rrr" placeholder="e.g. 3:1"
                    value={form.rrr} onChange={handleChange} />
                </FieldGroup>

                {/* ── Entry Details ───── */}
                <FieldGroup>
                  <Label htmlFor="j-entryTf">Entry Timeframe</Label>
                  <Input id="j-entryTf" name="entryTf" placeholder="e.g. 15m, 1H, 4H"
                    value={form.entryTf} onChange={handleChange} />
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="j-entryWindow">Entry Window</Label>
                  <Input id="j-entryWindow" name="entryWindow" placeholder="e.g. 10:30-11:00"
                    value={form.entryWindow} onChange={handleChange} />
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="j-day">Day of Week</Label>
                  <Select id="j-day" name="day" value={form.day} onChange={handleChange}>
                    <option value="">Select...</option>
                    {['Monday','Tuesday','Wednesday','Thursday','Friday'].map(d => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="j-timeInTrade">Time in Trade</Label>
                  <Input id="j-timeInTrade" name="timeInTrade" placeholder="e.g. 45m, 2h"
                    value={form.timeInTrade} onChange={handleChange} />
                </FieldGroup>

                {/* ── ICT / Model ───── */}
                <FieldGroup>
                  <Label htmlFor="j-model">Model / Setup</Label>
                  <Select id="j-model" name="model" value={form.model} onChange={handleChange}>
                    <option value="">Select...</option>
                    {MODEL_OPTS.map(m => <option key={m} value={m}>{m}</option>)}
                  </Select>
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="j-killzone">Killzone</Label>
                  <Select id="j-killzone" name="killzone" value={form.killzone} onChange={handleChange}>
                    <option value="">Select...</option>
                    {KILLZONE_OPTS.map(k => <option key={k} value={k}>{k}</option>)}
                  </Select>
                </FieldGroup>

                {/* ── Notes ───── */}
                <FieldGroup $full>
                  <Label htmlFor="j-notes">Notes</Label>
                  <TextArea id="j-notes" name="notes" placeholder="What went right? What could improve? Market context, emotions, lessons..."
                    value={form.notes || ''} onChange={handleChange} rows={3} />
                </FieldGroup>

                <BtnRow $full>
                  <Btn $primary type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : editMode ? '💾 Update Trade' : '✅ Log Trade'}
                  </Btn>
                  {editMode && (
                    <Btn $ghost type="button" onClick={resetForm}>Cancel</Btn>
                  )}
                </BtnRow>
              </FormGrid>
            </form>
          </Card>
        )}

        {/* ─── DETAIL MODAL ───────────────────────────────────────── */}
        {modalEntry && (
          <Overlay onClick={closeModal} role="dialog" aria-modal="true">
            <ModalCard onClick={e => e.stopPropagation()}>
              <ModalClose onClick={closeModal} aria-label="Close">×</ModalClose>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: T.text }}>
                  {modalEntry.pair || 'Trade Details'}
                </div>
                {modalEntry.direction && (
                  <Badge $variant={(modalEntry.direction || '').toLowerCase() === 'long' ? 'long' : 'short'}>
                    {modalEntry.direction}
                  </Badge>
                )}
                {modalEntry.outcome && (
                  <Badge $variant={
                    (modalEntry.outcome || '').toLowerCase() === 'win' ? 'win'
                    : (modalEntry.outcome || '').toLowerCase() === 'loss' ? 'loss' : 'be'
                  }>
                    {modalEntry.outcome}
                  </Badge>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: T.dim, marginBottom: '0.5rem' }}>
                {modalEntry.date ? fmtDate(modalEntry.date) : ''} {modalEntry.killzone ? `· ${modalEntry.killzone}` : ''}
                {modalEntry.model ? ` · ${modalEntry.model}` : ''}
              </div>

              <DetailGrid>
                {[
                  { label: 'P&L', val: fmtPnl(modalEntry.pnl), color: (parseFloat(strip(modalEntry.pnl)) || 0) >= 0 ? T.green : T.red },
                  { label: 'Gain', val: modalEntry.gain ? fmtPct(modalEntry.gain) : '—' },
                  { label: 'Risk', val: modalEntry.risk ? `$${strip(modalEntry.risk)}` : '—' },
                  { label: 'R:R', val: modalEntry.rrr || '—' },
                  { label: 'Entry TF', val: modalEntry.entryTf || '—' },
                  { label: 'Entry Window', val: modalEntry.entryWindow || '—' },
                  { label: 'Day', val: modalEntry.day || '—' },
                  { label: 'Time in Trade', val: modalEntry.timeInTrade || '—' },
                ].map(d => (
                  <DetailItem key={d.label}>
                    <DetailLabel>{d.label}</DetailLabel>
                    <DetailValue $color={d.color}>{d.val}</DetailValue>
                  </DetailItem>
                ))}
                {modalEntry.notes && (
                  <DetailItem $full>
                    <DetailLabel>Notes</DetailLabel>
                    <DetailValue style={{ fontSize: '0.8rem', fontWeight: 400, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {modalEntry.notes}
                    </DetailValue>
                  </DetailItem>
                )}
              </DetailGrid>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <Btn $ghost onClick={() => { handleEdit(modalEntry); closeModal(); }}>✏️ Edit</Btn>
                {deleteConfirm === modalEntry.id ? (
                  <>
                    <Btn $danger onClick={() => handleDelete(modalEntry.id)}>Confirm Delete</Btn>
                    <Btn $ghost onClick={() => setDeleteConfirm(null)}>Cancel</Btn>
                  </>
                ) : (
                  <Btn $danger onClick={() => setDeleteConfirm(modalEntry.id)}>🗑 Delete</Btn>
                )}
              </div>
            </ModalCard>
          </Overlay>
        )}
      </Container>
    </Page>
  );
};

export default TradingJournal;
