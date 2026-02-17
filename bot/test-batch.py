#!/usr/bin/env python3
"""Test batch analysis endpoint."""
import json, urllib.request, time

API_KEY = "mpm_4f822e666e22aa600afea1435c0a9535587a08c37ce28b04"
BASE = "http://localhost:4000"

print("Running batch analysis (10 markets, ~60s)...")
req = urllib.request.Request(
    f"{BASE}/api/intel/independent/batch",
    data=json.dumps({"maxMarkets": 10}).encode(),
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    },
    method="POST",
)

try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        d = json.loads(resp.read())
except Exception as e:
    print(f"ERROR: {e}")
    exit(1)

results = d.get("results", [])
print(f"Total edges: {len(results)}\n")

multi = 0
for r in sorted(results, key=lambda x: -(x.get("edgeQuality", 0))):
    grade = r.get("edgeGrade", "?")
    quality = r.get("edgeQuality", 0)
    sources = r.get("sourceCount", 0)
    signal = r.get("edgeSignal", "?")
    q = r.get("question", "?")[:58]
    div = r.get("divergence", 0) or 0
    src_names = [s.get("key", "?") for s in r.get("sources", [])]
    if sources >= 2:
        multi += 1
    print(f"  [{grade}:{quality:2d}] {sources}src {signal:8s} {div:+.1%}  {q}")
    print(f"         Sources: {src_names}")

print(f"\n{'='*55}")
if len(results) > 0:
    pct = multi / len(results) * 100
    print(f"MULTI-SOURCE: {multi}/{len(results)} ({pct:.0f}%)")
else:
    print("MULTI-SOURCE: 0/0")

grades = {}
for r in results:
    g = r.get("edgeGrade", "?")
    grades[g] = grades.get(g, 0) + 1
for g in ["A", "B", "C", "D"]:
    print(f"  {g}: {grades.get(g, 0)}")
