import json, os

logs = 'logs'

# 1. Paper trades by strategy
print("=" * 70)
print("PAPER TRADES BY STRATEGY")
print("=" * 70)
with open(os.path.join(logs, 'paper-trades.json')) as f:
    pt = json.load(f)

strats = {}
for t in pt.get('trades', []):
    s = t.get('strategy', 'UNKNOWN')
    if s not in strats:
        strats[s] = {'total': 0, 'resolved': 0, 'wins': 0, 'losses': 0, 'pnl': 0, 'open': 0, 'amounts': []}
    strats[s]['total'] += 1
    if t.get('resolution') is not None:
        strats[s]['resolved'] += 1
        if t.get('won'):
            strats[s]['wins'] += 1
        else:
            strats[s]['losses'] += 1
        strats[s]['pnl'] += t.get('pnl', 0)
        strats[s]['amounts'].append(t.get('pnl', 0))
    else:
        strats[s]['open'] += 1

for s, d in sorted(strats.items()):
    wr = f"{d['wins']/d['resolved']*100:.0f}%" if d['resolved'] > 0 else 'N/A'
    avg = f"${d['pnl']/d['resolved']:.2f}" if d['resolved'] > 0 else 'N/A'
    print(f"  {s}: {d['total']} total, {d['resolved']} resolved ({d['wins']}W/{d['losses']}L, WR={wr}), PnL=${d['pnl']:.2f}, Avg={avg}, Open={d['open']}")

# 2. Trade record by strategy
print()
print("=" * 70)
print("TRADE RECORD BY STRATEGY")
print("=" * 70)
with open(os.path.join(logs, 'trade-record.json')) as f:
    tr = json.load(f)

strats2 = {}
for t in tr.get('trades', []):
    s = t.get('strategy', 'UNKNOWN')
    if s not in strats2:
        strats2[s] = {'total': 0, 'resolved': 0, 'wins': 0, 'losses': 0, 'pnl': 0, 'open': 0, 'sides': {}}
    strats2[s]['total'] += 1
    side = t.get('side', '?')
    if side not in strats2[s]['sides']:
        strats2[s]['sides'][side] = {'w': 0, 'l': 0, 'pnl': 0, 'n': 0}
    strats2[s]['sides'][side]['n'] += 1
    if t.get('resolved'):
        strats2[s]['resolved'] += 1
        if t.get('won'):
            strats2[s]['wins'] += 1
            strats2[s]['sides'][side]['w'] += 1
        else:
            strats2[s]['losses'] += 1
            strats2[s]['sides'][side]['l'] += 1
        strats2[s]['pnl'] += t.get('pnl', 0)
        strats2[s]['sides'][side]['pnl'] += t.get('pnl', 0)
    else:
        strats2[s]['open'] += 1

for s, d in sorted(strats2.items()):
    wr = f"{d['wins']/d['resolved']*100:.0f}%" if d['resolved'] > 0 else 'N/A'
    avg = f"${d['pnl']/d['resolved']:.2f}" if d['resolved'] > 0 else 'N/A'
    print(f"  {s}: {d['total']} total, {d['resolved']} resolved ({d['wins']}W/{d['losses']}L, WR={wr}), PnL=${d['pnl']:.2f}, Avg={avg}, Open={d['open']}")
    for side, sd in d['sides'].items():
        if sd['w'] + sd['l'] > 0:
            swr = f"{sd['w']/(sd['w']+sd['l'])*100:.0f}%"
            print(f"    -> {side}: {sd['n']} trades, {sd['w']}W/{sd['l']}L, WR={swr}, PnL=${sd['pnl']:.2f}")

# 3. Edge resolutions by category and source type
print()
print("=" * 70)
print("EDGE RESOLUTIONS DETAILS")
print("=" * 70)
with open(os.path.join(logs, 'edge-resolutions.json')) as f:
    er = json.load(f)

# By source
sources = {}
for e in er.get('edges', []):
    src_list = e.get('sources', [])
    src_key = ','.join(sorted(src_list)) if src_list else 'unknown'
    if src_key not in sources:
        sources[src_key] = {'n': 0, 'w': 0, 'l': 0, 'pnl': 0, 'better': 0}
    sources[src_key]['n'] += 1
    if e.get('won'):
        sources[src_key]['w'] += 1
    elif e.get('won') == False:
        sources[src_key]['l'] += 1
    sources[src_key]['pnl'] += e.get('pnlPP', 0)
    if e.get('betterThanMarket'):
        sources[src_key]['better'] += 1

print("  By Source:")
for src, d in sorted(sources.items(), key=lambda x: -x[1]['n']):
    wr = f"{d['w']/(d['w']+d['l'])*100:.0f}%" if (d['w']+d['l']) > 0 else 'N/A'
    print(f"    {src}: {d['n']} trades, {d['w']}W/{d['l']}L, WR={wr}, PnL={d['pnl']:.1f}pp, Better={d['better']}/{d['n']}")

