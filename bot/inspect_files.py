import json, os

files = ['trade-record.json', 'edge-resolutions.json', 'paper-trades.json',
         'learning-state.json', 'executed-trades.json', 'execution-pipeline-state.json',
         'picks-history.json']

for f in files:
    path = os.path.join('logs', f)
    if not os.path.exists(path):
        print(f"{f}: FILE NOT FOUND")
        continue
    try:
        with open(path) as fh:
            d = json.load(fh)
        if isinstance(d, list):
            print(f"{f}: list, len={len(d)}")
            if d and isinstance(d[0], dict):
                print(f"  first entry keys: {list(d[0].keys())[:10]}")
            elif d:
                print(f"  first entry type: {type(d[0]).__name__}, val: {str(d[0])[:120]}")
        elif isinstance(d, dict):
            print(f"{f}: dict, top_keys={list(d.keys())[:10]}")
            for k, v in d.items():
                if isinstance(v, list):
                    print(f"  {k}: list[{len(v)}]")
                    if v and isinstance(v[0], dict):
                        print(f"    first keys: {list(v[0].keys())[:10]}")
                elif isinstance(v, dict):
                    print(f"  {k}: dict[{len(v)} keys]")
                else:
                    print(f"  {k}: {type(v).__name__} = {str(v)[:60]}")
    except Exception as e:
        print(f"{f}: ERROR - {e}")
    print()
