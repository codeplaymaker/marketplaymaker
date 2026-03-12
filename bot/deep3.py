import json
from collections import Counter

# 1. Edge Resolutions - NOW RESOLVED ONLY
with open('logs/edge-resolutions.json') as f:
    er = json.load(f)

resolutions = er['resolutions']
resolved = [r for r in resolutions if r.get('resolved') == True]
print(f"=== EDGE RESOLUTIONS: {len(resolved)} resolved of {len(resolutions)} ===\n")

def categorize(q):
    q = (q or '').lower()
    if any(x in q for x in ['nba','nfl','nhl','mlb','soccer','football','basketball',
                              'baseball','hockey','win on','premier','la liga','serie a',
                              'bundesliga','ufc','boxing','tennis','f1','mma','cricket','rugby']):
        return 'sports'
    elif any(x in q for x in ['bitcoin','btc','eth','crypto','solana','xrp','price of']):
        return 'crypto'
    elif any(x in q for x in ['trump','biden','election','congress','senate','president',
                               'governor','republican','democrat','political','vote','tariff']):
        return 'politics'
    return 'other'

# For resolved: did our prediction (ourProb) beat the market (marketPrice)?
correct = 0
wrong = 0
total_edge_correct = 0
total_edge_wrong = 0

by_cat = {}
by_grade = {}
by_src_count = {}
by_div_bucket = {}

for r in resolved:
    outcome = r.get('outcome')
    our = r.get('ourProb', 0)
    mkt = r.get('marketPrice', 0)
    cat = categorize(r.get('question'))
    grade = r.get('edgeGrade', '?')
    sc = r.get('sourceCount', 0)
    div = abs(r.get('divergence', 0))

    # Was our probability estimate closer to the outcome than market?
    our_error = abs(our - outcome) if outcome is not None else None
    mkt_error = abs(mkt - outcome) if outcome is not None else None
    we_were_better = (our_error < mkt_error) if our_error is not None and mkt_error is not None else None

    if we_were_better:
        correct += 1
    elif we_were_better is False:
        wrong += 1

    # Bucketize
    div_bucket = '>20%' if div > 0.20 else '10-20%' if div > 0.10 else '5-10%'

    for d, k in [(by_cat, cat), (by_grade, grade), (by_src_count, str(sc)), (by_div_bucket, div_bucket)]:
        if k not in d:
            d[k] = {'n': 0, 'better': 0, 'worse': 0, 'our_err': 0, 'mkt_err': 0}
        d[k]['n'] += 1
        if we_were_better:
            d[k]['better'] += 1
        elif we_were_better is False:
            d[k]['worse'] += 1
        if our_error is not None:
            d[k]['our_err'] += our_error
        if mkt_error is not None:
            d[k]['mkt_err'] += mkt_error

print(f"Our prob better than market: {correct}/{correct+wrong} ({correct/(correct+wrong)*100:.1f}%)")
print(f"Our avg error vs Market avg error:")

def show(title, data):
    print(f"\n{title}")
    for k, d in sorted(data.items(), key=lambda x: -x[1]['n']):
        bt = f"{d['better']}/{d['n']}"
        our_avg = d['our_err']/d['n'] if d['n'] > 0 else 0
        mkt_avg = d['mkt_err']/d['n'] if d['n'] > 0 else 0
        delta = our_avg - mkt_avg  # negative = we're better
        print(f"  {k:12s}: {d['n']:3d} resolved, better={bt:>7s}, our_err={our_avg:.3f}, mkt_err={mkt_avg:.3f}, delta={delta:+.3f}")

show("BY CATEGORY", by_cat)
show("BY GRADE", by_grade)
show("BY SOURCE COUNT", by_src_count)
show("BY DIVERGENCE", by_div_bucket)

# 2. Trade record - the ACTUAL money
print(f"\n\n=== TRADE RECORD (ACTUAL POSITIONS) ===")
with open('logs/trade-record.json') as f:
    tr = json.load(f)

trades = tr.get('trades', [])
res_trades = [t for t in trades if t.get('resolved')]
print(f"{len(res_trades)} resolved of {len(trades)} total\n")

# By side AND category
combos = {}
for t in res_trades:
    side = t.get('side', '?')
    cat = categorize(t.get('question'))
    key = f"{side}/{cat}"
    if key not in combos:
        combos[key] = {'n':0,'w':0,'l':0,'pnl':0,'avg_entry':0}
    combos[key]['n'] += 1
    if t.get('won'):
        combos[key]['w'] += 1
    else:
        combos[key]['l'] += 1
    combos[key]['pnl'] += t.get('pnl', 0)
    combos[key]['avg_entry'] += t.get('entryPrice', 0)

