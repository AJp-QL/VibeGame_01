#!/usr/bin/env python3
"""Dump sim.py AI decisions for the TypeScript AI's decision-parity test (ticket 15).

Plays games with prototype/simulation/sim.py (variant U4, the one ticket 16
compares against) and records, before every activation sim.py's AI picks,
the whole game state and the plan it chose. The TypeScript test rebuilds each
state in the engine and checks that @mt/ai's planner picks the same plan.

Usage (from the repo root):
  python packages/ai/test/simParity/dump_sim_decisions.py --games 12 --every 3 \
      --out packages/ai/test/simParity/sim_decisions.json
"""
import argparse, json, os, random, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', '..', 'prototype', 'simulation'))
import sim  # noqa: E402

SKILL_ID = {name: name.lower().replace(' ', '_') for name in sim.SK}
STATUS_ID = {'Guarded': 'guarded', 'Countering': 'countering', 'Bleed': 'bleed', 'Pin': 'pin', 'Rallied': 'rallied',
             'Weakened': 'weakened', 'Taunted': 'taunted', 'Hidden': 'hidden', 'Marked': 'marked',
             'Off-balance': 'off_balance', 'Covered': 'covered'}


def unit_id(u):
    if u.is_tamer:
        return f'{u.team}.tamer'
    order = [k for k in sim.ELEMENTS[u.team]]
    return f'{u.team}.m{order.index(u.kind) + 1}'


def tile(p):
    return {'x': p[1], 'y': p[0]}


STATS = ['pow', 'agi', 'vit', 'int', 'sen', 'spi']


def dump_state(g, side, n_act):
    units = []
    lv, star = sim.SCEN[g.scen_id]
    for u in g.units:
        raw = sim.TEMPL[(u.kind, lv if u.is_tamer else star)][0]
        st = {}
        for name, rec in u.st.items():
            src = rec[2]
            st[STATUS_ID[name]] = {'turns': rec[0] if isinstance(rec[0], int) else None, 'own': bool(rec[1]),
                                   'source': unit_id(src) if isinstance(src, sim.Unit) else None,
                                   'bonus': src if isinstance(src, int) and not isinstance(src, bool) else None}
        units.append({'id': unit_id(u), 'stats': dict(zip(STATS, raw)), 'alive': u.alive, 'tile': tile(u.pos) if u.pos else None, 'hp': u.hp,
                      'statuses': st, 'used': {SKILL_ID[s]: t - 2 for s, t in u.cd.items()},
                      'acted': u.acted, 'cmd': 'advantage' if u.cmd_adv else 'move' if u.cmd_move else None})
    attune = [{'tile': tile(p), 'element': rec[0], 'turns': rec[1], 'own': rec[2], 'side': rec[3]} for p, rec in g.attune.items()]
    return {'side': side, 'limit': n_act, 'turn': dict(g.turn), 'first': g.first, 'inspiration': dict(g.insp),
            'units': units, 'attune': attune}


def dump_plan(p):
    out = {'unit': unit_id(p['unit']), 'gain': p['gain']}
    if p.get('stunned'):
        return out
    out.update(order=p['order'], dest=tile(p['dest']), blink=bool(p.get('blink')))
    act = p['act']
    if act is not None:
        name, tgt, extra = act
        a = {'skill': SKILL_ID[name]}
        if name == 'Burst':
            a['tile'] = tile(tgt)
            a['targets'] = [unit_id(e) for e in extra]
        elif name == 'Attune':
            a['tile'] = tile(tgt)
            a['element'] = extra
        elif isinstance(tgt, sim.Unit):
            a['target'] = unit_id(tgt)
        if name == 'Hit and Run':
            a['retreat'] = tile(extra) if extra is not None else None
        out['action'] = a
    if p.get('cmd'):
        when, m, kind = p['cmd']
        out['command'] = {'when': when, 'target': unit_id(m), 'option': 'advantage' if kind == 'adv' else 'move'}
    return out


def act_key(act):
    if act is None:
        return 'none'
    name, tgt, extra = act
    if isinstance(tgt, sim.Unit):
        return f'{SKILL_ID[name]}>{unit_id(tgt)}'
    if name == 'Burst':
        return f'burst@{tgt[1]},{tgt[0]}>' + '+'.join(sorted(unit_id(e) for e in extra))
    if name == 'Attune':
        return f'attune@{tgt[1]},{tgt[0]}:{extra}'
    return SKILL_ID[name]


