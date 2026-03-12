import json, os
from collections import Counter, defaultdict

def load(f):
    path = os.path.join('logs', f)
    if not os.path.exists(path):
        return None
    with open(path) as fh:
        return json.load(fh)

# Load all data with correct structure
tr_data = load('trade-record.json') or {}
tr = tr_data.get('trades', [])

er_data = load('edge-resolutions.json') or {}
er = er_data.get('resolutions', [])

pt_data = load('paper-trades.json') or {}
pt_active = pt_data.get('paperTrades', [])
pt_resolved = pt_data.get('resolvedTrades', [])

ls_data = load('learning-state.json') or {}

et = load('executed-trades.json') or []

eps_data = load('execution-pipeline-state.json') or {}
eps_log = eps_data.get('executionLog', [])

ph_data = load('picks-history.json') or {}
ph_picks = ph_data.get('picks', [])

print("=" * 60)
print("TRACKING SYSTEM AUDIT")
print("=" * 60)

# 1. Trade Record
print("\n--- trade-record.json ---")
print(f"  Total trades: {len(tr)}")
resolved = [t for t in tr if t.get('resolved')]
unresolved = [t for t in tr if not t.get('resolved')]
print(f"  Resolved: {len(resolved)}, Unresolved: {len(unresolved)}")
sides = Counter(t.get('side') for t in tr)
print(f"  Sides: {dict(sides)}")
strategies = Counter(t.get('strategy', '?') for t in tr)
print(f"  Strategies: {dict(strategies)}")
pnl = sum(t.get('pnl', 0) for t in resolved)
print(f"  PnL (resolved): ${pnl:.2f}")
wins = sum(1 for t in resolved if (t.get('pnl', 0) or 0) > 0)
losses = sum(1 for t in resolved if (t.get('pnl', 0) or 0) < 0)
breakeven = sum(1 for t in resolved if (t.get('pnl', 0) or 0) == 0)
print(f"  W/L/B: {wins}W / {losses}L / {breakeven}B")
dates = sorted([t.get('timestamp', '') for t in tr if t.get('timestamp')])
if dates:
    print(f"  Date range: {dates[0][:10]} to {dates[-1][:10]}")

# 2. Edge Resolutions
print("\n--- edge-resolutions.json ---")
print(f"  Total entries: {len(er)}")
er_resolved = [e for e in er if e.get('resolved')]
print(f"  Resolved: {len(er_resolved)}, Unresolved: {len(er) - len(er_resolved)}")

# 3. Paper Trades
print("\n--- paper-trades.json ---")
print(f"  Active (unresolved): {len(pt_active)}")
print(f"  Resolved: {len(pt_resolved)}")
print(f"  TOTAL paper trades: {len(pt_active) + len(pt_resolved)}")
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

if pt_resolved:
    pt_pnl = sum(get_pnl(t) for t in pt_resolved)
    pt_wins = sum(1 for t in pt_resolved if is_win(t))
    pt_losses = len(pt_resolved) - pt_wins
    print(f"  Resolved PnL: ${pt_pnl:.2f}")
    print(f"  Resolved W/L: {pt_wins}W / {pt_losses}L")
    pt_strats = Counter(t.get('strategy', '?') for t in pt_resolved)
    print(f"  Resolved strategies: {dict(pt_strats)}")
if pt_active:
    pt_active_strats = Counter(t.get('strategy', '?') for t in pt_active)
    print(f"  Active strategies: {dict(pt_active_strats)}")
    pt_active_dates = sorted([t.get('enteredAt', '') for t in pt_active if t.get('enteredAt')])
    if pt_active_dates:
        print(f"  Active date range: {pt_active_dates[0][:10]} to {pt_active_dates[-1][:10]}")

# 4. Executed trades (REAL money)
print("\n--- executed-trades.json ---")
print(f"  Total: {len(et)}")
if et:
    et_strats = Counter(t.get('strategy', '?') for t in et)
    print(f"  Strategies: {dict(et_strats)}")
    et_statuses = Counter(t.get('status', '?') for t in et)
    print(f"  Statuses: {dict(et_statuses)}")

# 5. Execution Pipeline
print("\n--- execution-pipeline-state.json ---")
print(f"  Log entries: {len(eps_log)}")
if eps_log:
    eps_types = Counter(e.get('type', '?') for e in eps_log)
    print(f"  Types: {dict(eps_types)}")
    eps_statuses = Counter(e.get('status', '?') for e in eps_log)
    print(f"  Statuses: {dict(eps_statuses)}")

# ===== CROSS-SYSTEM COMPARISON =====
print("\n" + "=" * 60)
print("CROSS-SYSTEM CONDITION ID COMPARISON")
print("=" * 60)

tr_cids = set(t.get('conditionId', '') for t in tr)
er_cids = set(e.get('conditionId', '') for e in er)
pt_all_cids = set(t.get('conditionId', '') for t in pt_active + pt_resolved)
pt_resolved_cids = set(t.get('conditionId', '') for t in pt_resolved)
et_cids = set(t.get('conditionId', '') for t in et)
eps_cids = set(e.get('conditionId', '') for e in eps_log)

all_cids = tr_cids | er_cids | pt_all_cids | et_cids | eps_cids
all_cids.discard('')

print(f"\n  Total unique conditions across ALL systems: {len(all_cids)}")
print(f"  trade-record:      {len(tr_cids)} conditions ({len(tr)} entries)")
print(f"  edge-resolutions:  {len(er_cids)} conditions ({len(er)} entries)")
print(f"  paper-trades ALL:  {len(pt_all_cids)} conditions ({len(pt_active) + len(pt_resolved)} entries)")
print(f"  paper-trades RESOLVED: {len(pt_resolved_cids)} conditions ({len(pt_resolved)} entries)")
print(f"  executed-trades:   {len(et_cids)} conditions ({len(et)} entries)")
print(f"  exec-pipeline:     {len(eps_cids)} conditions ({len(eps_log)} entries)")

