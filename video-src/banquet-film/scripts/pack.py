#!/usr/bin/env python3
"""python3 pack.py PREFIX path... -> /mnt/user-data/outputs/PREFIX-partN.zip, each < 27 MB (stored)."""
import os, sys, subprocess, glob
pre, paths = sys.argv[1], sys.argv[2:]
files = []
for p in paths:
    if os.path.isdir(p): files += [os.path.join(d, f) for d, _, fs in os.walk(p) for f in fs]
    else: files.append(p)
files = sorted(set(f for f in files if not f.endswith(".zip")), key=lambda f: -os.path.getsize(f))
parts, sz = [[]], [0]
for f in files:
    s = os.path.getsize(f)
    for i in range(len(parts)):
        if sz[i] + s < 26.5e6: parts[i].append(f); sz[i] += s; break
    else: parts.append([f]); sz.append(s)
for g in glob.glob(f"/mnt/user-data/outputs/{pre}-part*.zip"): os.remove(g)
for i, p in enumerate(parts, 1):
    open("/tmp/l.txt", "w").write("\n".join(p))
    subprocess.run(f"zip -q -0 -@ /mnt/user-data/outputs/{pre}-part{i}.zip < /tmp/l.txt", shell=True, check=True)
print([f"{s/1e6:.1f}MB" for s in sz])
