import json, os
from collections import Counter

def load(f):
    path = os.path.join('logs', f)
    if not os.path.exists(path): return None
    with open(path) as fh: return json.load(fh)

# 1. trade-record.json (edgeResolver output)
tr = load('trade-record.json') or []
print("=== trade-record.json ===")
print(f"  Total entries: {len(tr)}")
sides = Counter(t.get('side') for t in tr)
print(f"  Sides: {dict(sides)}")
resolved = [t for t in tr if t.get('resolved')]
unresolved = [t for t in tr if not t.get('resolved')]
print(f"  Resolved: {len(resolved)}, Unresolved: {len(unresolved)}")
strategies = Counter(t.get('strategy','?') for t in tr)
print(f"  Strategies: {dict(strategies)}")
pnl = sum(t.get('pnl',0) for t in resolved)
print(f"  Total PnL (resolved): ${pnl:.2f}")
dates = [t.get('timestamp','') for t in tr if t.get('timestamp')]
if dates:
    print(f"  Date range: {min(dates)[:10]} to {max(dates)[:10]}")

# 2. edge-resolutions.json
er = load('edge-resolutions.json') or []
print(f"\n=== edge-resolutions.json ===")
print(f"  Total entries: {len(er)}")
res_status = Counter(str(e.get('resolved','unresolved')) for e in er)
print(f"  Resolved status: {dict(res_status)}")
er_cids = set(e.get('conditionId','') for e in er)
tr_cids = set(t.get('conditionId','') for t in tr)
print(f"  Unique conditionIds in edge-res: {len(er_cids)}")
print(f"  Unique conditionIds in trade-rec: {len(tr_cids)}")
overlap = er_cids & tr_cids
print(f"  Overlap (in both): {len(overlap)}")
only_er = er_cids - tr_cids
only_tr = tr_cids - er_cids
print(f"  Only in edge-res: {len(only_er)}")
print(f"  Only in trade-rec: {len(only_tr)}")

# 3. paper-trades.json
pt = load('paper-trades.json')
print(f"\n=== paper-trades.json ===")
if pt:
    trades_list = pt.get('trades', [])
    print(f"  Total paper trades: {len(trades_list)}")
    print(f"  Bankroll: {pt.get('bankroll')}")
    print(f"  Total PnL: {pt.get('totalPnL')}")
else:
    print("  File not found or empty")

# 4. learning-state.json
ls = load('learning-state.json')
print(f"\n=== learning-state.json ===")
ls_cids = set()
resolved_trades = []
if ls:
    resolved_trades = ls.get('resolvedTrades', [])
    print(f"  Resolved trades: {len(resolved_trades)}")
    strat_counts = Counter(t.get('strategy','?') for t in resolved_trades)
    print(f"  Strategies: {dict(strat_counts)}")
    ls_cids = set(t.get('conditionId','') for t in resolved_trades)
    print(f"  Unique conditionIds: {len(ls_cids)}")
    ls_overlap_tr = ls_cids & tr_cids
    ls_overlap_er = ls_cids & er_cids
    print(f"  Overlap with trade-record: {len(ls_overlap_tr)}")
    print(f"  Overlap with edge-resolutions: {len(ls_overlap_er)}")
    only_ls = ls_cids - tr_cids - er_cids
    print(f"  Only in learning-state: {len(only_ls)}")
else:
    print("  File not found or empty")

# 5. executed-trades.json
et = load('executed-trades.json') or []
et_cids = set()
print(f"\n=== executed-trades.json ===")
print(f"  Total entries: {len(et)}")
if et:
    et_cids = set(t.get('conditionId','') for t in et)
    print(f"  Unique conditionIds: {len(et_cids)}")
    et_overlap_tr = et_cids & tr_cids
    print(f"  Overlap with trade-record: {len(et_overlap_tr)}")

# 6. execution-pipeline-state.json
eps = load('execution-pipeline-state.json')
eps_cids = set()
print(f"\n=== execution-pipeline-state.json ===")
if eps:
    history = eps.get('history', [])
    print(f"  History entries: {len(history)}")
    statuses = Counter(h.get('status') for h in history)
    print(f"  Statuses: {dict(statuses)}")
    eps_cids = set(h.get('conditionId','') for h in history)
    eps_overlap_tr = eps_cids & tr_cids
    print(f"  Overlap with trade-record: {len(eps_overlap_tr)}")
