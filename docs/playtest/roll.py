#!/usr/bin/env python3
"""Tiny dice helper. Usage: roll.py "label:spec" ...
spec: d20 | adv | dis | NdM[+K|-K]
Every roll is appended to rolls.log for audit."""
import random, sys, re, datetime, os

LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rolls.log")

def roll(spec):
    spec = spec.strip().lower()
    if spec in ("d20", "1d20"):
        r = random.randint(1, 20); return r, f"[{r}]"
    if spec in ("adv", "dis"):
        a, b = random.randint(1, 20), random.randint(1, 20)
        k = max(a, b) if spec == "adv" else min(a, b)
        return k, f"[{a},{b}]->{k} ({spec})"
    m = re.fullmatch(r"(\d*)d(\d+)([+-]\d+)?", spec)
    if not m:
        raise SystemExit(f"bad spec {spec}")
    n = int(m.group(1) or 1); s = int(m.group(2)); k = int(m.group(3) or 0)
    rs = [random.randint(1, s) for _ in range(n)]
    return sum(rs) + k, f"{rs}{'+' if k>=0 else ''}{k if k else ''} = {sum(rs)+k}"

out = []
for arg in sys.argv[1:]:
    label, _, spec = arg.rpartition(":")
    total, detail = roll(spec)
    out.append(f"{label or spec}: {detail}")
line = " | ".join(out)
with open(LOG, "a") as f:
    f.write(f"{datetime.datetime.now().isoformat(timespec='seconds')} {line}\n")
print(line)
