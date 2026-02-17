#!/usr/bin/env python3
"""Find interesting markets for testing."""
import json, urllib.request

API_KEY = "mpm_4f822e666e22aa600afea1435c0a9535587a08c37ce28b04"
req = urllib.request.Request(
    "http://localhost:4000/api/markets?limit=238",
    headers={"Authorization": f"Bearer {API_KEY}"},
)
with urllib.request.urlopen(req) as resp:
    d = json.loads(resp.read())

print(f"Total markets: {len(d)}\n")

crypto_target = []
crypto_updown = []
sports = []
politics = []

for m in d:
    q = m.get("question", "")
    ql = q.lower()
    yp = m.get("yesPrice", "?")
    
    if any(c in ql for c in ["bitcoin","ethereum","solana","crypto","dogecoin","xrp"]):
        if "above" in ql or "below" in ql or "reach" in ql or "dip" in ql:
            crypto_target.append(f"  {q[:65]} (price={yp})")
        elif "up or down" in ql:
            crypto_updown.append(f"  {q[:65]} (price={yp})")
    
    if any(w in ql for w in ["nba","nfl","nhl","mlb","ufc","premier league","champions league","stanley cup"]):
        sports.append(f"  {q[:65]} (price={yp})")
    
    if any(w in ql for w in ["trump","biden","congress","election","tariff","sanctions","iran","ukraine","nato"]):
        politics.append(f"  {q[:65]} (price={yp})")

print(f"Crypto with price target ({len(crypto_target)}):")
for c in crypto_target[:8]: print(c)
print(f"\nCrypto Up/Down ({len(crypto_updown)}):")
for c in crypto_updown[:5]: print(c)
print(f"\nSports ({len(sports)}):")
for s in sports[:8]: print(s)
print(f"\nPolitics ({len(politics)}):")
for p in politics[:8]: print(p)