# Key overlaps
print(f"\n  Overlap trade-record <-> paper-resolved: {len(tr_cids & pt_resolved_cids)}")
print(f"  Overlap trade-record <-> edge-resolutions: {len(tr_cids & er_cids)}")
print(f"  Overlap paper-all <-> edge-resolutions: {len(pt_all_cids & er_cids)}")

# CRITICAL: What's in paper-trades but NOT in trade-record?
pt_only = pt_all_cids - tr_cids
pt_only.discard('')
if pt_only:
    print(f"\n  FINDING: {len(pt_only)} conditions in paper-trades but NOT in trade-record!")
    pt_only_trades = [t for t in pt_active + pt_resolved if t.get('conditionId') in pt_only]
    pt_only_resolved = [t for t in pt_resolved if t.get('conditionId') in pt_only]
    pt_only_active = [t for t in pt_active if t.get('conditionId') in pt_only]
    print(f"     Of these: {len(pt_only_resolved)} resolved, {len(pt_only_active)} still active")
    if pt_only_resolved:
        ptonly_pnl = sum(get_pnl(t) for t in pt_only_resolved)
        ptonly_w = sum(1 for t in pt_only_resolved if is_win(t))
        ptonly_l = len(pt_only_resolved) - ptonly_w
        print(f"     Resolved missed: {ptonly_w}W/{ptonly_l}L, PnL=${ptonly_pnl:.2f}")

# What's in trade-record but NOT in paper-trades?
tr_only = tr_cids - pt_all_cids
tr_only.discard('')
if tr_only:
    print(f"\n  FINDING: {len(tr_only)} conditions in trade-record but NOT in paper-trades!")

# What's in edge-resolutions but NOT in trade-record?
er_only = er_cids - tr_cids
er_only.discard('')
if er_only:
    print(f"\n  FINDING: {len(er_only)} conditions in edge-resolutions but NOT in trade-record!")

# ===== DUPLICATE CHECK =====
print("\n" + "=" * 60)
print("DUPLICATE DETECTION")
print("=" * 60)

# trade-record duplicates
tr_keys = [(t.get('conditionId', ''), t.get('side', '')) for t in tr]
tr_dupes = {k: v for k, v in Counter(tr_keys).items() if v > 1}
if tr_dupes:
    print(f"\n  trade-record: {len(tr_dupes)} duplicate (conditionId, side) pairs")
    total_dup_entries = sum(v for v in tr_dupes.values()) - len(tr_dupes)
    print(f"  Extra entries from duplicates: {total_dup_entries}")
else:
    print("\n  trade-record: No duplicates found")

# paper-trades duplicates
pt_all_keys = [(t.get('conditionId', ''), t.get('side', '')) for t in pt_active + pt_resolved]
pt_dupes = {k: v for k, v in Counter(pt_all_keys).items() if v > 1}
if pt_dupes:
    print(f"  paper-trades: {len(pt_dupes)} duplicate (conditionId, side) pairs")
    total_pt_dup = sum(v for v in pt_dupes.values()) - len(pt_dupes)
    print(f"  Extra entries from duplicates: {total_pt_dup}")
else:
    print("  paper-trades: No duplicates found")

# ===== STRATEGY COMPARISON =====
print("\n" + "=" * 60)
print("STRATEGY-LEVEL COMPARISON")
print("=" * 60)

for strat in sorted(set(t.get('strategy', '?') for t in tr)):
    tr_strat = [t for t in tr if t.get('strategy') == strat]
    tr_res = [t for t in tr_strat if t.get('resolved')]
    tr_pnl = sum(t.get('pnl', 0) for t in tr_res)
    tr_w = sum(1 for t in tr_res if (t.get('pnl', 0) or 0) > 0)
    tr_l = sum(1 for t in tr_res if (t.get('pnl', 0) or 0) < 0)

    pt_strat_res = [t for t in pt_resolved if t.get('strategy') == strat]
    pt_pnl_s = sum(get_pnl(t) for t in pt_strat_res)
    pt_w = sum(1 for t in pt_strat_res if is_win(t))
    pt_l = len(pt_strat_res) - pt_w

    pt_strat_active = [t for t in pt_active if t.get('strategy') == strat]

    print(f"\n  {strat}:")
    print(f"    trade-record:  {len(tr_strat)} total, {len(tr_res)} resolved, {tr_w}W/{tr_l}L, PnL=${tr_pnl:.2f}")
    print(f"    paper-resolved: {len(pt_strat_res)} resolved, {pt_w}W/{pt_l}L, PnL=${pt_pnl_s:.2f}")
    print(f"    paper-active:   {len(pt_strat_active)} still open")

# ===== REAL EXECUTION CHECK =====
print("\n" + "=" * 60)
print("REAL vs PAPER TRADE CHECK")
print("=" * 60)
print(f"  executed-trades.json has {len(et)} REAL trades")
print(f"  trade-record.json has {len(tr)} paper+signal records")
print(f"  paper-trades.json has {len(pt_active) + len(pt_resolved)} paper trades")
print(f"  ALL of the above are PAPER/SIMULATED unless executed-trades shows otherwise")

if et:
    for t in et:
        print(f"    Real trade: {t.get('market', '?')[:50]} | {t.get('side')} @ {t.get('price')} | status={t.get('status')}")
