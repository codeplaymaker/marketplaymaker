#!/usr/bin/env python3
"""Test politics market for Metaculus/Manifold matching."""
import json, urllib.request

API_KEY = "mpm_4f822e666e22aa600afea1435c0a9535587a08c37ce28b04"
BASE = "http://localhost:4000"

req = urllib.request.Request(
    f"{BASE}/api/markets?limit=238",
    headers={"Authorization": f"Bearer {API_KEY}"},
)
with urllib.request.urlopen(req) as resp:
    markets = json.loads(resp.read())

# Test "US strikes Iran" - this should exist on Metaculus
for m in markets:
    q = m.get("question", "")
    if "strikes Iran" in q and "March" in q:
        target = m
        break
else:
    print("Iran market not found, trying Trump/Fed")
    for m in markets:
        q = m.get("question", "")
        if "Warsh" in q and "Fed" in q:
            target = m
            break
    else:
        print("No target found")
        exit()

cid = target["conditionId"]
print(f"Testing: {target['question']}")
print(f"  conditionId: {cid}")
print(f"  yesPrice: {target.get('yesPrice')}")
print()

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
        mq = s.get("matchQuality")
        mv = s.get("matchValidated")
        print(f"    {s['key']:12s} prob={s.get('prob',0):.0%} conf={s.get('confidence')} match={mq} validated={mv}")
        print(f"               detail: {s.get('detail','')[:100]}")
except Exception as e:
    print(f"ERROR: {e}")