print("Side/Category breakdown:")
for k, d in sorted(combos.items(), key=lambda x: -x[1]['n']):
    wr = f"{d['w']/d['n']*100:.0f}%" if d['n'] > 0 else 'N/A'
    avg_e = d['avg_entry']/d['n'] if d['n'] > 0 else 0
    avg_pnl = d['pnl']/d['n'] if d['n'] > 0 else 0
    print(f"  {k:20s}: {d['n']:3d} trades, {d['w']}W/{d['l']}L, WR={wr:>4s}, PnL=${d['pnl']:>8.2f}, Avg=${avg_pnl:>6.2f}, AvgEntry={avg_e:.3f}")

# NO bets: what prices are we buying at?
print("\nNO BET ENTRY PRICES:")
no_trades = [t for t in res_trades if t.get('side') == 'NO']
no_prices = [t.get('entryPrice', 0) for t in no_trades]
no_wins = [t for t in no_trades if t.get('won')]
no_losses = [t for t in no_trades if not t.get('won')]
print(f"  Avg NO entry: {sum(no_prices)/len(no_prices):.3f}")
print(f"  Winner avg entry: {sum(t.get('entryPrice',0) for t in no_wins)/len(no_wins):.3f}" if no_wins else "  No winners")
print(f"  Loser avg entry: {sum(t.get('entryPrice',0) for t in no_losses)/len(no_losses):.3f}" if no_losses else "  No losers")

# YES bets: breakdown
print("\nYES BET DETAILS:")
yes_trades = [t for t in res_trades if t.get('side') == 'YES']
yes_prices = [t.get('entryPrice', 0) for t in yes_trades]
yes_wins = [t for t in yes_trades if t.get('won')]
yes_losses = [t for t in yes_trades if not t.get('won')]
print(f"  Avg YES entry: {sum(yes_prices)/len(yes_prices):.3f}")
print(f"  Winner avg entry: {sum(t.get('entryPrice',0) for t in yes_wins)/len(yes_wins):.3f}" if yes_wins else "  No winners")
print(f"  Loser avg entry: {sum(t.get('entryPrice',0) for t in yes_losses)/len(yes_losses):.3f}" if yes_losses else "  No losers")

# Top winning trades
print("\nTOP 5 WINNING TRADES:")
winners = sorted(res_trades, key=lambda t: t.get('pnl',0), reverse=True)[:5]
for t in winners:
    print(f"  ${t.get('pnl',0):>8.2f} | {t.get('side')} | {(t.get('question') or '?')[:50]}")

# Top losing trades
print("\nTOP 5 LOSING TRADES:")
losers = sorted(res_trades, key=lambda t: t.get('pnl',0))[:5]
for t in losers:
    print(f"  ${t.get('pnl',0):>8.2f} | {t.get('side')} | {(t.get('question') or '?')[:50]}")

# 3. Picks/Accumulators
print("\n\n=== ACCUMULATOR DATA ===")
with open('logs/picks-history.json') as f:
    ph = json.load(f)

picks = ph if isinstance(ph, list) else ph.get('picks', ph.get('history', []))
resolved_picks = [p for p in picks if p.get('result') and p.get('result') != 'pending']
pending_picks = [p for p in picks if not p.get('result') or p.get('result') == 'pending']
print(f"Total: {len(picks)}, Resolved: {len(resolved_picks)}, Pending: {len(pending_picks)}")
if resolved_picks:
    won = sum(1 for p in resolved_picks if p.get('result') == 'won')
    lost = sum(1 for p in resolved_picks if p.get('result') == 'lost')
    pnl = sum(p.get('pnl', 0) for p in resolved_picks)
    print(f"Results: {won}W/{lost}L, PnL=${pnl:.2f}")
else:
    print("No resolved accumulators yet")

# Leg-level analysis
total_legs = 0
won_legs = 0
for p in picks:
    wl = p.get('wonLegs', 0)
    rl = p.get('resolvedLegs', 0)
    total_legs += rl
    won_legs += wl

if total_legs > 0:
    print(f"Leg-level: {won_legs}/{total_legs} legs won ({won_legs/total_legs*100:.1f}%)")
