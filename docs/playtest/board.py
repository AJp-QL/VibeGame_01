#!/usr/bin/env python3
"""Board helper. Usage:
  board.py show "TA=d1 FG=c2 ..."            -> grid with units (no dice involved)
  board.py los A B "TA=d1 ..."              -> distance + Bresenham blockers between tiles A and B
  board.py reach X N "units"                -> tiles reachable from X within N moves (Chebyshev, no passing through units)
"""
import sys
from collections import deque

TER = [
    ". . F . W . .",
    ". M . . . D .",
    "W . . L . . F",
    ". F . K . F .",
    "F . . L . . W",
    ". D . . . M .",
    ". . W . F . .",
]
TER = [r.split() for r in TER]
COLS = "abcdefg"

def parse(t):
    return COLS.index(t[0]), int(t[1:]) - 1

def name(c, r):
    return f"{COLS[c]}{r+1}"

def terrain(t):
    c, r = parse(t); return TER[r][c]

def units(s):
    d = {}
    for p in s.split():
        k, v = p.split("="); d[k] = v
    return d

def dist(a, b):
    (c1, r1), (c2, r2) = parse(a), parse(b)
    return max(abs(c1 - c2), abs(r1 - r2))

def bres(a, b):
    (x0, y0), (x1, y1) = parse(a), parse(b)
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1; sy = 1 if y0 < y1 else -1
    err = dx + dy; pts = []
    while True:
        pts.append(name(x0, y0))
        if x0 == x1 and y0 == y1: break
        e2 = 2 * err
        if e2 >= dy: err += dy; x0 += sx
        if e2 <= dx: err += dx; y0 += sy
    return pts[1:-1]

def show(u):
    occ = {v: k for k, v in u.items()}
    print("      " + "    ".join(COLS))
    for r in range(7):
        cells = []
        for c in range(7):
            t = name(c, r)
            cells.append(f"{TER[r][c]}{occ.get(t, ''):<3}")
        print(f"row{r+1} " + " ".join(cells))

def reach(start, n, u):
    occ = set(u.values()) - {start}
    seen = {start: 0}; q = deque([start])
    while q:
        t = q.popleft(); c, r = parse(t)
        if seen[t] == n: continue
        for dc in (-1, 0, 1):
            for dr in (-1, 0, 1):
                nc, nr = c + dc, r + dr
                if 0 <= nc < 7 and 0 <= nr < 7:
                    nt = name(nc, nr)
                    if nt not in seen and nt not in occ:
                        seen[nt] = seen[t] + 1; q.append(nt)
    return sorted(seen)

cmd = sys.argv[1]
if cmd == "show":
    show(units(sys.argv[2]))
elif cmd == "los":
    a, b, u = sys.argv[2], sys.argv[3], units(sys.argv[4])
    line = bres(a, b); occ = {v: k for k, v in u.items()}
    blk = [f"{t}({occ[t]})" for t in line if t in occ]
    print(f"{a}->{b} dist={dist(a,b)} line={line} blockers={blk or 'none'}")
elif cmd == "reach":
    print(" ".join(reach(sys.argv[2], int(sys.argv[3]), units(sys.argv[4]))))