else:
    print("  File not found or empty")

# 7. picks-history.json
ph = load('picks-history.json') or []
print(f"\n=== picks-history.json ===")
print(f"  Total entries: {len(ph)}")
if ph:
    ph_cids = set(p.get('conditionId','') for p in ph)
    ph_overlap_tr = ph_cids & tr_cids
    print(f"  Unique conditionIds: {len(ph_cids)}")
    print(f"  Overlap with trade-record: {len(ph_overlap_tr)}")

# 8. Cross-system summary
print(f"\n{'='*50}")
print("=== CROSS-SYSTEM AUDIT SUMMARY ===")
print(f"{'='*50}")
all_cids = set()
all_cids.update(er_cids)
all_cids.update(tr_cids)
all_cids.update(ls_cids)
all_cids.update(et_cids)
all_cids.update(eps_cids)
print(f"  Total unique conditionIds across ALL systems: {len(all_cids)}")
print(f"  trade-record.json: {len(tr_cids)} unique conditions, {len(tr)} entries")
print(f"  edge-resolutions.json: {len(er_cids)} unique conditions, {len(er)} entries")
if ls:
    print(f"  learning-state.json: {len(ls_cids)} unique conditions, {len(resolved_trades)} entries")
if et:
    print(f"  executed-trades.json: {len(et_cids)} unique conditions, {len(et)} entries")
if eps:
    print(f"  execution-pipeline: {len(eps_cids)} unique conditions")

# Check for trades in learning-state NOT in trade-record (MISSED)
if ls:
    missed = ls_cids - tr_cids
    if missed:
        print(f"\n  WARNING: {len(missed)} conditions in learning-state but NOT in trade-record!")
        missed_trades = [t for t in resolved_trades if t.get('conditionId') in missed]
        missed_pnl = sum(t.get('pnl',0) for t in missed_trades if t.get('pnl'))
        missed_wins = sum(1 for t in missed_trades if (t.get('pnl',0) or 0) > 0)
        missed_losses = sum(1 for t in missed_trades if (t.get('pnl',0) or 0) < 0)
        print(f"     These missed trades: {len(missed_trades)} total, {missed_wins}W/{missed_losses}L, PnL: ${missed_pnl:.2f}")
        # Show strategy breakdown of missed
        missed_strats = Counter(t.get('strategy','?') for t in missed_trades)
        print(f"     Missed by strategy: {dict(missed_strats)}")

# Check for in trade-record NOT in edge-resolutions
tr_not_er = tr_cids - er_cids
if tr_not_er:
    print(f"\n  WARNING: {len(tr_not_er)} conditions in trade-record but NOT in edge-resolutions!")

# Check for duplicate conditionIds per side in trade-record
from collections import defaultdict
tr_key_counts = Counter((t.get('conditionId',''), t.get('side','')) for t in tr)
dupes = {k: v for k, v in tr_key_counts.items() if v > 1}
if dupes:
    print(f"\n  WARNING: {len(dupes)} duplicate (conditionId, side) pairs in trade-record!")
    for (cid, side), count in sorted(dupes.items(), key=lambda x: -x[1])[:5]:
        print(f"     {cid[:20]}... side={side}: {count} entries")

# 9. Check if trades from different time periods
print(f"\n=== TIME PERIOD ANALYSIS ===")
tr_dates = sorted(set(t.get('timestamp','')[:10] for t in tr if t.get('timestamp')))
if tr_dates:
    print(f"  trade-record date range: {tr_dates[0]} to {tr_dates[-1]} ({len(tr_dates)} unique days)")

if resolved_trades:
    ls_dates = sorted(set(t.get('timestamp','')[:10] for t in resolved_trades if t.get('timestamp')))
    if ls_dates:
        print(f"  learning-state date range: {ls_dates[0]} to {ls_dates[-1]} ({len(ls_dates)} unique days)")
    # Check for learning-state dates not in trade-record dates
    ls_only_dates = set(ls_dates) - set(tr_dates)
    tr_only_dates = set(tr_dates) - set(ls_dates)
    if ls_only_dates:
        print(f"  Dates ONLY in learning-state: {sorted(ls_only_dates)}")
    if tr_only_dates:
        print(f"  Dates ONLY in trade-record: {sorted(tr_only_dates)}")
