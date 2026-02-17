#!/usr/bin/env python3
"""Inspect cached odds data and test matching."""
import json, os, glob

# Check cached odds events
path = "/Users/obi/Desktop/marketplaymaker/bot/logs"

for f in sorted(glob.glob(os.path.join(path, "odds-cache*"))):
    name = os.path.basename(f)
    with open(f) as fh:
        d = json.load(fh)
    if isinstance(d, dict):
        # Check structure
        keys = list(d.keys())
        print(f"{name}: keys={keys[:6]}")
        if "events" in d:
            events = d["events"]
            if isinstance(events, dict):
                for sport, evts in list(events.items())[:8]:
                    if isinstance(evts, list):
                        print(f"  {sport}: {len(evts)} events")
                        for e in evts[:2]:
                            ht = e.get("home_team", "?")
                            at = e.get("away_team", "?")
                            print(f"    {ht} vs {at}")
            elif isinstance(events, list):
                print(f"  {len(events)} events (list)")
                for e in events[:3]:
                    print(f"    {e.get('home_team','?')} vs {e.get('away_team','?')} [{e.get('sport_key','?')}]")
    print()

# Check outrights
for f in sorted(glob.glob(os.path.join(path, "*outright*"))):
    name = os.path.basename(f)
    with open(f) as fh:
        d = json.load(fh)
    print(f"{name}:")
    if isinstance(d, dict):
        keys = list(d.keys())
        print(f"  keys={keys[:6]}")
        for k, v in list(d.items())[:5]:
            if isinstance(v, list):
                print(f"  {k}: {len(v)} items")
                for item in v[:3]:
                    if isinstance(item, dict):
                        print(f"    {json.dumps(item)[:100]}")
