import json
import os

logs = 'logs'

with open(os.path.join(logs, 'edge-resolutions.json')) as f:
    er = json.load(f)

resolutions = er.get('resolutions', [])

resolved = [r for r in resolutions if r.get('resolution') is not None]
pending = [r for r in resolutions if r.get('resolution') is None]
print(f"Total: {len(resolutions)}, Resolved: {len(resolved)}, Pending: {len(pending)}")

by_source = {}
by_cat = {}
by_grade = {}
by_side = {}

for r in resolved:
    sources = r.get('sources', [])
    src_str = ','.join(sorted(sources)) if sources else 'none'
    cat = r.get('category', 'unknown')
    grade = r.get('edgeGrade', '?')
    side = r.get('side', '?')
    won = r.get('won', False)
    pnl = r.get('pnlPP', 0)
    better = r.get('betterThanMarket', False)

    for d, k in [(by_source, src_str), (by_cat, cat), (by_grade, grade), (by_side, side)]:
        if k not in d:
            d[k] = {'n': 0, 'w': 0, 'l': 0, 'pnl': 0, 'better': 0}
        d[k]['n'] += 1
        if won:
            d[k]['w'] += 1
        else:
            d[k]['l'] += 1
        d[k]['pnl'] += pnl
        if better:
            d[k]['better'] += 1

def show(title, data):
    print(f"\n{title}")
    for k, d in sorted(data.items(), key=lambda x: -x[1]['n']):
        total = d['w'] + d['l']
        wr = f"{d['w']/total*100:.0f}%" if total > 0 else 'N/A'
        print(f"  {k:30s}: {d['n']:3d} trades, {d['w']}W/{d['l']}L, WR={wr:>4s}, PnL={d['pnl']:>8.1f}pp, better={d['better']}/{d['n']}")

show("BY SOURCE", by_source)
show("BY CATEGORY", by_cat)
show("BY GRADE", by_grade)
show("BY SIDE", by_side)

# Sample winners
print("\n--- SAMPLE WINNERS ---")
winners = [r for r in resolved if r.get('won')]
for w in winners[:5]:
    q = (w.get('question') or '?')[:60]
    print(f"  {q}")
    print(f"    Src={w.get('sources')} Grade={w.get('edgeGrade')} Side={w.get('side')}")
    print(f"    Our={w.get('ourProb')} Mkt={w.get('marketPrice')} Div={w.get('divergence')}")

# Sample losers
print("\n--- SAMPLE LOSERS ---")
losers = [r for r in resolved if not r.get('won')]
for l in losers[:5]:
    q = (l.get('question') or '?')[:60]
    print(f"  {q}")
    print(f"    Src={l.get('sources')} Grade={l.get('edgeGrade')} Side={l.get('side')}")
    print(f"    Our={l.get('ourProb')} Mkt={l.get('marketPrice')} Div={l.get('divergence')}")

# Bookmaker-only edges
print("\n--- BOOKMAKER EDGES ONLY ---")
bm_edges = [r for r in resolved if 'bookmaker' in (r.get('sources') or [])]
bm_wins = sum(1 for r in bm_edges if r.get('won'))
bm_losses = len(bm_edges) - bm_wins
bm_pnl = sum(r.get('pnlPP', 0) for r in bm_edges)
bm_better = sum(1 for r in bm_edges if r.get('betterThanMarket'))
if bm_edges:
    print(f"  Bookmaker-sourced: {len(bm_edges)} trades, {bm_wins}W/{bm_losses}L, WR={bm_wins/len(bm_edges)*100:.0f}%, PnL={bm_pnl:.1f}pp, better={bm_better}/{len(bm_edges)}")

# Kalshi-only edges
kalshi_edges = [r for r in resolved if 'kalshi' in (r.get('sources') or [])]
kw = sum(1 for r in kalshi_edges if r.get('won'))
kl = len(kalshi_edges) - kw
kpnl = sum(r.get('pnlPP', 0) for r in kalshi_edges)
if kalshi_edges:
    print(f"  Kalshi-sourced: {len(kalshi_edges)} trades, {kw}W/{kl}L, WR={kw/len(kalshi_edges)*100:.0f}%, PnL={kpnl:.1f}pp")

# Model-only edges (no external sources)
model_only = [r for r in resolved if not r.get('sources')]
mw = sum(1 for r in model_only if r.get('won'))
ml = len(model_only) - mw
mpnl = sum(r.get('pnlPP', 0) for r in model_only)
if model_only:
    print(f"  Model-only (no ext): {len(model_only)} trades, {mw}W/{ml}L, WR={mw/len(model_only)*100:.0f}%, PnL={mpnl:.1f}pp")

# Trade record by side
print("\n--- TRADE RECORD (actual positions) ---")
with open(os.path.join(logs, 'trade-record.json')) as f:
    tr = json.load(f)

trades = tr.get('trades', [])
res_trades = [t for t in trades if t.get('resolved')]
no_trades = [t for t in res_trades if t.get('side') == 'NO']
yes_trades = [t for t in res_trades if t.get('side') == 'YES']

print(f"  Total resolved: {len(res_trades)}")
print(f"  NO bets: {len(no_trades)} trades, {sum(1 for t in no_trades if t.get('won'))}W/{sum(1 for t in no_trades if not t.get('won'))}L, PnL=${sum(t.get('pnl',0) for t in no_trades):.2f}")
print(f"  YES bets: {len(yes_trades)} trades, {sum(1 for t in yes_trades if t.get('won'))}W/{sum(1 for t in yes_trades if not t.get('won'))}L, PnL=${sum(t.get('pnl',0) for t in yes_trades):.2f}")

# YES bets by category
yes_cats = {}
for t in yes_trades:
    cat = t.get('category', 'unknown')
    if cat not in yes_cats:
        yes_cats[cat] = {'n':0,'w':0,'l':0,'pnl':0}
    yes_cats[cat]['n'] += 1
    if t.get('won'):
        yes_cats[cat]['w'] += 1
    else:
        yes_cats[cat]['l'] += 1
    yes_cats[cat]['pnl'] += t.get('pnl', 0)

print("\n  YES bets by category:")
for cat, d in sorted(yes_cats.items(), key=lambda x: -x[1]['n']):
    wr = f"{d['w']/d['n']*100:.0f}%" if d['n'] > 0 else 'N/A'
    print(f"    {cat}: {d['n']} trades, {d['w']}W/{d['l']}L, WR={wr}, PnL=${d['pnl']:.2f}")

# NO bets by category
no_cats = {}
for t in no_trades:
    cat = t.get('category', 'unknown')
    if cat not in no_cats:
        no_cats[cat] = {'n':0,'w':0,'l':0,'pnl':0}
    no_cats[cat]['n'] += 1
    if t.get('won'):
        no_cats[cat]['w'] += 1
    else:
        no_cats[cat]['l'] += 1
    no_cats[cat]['pnl'] += t.get('pnl', 0)

print("\n  NO bets by category:")
for cat, d in sorted(no_cats.items(), key=lambda x: -x[1]['n']):
    wr = f"{d['w']/d['n']*100:.0f}%" if d['n'] > 0 else 'N/A'
    print(f"    {cat}: {d['n']} trades, {d['w']}W/{d['l']}L, WR={wr}, PnL=${d['pnl']:.2f}")