# By initial edge size
print()
print("  By Predicted Edge Size:")
buckets = {'<3%': {'n':0,'w':0,'l':0,'pnl':0}, '3-5%': {'n':0,'w':0,'l':0,'pnl':0}, '5-10%': {'n':0,'w':0,'l':0,'pnl':0}, '>10%': {'n':0,'w':0,'l':0,'pnl':0}}
for e in er.get('edges', []):
    edge = abs(e.get('predictedEdge', 0))
    if edge < 0.03:
        b = '<3%'
    elif edge < 0.05:
        b = '3-5%'
    elif edge < 0.10:
        b = '5-10%'
    else:
        b = '>10%'
    buckets[b]['n'] += 1
    if e.get('won'):
        buckets[b]['w'] += 1
    elif e.get('won') == False:
        buckets[b]['l'] += 1
    buckets[b]['pnl'] += e.get('pnlPP', 0)

for b, d in buckets.items():
    wr = f"{d['w']/(d['w']+d['l'])*100:.0f}%" if (d['w']+d['l']) > 0 else 'N/A'
    print(f"    {b}: {d['n']} trades, {d['w']}W/{d['l']}L, WR={wr}, PnL={d['pnl']:.1f}pp")

# 4. CLV tracker stats
print()
print("=" * 70)
print("CLV TRACKER")
print("=" * 70)
with open(os.path.join(logs, 'clv-tracker.json')) as f:
    clv = json.load(f)
stats = clv.get('stats', {})
print(f"  Tracked: {stats.get('tracked',0)}, Confirmed: {stats.get('confirmed',0)}, Denied: {stats.get('denied',0)}, Pending: {stats.get('pending',0)}")
confirmed = stats.get('confirmed', 0)
denied = stats.get('denied', 0)
if confirmed + denied > 0:
    print(f"  CLV Confirmation Rate: {confirmed/(confirmed+denied)*100:.1f}%")

# Check CLV by source
clv_by_src = {}
for s in clv.get('signals', []):
    src = s.get('source', 'unknown')
    if src not in clv_by_src:
        clv_by_src[src] = {'confirmed': 0, 'denied': 0, 'pending': 0}
    if s.get('confirmed') is True:
        clv_by_src[src]['confirmed'] += 1
    elif s.get('confirmed') is False:
        clv_by_src[src]['denied'] += 1
    else:
        clv_by_src[src]['pending'] += 1

print("  CLV by Source:")
for src, d in clv_by_src.items():
    total = d['confirmed'] + d['denied']
    rate = f"{d['confirmed']/total*100:.0f}%" if total > 0 else 'N/A'
    print(f"    {src}: {d['confirmed']} confirmed, {d['denied']} denied, {d['pending']} pending (rate={rate})")

# 5. Learning state optimal thresholds
print()
print("=" * 70)
print("LEARNED STRATEGY THRESHOLDS")
print("=" * 70)
with open(os.path.join(logs, 'learning-state.json')) as f:
    ls = json.load(f)

for s, d in ls.get('strategyPerformance', {}).items():
    wr = f"{d['wins']/(d['wins']+d['losses'])*100:.0f}%" if d['wins'] + d['losses'] > 0 else 'N/A'
    avg = f"${d['totalPnL']/d['totalTrades']:.2f}" if d['totalTrades'] > 0 else 'N/A'
    print(f"  {s}: {d['totalTrades']} trades, {d['wins']}W/{d['losses']}L, WR={wr}, PnL=${d['totalPnL']:.2f}, Avg={avg}")
    # Score bucket analysis
    for bucket, bd in d.get('winsByScoreBucket', {}).items():
        bwr = f"{bd['wins']/bd['total']*100:.0f}%" if bd['total'] > 0 else 'N/A'
        bavg = f"${bd['pnl']/bd['total']:.2f}" if bd['total'] > 0 else 'N/A'
        print(f"    Score {bucket}: {bd['total']} trades, WR={bwr}, PnL=${bd['pnl']:.2f}, Avg={bavg}")

# 6. Accumulator picks
print()
print("=" * 70)
print("ACCUMULATOR / PARLAY PERFORMANCE")
print("=" * 70)
with open(os.path.join(logs, 'picks-learning.json')) as f:
    pl = json.load(f)

acca = pl.get('accaPerformance', {})
print(f"  Resolved: {acca.get('resolved',0)}, WR={acca.get('winRate','N/A')}")
print(f"  Avg ROI: {acca.get('avgROI','N/A')}")
for g, d in acca.get('byGrade', {}).items():
    print(f"    Grade {g}: {d.get('total',0)} trades, WR={d.get('winRate','N/A')}, ROI={d.get('avgROI','N/A')}")

# By sport/category
print("  By Sport:")
for sp, d in acca.get('bySport', {}).items():
    print(f"    {sp}: {d}")
