#!/usr/bin/env python3
"""Run batch analysis and show results."""
import json, subprocess, time

# Wait for rate limit to clear
print("Waiting for rate limit...")
time.sleep(10)
print("Running batch analysis (this takes ~60s)...")

result = subprocess.run(
    ["curl", "-s", "-X", "POST",
     "-H", "Authorization: Bearer mpm_4f822e666e22aa600afea1435c0a9535587a08c37ce28b04",
     "-H", "Content-Type: application/json",
     "-d", '{"maxMarkets":15}',
     "http://localhost:4000/api/intel/independent/batch"],
    capture_output=True, text=True, timeout=120
)

try:
    d = json.loads(result.stdout)
except json.JSONDecodeError:
    print("ERROR: Invalid response")
    print("Raw:", result.stdout[:500])
    exit(1)

if 'error' in d:
    print(f"Server error: {d['error']}")
    if 'retryAfter' in d:
        print(f"Rate limited - retry after {d['retryAfter']}s")
    exit(1)

results = d.get('results', [])
print(f"Total edges: {len(results)}")
print()

multi = 0
for r in sorted(results, key=lambda x: -(x.get('edgeQuality', 0))):
    grade = r.get('edgeGrade', '?')
    quality = r.get('edgeQuality', 0)
    sources = r.get('sourceCount', 0)
    signal = r.get('edgeSignal', '?')
    q = r.get('question', '?')[:60]
    div = r.get('divergence', 0) or 0
    src_names = [s.get('key', '?') for s in r.get('sources', [])]
    if sources >= 2:
        multi += 1
    print(f"  [{grade}:{quality:2d}] {sources}src {signal:8s} {div:+.1%}  {q}")
    if src_names:
        print(f"         Sources: {src_names}")

print(f"\n{'='*50}")
if len(results) > 0:
    print(f"MULTI-SOURCE: {multi}/{len(results)} ({multi/len(results)*100:.0f}%)")
else:
    print("MULTI-SOURCE: 0/0")
print("Grade distribution:")
grades = {}
for r in results:
    g = r.get('edgeGrade', '?')
    grades[g] = grades.get(g, 0) + 1
for g in ['A', 'B', 'C', 'D']:
    print(f"  {g}: {grades.get(g, 0)}")
