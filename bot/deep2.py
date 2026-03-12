import json
from collections import Counter

with open('logs/edge-resolutions.json') as f:
    er = json.load(f)

resolutions = er['resolutions']
resolved = [r for r in resolutions if r.get('resolved') == True]
pending = [r for r in resolutions if r.get('resolved') == False]

print(f"Total: {len(resolutions)}")
print(f"Resolved: {len(resolved)}")
print(f"Pending: {len(pending)}")

# Grades
grades = Counter(r.get('edgeGrade') for r in resolutions)
print(f"\nGrades (all): {dict(grades)}")

# Source counts
sources = Counter(r.get('sourceCount') for r in resolutions)
print(f"Source counts (all): {dict(sources)}")

# Categories by question text
def categorize(q):
    q = (q or '').lower()
    sport_kw = ['nba','nfl','nhl','mlb','soccer','football','basketball','baseball',
                'hockey','win on','premier','la liga','serie a','bundesliga','ufc',
                'boxing','tennis','f1','mma','cricket','rugby']
    crypto_kw = ['bitcoin','btc','eth','crypto','solana','xrp','price','token']
    politics_kw = ['trump','biden','election','congress','senate','president',
                   'governor','republican','democrat','political','vote','tariff']
    if any(x in q for x in sport_kw):
        return 'sports'
    elif any(x in q for x in crypto_kw):
        return 'crypto'
    elif any(x in q for x in politics_kw):
        return 'politics'
    else:
        return 'other'

cats = Counter(categorize(r.get('question')) for r in resolutions)
print(f"Categories (all): {dict(cats)}")

# Side distribution
sides = Counter(r.get('side') for r in resolutions)
print(f"Sides: {dict(sides)}")

# Divergence distribution
divs = [abs(r.get('divergence', 0)) for r in resolutions]
print(f"\nDivergence stats:")
print(f"  Min: {min(divs):.3f}, Max: {max(divs):.3f}, Avg: {sum(divs)/len(divs):.3f}")
print(f"  >10%: {sum(1 for d in divs if d > 0.10)}")
print(f"  5-10%: {sum(1 for d in divs if 0.05 <= d <= 0.10)}")
print(f"  3-5%: {sum(1 for d in divs if 0.03 <= d < 0.05)}")
print(f"  <3%: {sum(1 for d in divs if d < 0.03)}")

# Show a sample of edge entries with sources field
print("\n--- SAMPLES ---")
for r in resolutions[:5]:
    print(f"  Q: {(r.get('question') or '?')[:55]}")
    print(f"    Grade={r.get('edgeGrade')}, Sources={r.get('sourceCount')}, Side={r.get('side')}")
    print(f"    Our={r.get('ourProb'):.3f}, Mkt={r.get('marketPrice'):.3f}, Div={r.get('divergence'):.3f}")
    print(f"    Resolved={r.get('resolved')}, Outcome={r.get('outcome')}")

# Now analyze trade-record.json more deeply
print("\n\n========== TRADE RECORD DEEP DIVE ==========")
with open('logs/trade-record.json') as f:
    tr = json.load(f)

trades = tr.get('trades', [])
res_trades = [t for t in trades if t.get('resolved')]

# Check what keys exist
if res_trades:
    print(f"Trade keys: {list(res_trades[0].keys())}")
    print(f"\nSample trade: {json.dumps(res_trades[0], default=str)[:500]}")

# By grade
by_grade = {}
for t in res_trades:
    g = t.get('grade', '?')
    if g not in by_grade:
        by_grade[g] = {'n':0,'w':0,'l':0,'pnl':0}
    by_grade[g]['n'] += 1
    if t.get('won'):
        by_grade[g]['w'] += 1
    else:
        by_grade[g]['l'] += 1
    by_grade[g]['pnl'] += t.get('pnl', 0)

print("\nBy Grade:")
for g, d in sorted(by_grade.items()):
    wr = f"{d['w']/d['n']*100:.0f}%" if d['n'] > 0 else 'N/A'
    print(f"  {g}: {d['n']} trades, {d['w']}W/{d['l']}L, WR={wr}, PnL=${d['pnl']:.2f}")

# By confidence
by_conf = {}
for t in res_trades:
    c = t.get('confidence', '?')
    if c not in by_conf:
        by_conf[c] = {'n':0,'w':0,'l':0,'pnl':0}
    by_conf[c]['n'] += 1
    if t.get('won'):
        by_conf[c]['w'] += 1
    else:
        by_conf[c]['l'] += 1
    by_conf[c]['pnl'] += t.get('pnl', 0)

print("\nBy Confidence:")
for c, d in sorted(by_conf.items()):
    wr = f"{d['w']/d['n']*100:.0f}%" if d['n'] > 0 else 'N/A'
    print(f"  {c}: {d['n']} trades, {d['w']}W/{d['l']}L, WR={wr}, PnL=${d['pnl']:.2f}")

# Check if strategy field exists
strats = Counter(t.get('strategy') for t in trades)
print(f"\nStrategies in trade-record: {dict(strats)}")

# By source/type
types = Counter(t.get('type') for t in trades)
print(f"Types: {dict(types)}")

# By edgeSource
esources = Counter(t.get('edgeSource') for t in trades)
print(f"Edge sources: {dict(esources)}")

# Check picks-history for acca data
print("\n\n========== PICKS / ACCA DATA ==========")
with open('logs/picks-history.json') as f:
    ph = json.load(f)

picks = ph.get('picks', ph.get('history', []))
if isinstance(ph, list):
    picks = ph
print(f"Total picks entries: {len(picks)}")
if picks and isinstance(picks[0], dict):
    print(f"Pick keys: {list(picks[0].keys())}")
    resolved_picks = [p for p in picks if p.get('resolved') or p.get('outcome') is not None]
    print(f"Resolved picks: {len(resolved_picks)}")
