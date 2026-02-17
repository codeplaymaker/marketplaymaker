#!/usr/bin/env python3
"""Test a single market analysis to see all source details."""
import json, urllib.request

API_KEY = "mpm_4f822e666e22aa600afea1435c0a9535587a08c37ce28b04"
BASE = "http://localhost:4000"

# Find a crypto price target market
req = urllib.request.Request(
    f"{BASE}/api/markets?limit=238",
    headers={"Authorization": f"Bearer {API_KEY}"},
)
with urllib.request.urlopen(req) as resp:
    markets = json.loads(resp.read())

# Test with "Bitcoin above $68,000"
target = None
for m in markets:
    q = m.get("question", "")
    if "above $68,000" in q and "bitcoin" in q.lower():
        target = m
        break

if not target:
    print("Target market not found")
    exit()

cid = target["conditionId"]
print(f"Testing: {target['question']}")
print(f"  conditionId: {cid}")
print(f"  yesPrice: {target.get('yesPrice')}")
print(f"  endDate: {target.get('endDate')}")
print()

# Run single market analysis
req = urllib.request.Request(
    f"{BASE}/api/intel/independent/{cid}",
    headers={"Authorization": f"Bearer {API_KEY}"},
)
try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        d = json.loads(resp.read())
    
    print(f"Result:")
    print(f"  Grade: {d.get('edgeGrade')} (quality: {d.get('edgeQuality')})")
    print(f"  Edge: {d.get('edgeSignal')} ({d.get('divergence',0):+.1%})")
    print(f"  Sources: {d.get('sourceCount')}")
    for s in d.get("sources", []):
        print(f"    {s['key']:12s} prob={s.get('prob',0):.0%} conf={s.get('confidence')} detail={s.get('detail','')[:80]}")
except Exception as e:
    print(f"ERROR: {e}")
