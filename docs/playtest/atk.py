#!/usr/bin/env python3
"""Attack/save resolver using real random dice (all rolls appended to rolls.log).
  atk.py "label" MODE BONUS DEF DICE DMGMOD     MODE = n|adv|dis ; DICE like 1d8, 2d8, 0 (no damage)
  save.py-style: atk.py save "label" MODE MOD DC
  dmg only:      atk.py dmg "label" DICE MOD
"""
import random, sys, re, datetime, os
LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rolls.log")

def d20(mode):
    a = random.randint(1, 20)
    if mode == "n": return a, f"[{a}]"
    b = random.randint(1, 20)
    k = max(a, b) if mode == "adv" else min(a, b)
    return k, f"[{a},{b}]{mode}->{k}"

def dice(spec, times=1):
    if spec == "0": return 0, "[]"
    n, s = map(int, re.fullmatch(r"(\d+)d(\d+)", spec).groups())
    rs = [random.randint(1, s) for _ in range(n * times)]
    return sum(rs), str(rs)

a = sys.argv[1:]
if a[0] == "save":
    label, mode, mod, dc = a[1], a[2], int(a[3]), int(a[4])
    r, txt = d20(mode); tot = r + mod
    out = f"SAVE {label}: d20 {txt} {mod:+d} = {tot} vs DC {dc} -> {'RESISTED' if tot >= dc else 'FAILED'}"
elif a[0] == "dmg":
    label, spec, mod = a[1], a[2], int(a[3])
    s, txt = dice(spec); out = f"DMG {label}: {spec} {txt} {mod:+d} = {max(1, s + mod)}"
else:
    label, mode, bonus, df, spec, mod = a[0], a[1], int(a[2]), int(a[3]), a[4], int(a[5])
    r, txt = d20(mode); tot = r + bonus
    if r == 1: res = "MISS (nat 1)"; hit = False; crit = False
    elif r == 20: res = "CRIT"; hit = True; crit = True
    else: hit = tot >= df; crit = False; res = "HIT" if hit else "MISS"
    out = f"ATK {label}: d20 {txt} {bonus:+d} = {tot} vs {df} -> {res}"
    if hit and spec != "0":
        s, dt = dice(spec, 2 if crit else 1)
        out += f" | dmg {spec}{'x2' if crit else ''} {dt} {mod:+d} = {max(1, s + mod)}"
with open(LOG, "a") as f:
    f.write(f"{datetime.datetime.now().isoformat(timespec='seconds')} {out}\n")
print(out)
