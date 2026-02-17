#!/usr/bin/env python3
"""Test Solana market + a price target market."""
import json, urllib.request

API_KEY = "mpm_4f822e666e22aa600afea1435c0a9535587a08c37ce28b04"
BASE = "http://localhost:4000"

# Get markets
req = urllib.request.Request(f"{BASE}/api/markets?limit=238", headers={"Authorization": f"Bearer {API_KEY}"})
with urllib.request.urlopen(req) as resp:
    markets = json.loads(resp.read())

tests = [
    ("Solana Up or Down", lambda m: "solana" in m.get("question","").lower() and "up or down" in m.get("question","").lower()),
    ("Bitcoin above $68", lambda m: "above $68,000" in m.get("question","")),
    ("Bitcoin reach $85", lambda m: "reach $85,000" in m.get("question","")),
    ("Bitcoin dip $55", lambda m: "dip to $55,000" in m.get("question","")),
]

for name, finder in tests:
    target = next((m for m in markets if finder(m)), None)
    if not target:
        print(f"[{name}] Market not found\n")
        continue
    
    cid = target["conditionId"]
    print(f"[{name}] {target['question'][:60]} (price={target.get('yesPrice')})")
    
    req = urllib.request.Request(f"{BASE}/api/intel/independent/{cid}", headers={"Authorization": f"Bearer {API_KEY}"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            d = json.loads(resp.read())
        print(f"  Grade: {d.get('edgeGrade')} ({d.get('edgeQuality')}) | Sources: {d.get('sourceCount')} | Edge: {d.get('edgeSignal')} {d.get('divergence',0):+.1%}")
        for s in d.get("sources", []):
            print(f"    {s['key']:12s} {s.get('prob',0):.0%} — {(s.get('detail') or '')[:70]}")
    except Exception as e:
        print(f"  ERROR: {e}")
    print()
