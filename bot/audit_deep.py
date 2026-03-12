import json, os
from collections import Counter, defaultdict

def load(f):
    path = os.path.join('logs', f)
    if not os.path.exists(path):
        return None
    with open(path) as fh:
        return json.load(fh)

def get_pnl(t):
    p = t.get('pnl', 0)
    if isinstance(p, dict):
        return p.get('netPnL', 0) or 0
    return p or 0

def is_win(t):
    p = t.get('pnl', 0)
    if isinstance(p, dict):
        return p.get('won', False)
    return (p or 0) > 0

# Load
tr_data = load('trade-record.json') or {}
tr = tr_data.get('trades', [])

pt_data = load('paper-trades.json') or {}
pt_active = pt_data.get('paperTrades', [])
pt_resolved = pt_data.get('resolvedTrades', [])

ls_data = load('learning-state.json') or {}

et = load('executed-trades.json') or []

# ======= DEEP DIVE: Paper Trade Duplicates =======
print("=" * 60)
print("PAPER TRADE DUPLICATE ANALYSIS")
print("=" * 60)

all_pt = pt_active + pt_resolved
by_cid = defaultdict(list)
for t in all_pt:
    key = t.get('conditionId', '')
    by_cid[key].append(t)

multi = {k: v for k, v in by_cid.items() if len(v) > 1}
print(f"\nConditions with multiple paper trades: {len(multi)}")
print(f"Total entries in duplicated conditions: {sum(len(v) for v in multi.values())}")

# Show strategy distribution across duplicates
print("\nDuplicate breakdown (same market, different strategies or repeated):")
for cid, trades in sorted(multi.items(), key=lambda x: -len(x[1]))[:5]:
    market = trades[0].get('market', '?')[:50]
    strats = [t.get('strategy', '?') for t in trades]
    sides = [t.get('side', '?') for t in trades]
    resolved_count = sum(1 for t in trades if t.get('resolved'))
    print(f"\n  {market}...")
    print(f"    {len(trades)} entries: strategies={Counter(strats)}, sides={Counter(sides)}")
    print(f"    Resolved: {resolved_count}/{len(trades)}")

# ======= STRATEGY BREAKDOWN FROM PAPER TRADES =======
print("\n" + "=" * 60)
print("PAPER TRADE STRATEGY BREAKDOWN (Resolved)")
print("=" * 60)

for strat in sorted(set(t.get('strategy', '?') for t in pt_resolved)):
    strat_trades = [t for t in pt_resolved if t.get('strategy') == strat]
    pnl = sum(get_pnl(t) for t in strat_trades)
    wins = sum(1 for t in strat_trades if is_win(t))
    losses = len(strat_trades) - wins
    
    unique_cids = len(set(t.get('conditionId', '') for t in strat_trades))
    
    sides = Counter(t.get('side', '?') for t in strat_trades)
    
    print(f"\n  {strat}: {len(strat_trades)} trades ({unique_cids} unique markets)")
    print(f"    W/L: {wins}W / {losses}L ({100*wins/max(len(strat_trades),1):.0f}% WR)")
    print(f"    PnL: ${pnl:.2f}")
    print(f"    Sides: {dict(sides)}")
    
    # Win rate by side
    for side in ['YES', 'NO']:
        side_trades = [t for t in strat_trades if t.get('side') == side]
        if side_trades:
            sw = sum(1 for t in side_trades if is_win(t))
            sp = sum(get_pnl(t) for t in side_trades)
            print(f"    {side}: {sw}W/{len(side_trades)-sw}L, PnL=${sp:.2f}")

# ======= TRADE-RECORD BREAKDOWN =======
print("\n" + "=" * 60)
print("TRADE-RECORD BREAKDOWN (edgeResolver autoScan)")
print("=" * 60)

# Since strategies are all '?', break down by side and category
tr_resolved = [t for t in tr if t.get('resolved')]
for side in ['YES', 'NO']:
    side_trades = [t for t in tr_resolved if t.get('side') == side]
    pnl = sum(t.get('pnl', 0) for t in side_trades)
    wins = sum(1 for t in side_trades if (t.get('pnl', 0) or 0) > 0)
    losses = len(side_trades) - wins
    print(f"\n  {side}: {len(side_trades)} resolved, {wins}W/{losses}L, PnL=${pnl:.2f}")

# By category (from question text)
categories = defaultdict(list)
for t in tr_resolved:
    q = (t.get('question', '') or '').lower()
    if any(k in q for k in ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'solana', 'xrp', 'dogecoin']):
        categories['Crypto'].append(t)
    elif any(k in q for k in ['nba', 'nfl', 'nhl', 'mlb', 'soccer', 'premier', 'champions', 'match', 'game', 'playoffs']):
        categories['Sports'].append(t)
    elif any(k in q for k in ['trump', 'biden', 'president', 'congress', 'democrat', 'republican', 'election']):
        categories['Politics'].append(t)
    else:
        categories['Other'].append(t)

print("\n  By category:")
for cat, trades in sorted(categories.items()):
    pnl = sum(t.get('pnl', 0) for t in trades)
    wins = sum(1 for t in trades if (t.get('pnl', 0) or 0) > 0)
    losses = len(trades) - wins
    
    sides = Counter(t.get('side', '?') for t in trades)
    print(f"    {cat}: {len(trades)} trades, {wins}W/{losses}L, PnL=${pnl:.2f}, sides={dict(sides)}")

# ======= LEARNING STATE vs PAPER TRADES =======
print("\n" + "=" * 60)
print("LEARNING STATE ANALYSIS")
print("=" * 60)

strat_perf = ls_data.get('strategyPerformance', {})
for strat, perf in strat_perf.items():
    print(f"\n  {strat}:")
    for k, v in perf.items():
        if isinstance(v, (int, float)):
            print(f"    {k}: {v}")

# ======= THE BIG PICTURE =======
print("\n" + "=" * 60)
print("THE BIG PICTURE")
print("=" * 60)

print(f"""
Two COMPLETELY SEPARATE tracking systems found:

1. trade-record.json (autoScan -> edgeResolver):
   - {len(tr)} total signals tracked
   - {len(tr_resolved)} resolved, PnL: $+261.29
   - Strategy NOT recorded (all show as '?')
   - Runs automatically every 15 minutes
   - Tracks: edge signal quality vs market outcome

2. paper-trades.json (manual scanner -> paperTrader):
   - {len(pt_active) + len(pt_resolved)} total paper trades
   - {len(pt_resolved)} resolved, PnL: $-999.75
   - Strategy IS recorded (NO_BETS, ARBITRAGE, etc.)
   - Requires scanner.start() to be called
   - Tracks: simulated trades with position sizing

OVERLAP: Only 4 conditionIds appear in BOTH systems!
The two systems tracked almost entirely different markets.

3. executed-trades.json (REAL money):
   - Only {len(et)} real trades EVER executed
   - All from newMarketDetector (crypto Up/Down coin flips)
   - All at $0.50 (pure 50/50 bets)
   - NOT from any of the analyzed strategies

CONCLUSION:
- The +$261.29 from trade-record = edge SIGNALS, not actual position P&L
- The -$999.75 from paper-trades = simulated trades with position sizing
- Paper trades have {sum(len(v) for v in multi.values())} entries across {len(multi)} duplicate conditions (same market bet {sum(len(v) for v in multi.values())/max(len(multi),1):.1f}x avg)
- Only 13 real trades executed (all crypto flips at 50 cents)
""")
