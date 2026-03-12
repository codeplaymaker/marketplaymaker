import json
from collections import Counter

with open('logs/panic-dip-state.json') as f:
    state = json.load(f)

history = state.get('history', [])
print(f"Panic dip signals: {len(history)}")

resolved = [h for h in history if h.get('resolved')]
print(f"Resolved: {len(resolved)}")

for h in resolved[:15]:
    reason = h.get('resolvedReason', '?')
    rev = h.get('reversionAchieved', '?')
    drop = h.get('dropPct', 0)
    pre = h.get('preDropPrice', 0)
    cur = h.get('currentPrice', 0)
    exit_p = h.get('exitPrice', '?')
    tp = h.get('type', '?')
    print(f"  {tp:12s} | Drop={drop:.0%} | Pre={pre:.3f} Entry={cur:.3f} Exit={exit_p} | Rev={rev} | {reason}")

reasons = Counter(h.get('resolvedReason') for h in resolved)
print(f"\nResolution reasons: {dict(reasons)}")

wins = [h for h in resolved if h.get('resolvedReason') == 'TARGET_HIT']
stops = [h for h in resolved if h.get('resolvedReason') == 'STOP_LOSS']
timeout = [h for h in resolved if h.get('resolvedReason') == 'TIMEOUT']
expired = [h for h in resolved if h.get('resolvedReason') == 'EXPIRED']
print(f"Target={len(wins)}, StopLoss={len(stops)}, Timeout={len(timeout)}, Expired={len(expired)}")

# Simulated PnL if we had bought at currentPrice and exited at exitPrice
print("\nSimulated PnL per dip:")
total_pnl = 0
for h in resolved:
    entry = h.get('currentPrice', 0)
    exit_p = h.get('exitPrice', 0)
    if entry > 0 and exit_p is not None and isinstance(exit_p, (int, float)):
        pnl_pct = (exit_p - entry) / entry * 100
        total_pnl += pnl_pct
        print(f"  Entry={entry:.3f} Exit={exit_p:.3f} PnL={pnl_pct:+.1f}% | {h.get('type','')} | {h.get('question','')[:45]}")
print(f"\nTotal simulated return: {total_pnl:+.1f}%")