def debug_plan(self, g, u):
    """sim.AI.plan, unchanged except that it keeps its position values and candidates for --debug."""
    self._tc = {}
    origin = u.pos
    self._origin = origin
    if 'Stun' in u.st:
        return dict(unit=u, stunned=True, gain=0.0)
    mv = g.move_points(u)
    dests = g.reachable(u, mv)
    dset = set(dests)
    blinkset = set()
    if 'Blink' in u.skills and g.ready(u, 'Blink'):
        blinkset = {q for q in sim.WITHIN[(origin, 2)] if q not in g.board and q not in dset}
    alld = dests + sorted(blinkset)
    taunter = None
    if 'Taunted' in u.st and u.st['Taunted'][2] is not None and u.st['Taunted'][2].alive:
        taunter = u.st['Taunted'][2]
    cands = []
    pv = {}
    cmdv = {}
    if u.is_tamer:
        c0 = self.cmd_value(g, u, origin)
    for d in alld:
        g.temp_move(u, d)
        pv[d] = self.pos_value(g, u, d)
        if u.is_tamer:
            cd = self.cmd_value(g, u, d)
            cmdv[d] = ('start',) + c0[1:] if c0[0] >= cd[0] else ('end',) + cd[1:]
            pv[d] += max(c0[0], cd[0])
        cands.append((pv[d], 'mf', d, None, ()))
        for v, act, tg in self.actions(g, u, d, True):
            cands.append((v + pv[d], 'mf', d, act, tg))
        g.temp_move(u, origin)
    if taunter:
        mind = min(sim.cheb(d, taunter.pos) for d in alld)
        af_dests = [d for d in alld if sim.cheb(d, taunter.pos) == mind]
    else:
        af_dests = alld
    bestd = max(af_dests, key=lambda d: pv[d])
    for v, act, tg in self.actions(g, u, origin, False):
        cands.append((v + pv[bestd], 'af', bestd, act, tg))
    if taunter:
        forced = [c for c in cands if c[3] is not None and c[3][0] in sim.ATTACK_SKILLS and taunter in c[4]]
        if forced:
            cands = forced
        else:
            mind = min(sim.cheb(d, taunter.pos) for d in alld)
            cands = [c for c in cands if sim.cheb(c[2], taunter.pos) == mind
                     and (c[3] is None or c[3][0] not in sim.ATTACK_SKILLS)]
    self._last_pv = pv
    self._last_cands = cands
    best = max(cands, key=lambda c: c[0])
    score, order, dest, act, _ = best
    p = dict(unit=u, order=order, dest=dest, act=act, blink=dest in blinkset,
             gain=score - pv.get(origin, 0.0))
    if u.is_tamer and cmdv.get(dest) and cmdv[dest][1] is not None:
        p['cmd'] = cmdv[dest]
    return p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--games', type=int, default=12)
    ap.add_argument('--every', type=int, default=3, help='keep every n-th decision')
    ap.add_argument('--out', required=True)
    ap.add_argument('--debug', action='store_true', help='also dump position values and best candidates of each plan')
    a = ap.parse_args()
    sim.set_variant('U4')
    records = []
    counter = [0]

    def take_turn(self, g, side, n_act):
        acts = 0
        while acts < n_act:
            rem = [u for u in g.team_units(side) if not u.acted]
            if not rem:
                break
            snap = dump_state(g, side, n_act) if counter[0] % a.every == 0 else None
            counter[0] += 1
            best, gains, debug = None, {}, {}
            for u in rem:
                p = self.plan(g, u)
                gains[unit_id(u)] = p['gain']
                if a.debug:
                    debug[unit_id(u)] = {'pv': {f'{d[1]},{d[0]}': v for d, v in self._last_pv.items()},
                                         'cands': [[round(c[0], 4), c[1], f'{c[2][1]},{c[2][0]}', act_key(c[3])]
                                                   for c in sorted(self._last_cands, key=lambda c: -c[0])[:12]]}
                if best is None or p['gain'] > best['gain']:
                    best = p
            if snap is not None:
                snap.update(scenario=g.scen_id, modes=g.modes, plan=dump_plan(best), gains=gains)
                if a.debug:
                    snap['debug'] = debug
                records.append(snap)
            g.execute(best)
            acts += 1

    sim.AI.take_turn = take_turn
    if a.debug:
        sim.AI.plan = debug_plan
    configs = [('S1', 'greedy', 'greedy'), ('S2', 'greedy', 'greedy'), ('S1', 'tamer_rush', 'greedy'),
               ('S2', 'greedy', 'tamer_rush'), ('S1', 'neutral', 'neutral')]
    for scen, ma, mb in configs:
        for i in range(a.games):
            g = sim.Game(scen, 'plus', {'A': sim.AI(ma), 'B': sim.AI(mb)}, 1000003 * i + 17)
            g.scen_id = scen
            g.modes = {'A': ma, 'B': mb}
            g.play()
    with open(a.out, 'w') as f:
        json.dump(records, f, separators=(',', ':'))
    print(f'{len(records)} decisions', file=sys.stderr)


if __name__ == '__main__':
    main()
