#!/usr/bin/env python3
"""Monster Tactics RPG - Phase 0 paper prototype simulator, rules v3 (stdlib only).

Implements /home/claude/prototype_rules.md + v2 changes + prototype_rules_v3_changes.md.
Sensitivity variants are set through the module-level VAR dict. Resolutions of ambiguities are
marked "AMBIG" in comments and listed in AMBIGUITIES below.

Usage:
  python3 sim.py --games 2000            # run all configurations, print report
  python3 sim.py --games 50 --only S1    # quick run
"""
import argparse, json, math, random, statistics, sys, time
from collections import Counter, defaultdict
from functools import lru_cache

AMBIGUITIES = [
    "Nat 20 always hits (rule only says 'critical').",
    "Crit doubles dice only; modifiers added once.",
    "Inspiration reroll re-rolls the whole attack roll (both d20s under adv/dis).",
    "Status applied during the owner's own turn skips that turn's end-of-turn tick "
    "(literal: 'duration 1 = expires at the end of that side's NEXT turn'). Applies to Rallied, Attune.",
    "'Until own next turn' statuses (Guarded, Countering, Cover) end at the START of the owner's side turn, before Bleed ticks.",
    "Guarded from two sources does not stack; the higher bonus is kept.",
    "Taunted: if the unit can attack the taunter this activation (move+attack) it must; otherwise it must "
    "move to minimise distance to the taunter and may only take non-attack actions.",
    "Counterattacks do not trigger counters; Counter triggers on hits and misses; Burst from distance 1 triggers it.",
    "First Aid range 1 includes self.",
    "Cover redirects all damage incl. Bleed while active (Cover always expires before Bleed ticks, so moot).",
    "Blink may be used while Pinned (teleport, not movement). Otherwise it is a subset of normal flying movement.",
    "Burst cannot hit Hidden units at distance >= 2. (v2 ruling: LOS applies to Taunt/Hex/Distract/Mark; Burst checks LOS to centre.)",
    "v3: Tamer protection (disadvantage) is checked at the moment of each attack roll.",
    "v3 Shield Bash: 'directly away' = step of sign(dx), sign(dy) from user to target (diagonal if adjacent diagonally).",
    "v3 Shield Bash: Counter (target at distance 1 when attacked) resolves before the push.",
    "v3 Shield Bash: a Pinned target can still be pushed (forced movement is not a move); push can end Hidden.",
    "v2: 'no Command on own first turn' applies to each side's first turn.",
    "Light vs dark: both 'beat' each other, so element adv and dis cancel (no light/dark monsters in test).",
    "Turn-limit HP% tie = draw.",
    "Command is issued at the start or end of the Tamer's activation (v2 ruling allows any point; AI uses these two).",
    "Mark is an attack roll (ends Hidden, can be countered, can use Command advantage).",
]

N = 7
TER_ROWS = [
    ". . F . W . .",
    ". M . . . D .",
    "W . . L . . F",
    ". F . K . F .",
    "F . . L . . W",
    ". D . . . M .",
    ". . W . F . .",
]
CODE = {'.': None, 'F': 'forest', 'W': 'water', 'M': 'mountain', 'D': 'desert', 'L': 'light', 'K': 'dark'}
BASE_TER = {}
for r, row in enumerate(TER_ROWS):
    for c, ch in enumerate(row.split()):
        BASE_TER[(r, c)] = CODE[ch]
TILES = [(r, c) for r in range(N) for c in range(N)]
BEATS = {'forest': 'water', 'water': 'mountain', 'mountain': 'desert', 'desert': 'forest',
         'light': 'dark', 'dark': 'light'}
BEATER = {v: k for k, v in BEATS.items() if k not in ('light', 'dark')}


def beats(a, b):
    return a is not None and b is not None and BEATS.get(a) == b


def cheb(a, b):
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]))


NB = {p: [q for q in TILES if cheb(p, q) == 1] for p in TILES}
WITHIN = {(p, k): [q for q in TILES if cheb(p, q) <= k] for p in TILES for k in range(0, 7)}


def _bres(a, b):
    y0, x0 = a
    y1, x1 = b
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx + dy
    pts = []
    x, y = x0, y0
    while (x, y) != (x1, y1):
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x += sx
        if e2 <= dx:
            err += dx
            y += sy
        pts.append((y, x))
    return pts[:-1]


LINE = {(a, b): _bres(a, b) for a in TILES for b in TILES}

# ---------------------------------------------------------------- data
# stats order: POW AGI VIT INT SEN SPI
TEMPL = {
    ('Fangrel', 1): ((14, 12, 10, 8, 12, 8), (16, 19), 4, 11, 9, 2),
    ('Fangrel', 4): ((22, 18, 14, 10, 16, 12), (19, 31), 5, 14, 11, 5),
    ('Tidewall', 1): ((12, 8, 14, 8, 10, 12), (28, 31), 3, 11, 11, 1),
    ('Tidewall', 4): ((16, 10, 22, 10, 14, 18), (38, 50), 3, 12, 14, 4),
    ('Wispling', 1): ((8, 12, 8, 14, 12, 12), (14, 17), 4, 11, 11, 2),
    ('Wispling', 4): ((10, 16, 12, 22, 18, 18), (17, 29), 4, 13, 14, 6),
    ('Quillfox', 1): ((12, 12, 10, 8, 14, 8), (16, 19), 4, 11, 9, 3),
    ('Quillfox', 4): ((16, 18, 12, 10, 22, 12), (17, 29), 5, 14, 11, 8),
    ('Tamer', 1): ((10, 12, 12, 10, 12, 12), (25, 25), 3, 11, 11, 3),
    ('Tamer', 6): ((10, 14, 14, 10, 14, 16), (45, 45), 3, 12, 13, 5),
}
POW, AGI, VIT, INT, SEN, SPI = range(6)
KIND = {
    'Fangrel': ('Striker', 'ground', POW, ['Heavy Blow', 'Rend', 'Hit and Run', 'Pack Howl']),
    'Tidewall': ('Guardian', 'aquatic', VIT, ['Taunt', 'Shield Bash', 'Counter', 'Pincer Guard']),
    'Wispling': ('Caster', 'flying', INT, ['Element Bolt', 'Burst', 'Hex', 'Blink']),
    'Quillfox': ('Ranger', 'ground', SEN, ['Long Shot', 'Pin', 'Mark', 'Camouflage']),
    'Tamer': ('Tamer', 'none', SPI, ['Cover', 'Attune', 'First Aid', 'Distract']),
}
SK = {
    'Basic Attack': dict(tier='minor', rng=1, roll='phys', dice=(1, 8)),
    'Defend': dict(tier='minor', rng=0),
    'Heavy Blow': dict(tier='major', rng=1, roll='phys', dice=(2, 8)),
    'Rend': dict(tier='major', rng=1, roll='phys', dice=(1, 6)),
    'Hit and Run': dict(tier='minor', rng=1, roll='phys', dice=(1, 8)),
    'Pack Howl': dict(tier='major', rng=0),
    'Taunt': dict(tier='major', rng=3),
    'Shield Wall': dict(tier='major', rng=0),
    'Shield Bash': dict(tier='minor', rng=1, roll='phys', dice=(1, 8)),
    'Counter': dict(tier='minor', rng=0),
    'Pincer Guard': dict(tier='passive', rng=0),
    'Element Bolt': dict(tier='minor', rng=4, roll='elem', dice=(1, 8)),
    'Burst': dict(tier='major', rng=3, roll='elem', dice=(1, 6)),
    'Hex': dict(tier='major', rng=3),
    'Blink': dict(tier='minor', rng=2),
    'Long Shot': dict(tier='minor', rng=4, roll='phys', dice=(1, 8)),
    'Pin': dict(tier='major', rng=4, roll='phys', dice=(1, 6)),
    'Mark': dict(tier='minor', rng=5, roll='phys', dice=None),
    'Camouflage': dict(tier='minor', rng=0),
    'Cover': dict(tier='major', rng=1),
    'Attune': dict(tier='major', rng=1),
    'First Aid': dict(tier='major', rng=1),
    'Distract': dict(tier='minor', rng=3),
    'Counterattack': dict(tier='-', rng=1, roll='phys', dice=(1, 8)),
}
# sensitivity switches (defaults = v3 rules)
VAR = dict(bash_dice=(1, 8), tide_loadout=None, defend=2, prot='v3')
VARIANTS = {
    'v3': {},
    'T1': dict(bash_dice=(2, 6)),
    'T2': dict(tide_loadout=['Shield Bash', 'Shield Wall', 'Counter', 'Pincer Guard']),
    'T3': dict(defend=4),
    'T4': dict(prot='v2'),
}


def set_variant(name):
    VAR.clear()
    VAR.update(bash_dice=(1, 8), tide_loadout=None, defend=2, prot='v3')
    VAR.update(VARIANTS[name])
    SK['Shield Bash']['dice'] = VAR['bash_dice']


ATTACK_SKILLS = {'Shield Bash', 'Basic Attack', 'Heavy Blow', 'Rend', 'Hit and Run', 'Element Bolt', 'Burst',
                 'Long Shot', 'Pin', 'Mark'}
DMG_SKILLS = ATTACK_SKILLS - {'Mark'}
UNTIL_NEXT = ('Guarded', 'Countering', 'Covered')
ELEMENTS = {'A': {'Fangrel': 'forest', 'Wispling': 'mountain'},
            'B': {'Tidewall': 'desert', 'Quillfox': 'water'}}
SCEN = {'S1': (1, 1), 'S2': (6, 4)}


# ---------------------------------------------------------------- probability helpers
@lru_cache(None)
def dice_dist(n, s):
    dist = {0: 1.0}
    for _ in range(n):
        nd = defaultdict(float)
        for k, p in dist.items():
            for f in range(1, s + 1):
                nd[k + f] += p / s
        dist = nd
    return tuple(sorted(dist.items()))


@lru_cache(None)
def dmg_stats(n, s, mod, hp):
    e = k = 0.0
    for v, p in dice_dist(n, s):
        x = max(1, v + mod)
        e += p * min(x, hp)
        if x >= hp:
            k += p
    return e, k


@lru_cache(None)
def hit_probs(bonus, defense, adv):
    pnc = pc = 0.0
    for r in range(1, 21):
        if adv == 0:
            pr = 1 / 20
        elif adv > 0:
            pr = (r * r - (r - 1) * (r - 1)) / 400
        else:
            pr = ((21 - r) ** 2 - (20 - r) ** 2) / 400
        if r == 20:
            pc += pr
        elif r != 1 and r + bonus >= defense:
            pnc += pr
    return pnc, pc


@lru_cache(None)
def ev_raw(bonus, defense, adv, n, s, mod, hp):
    pnc, pc = hit_probs(bonus, defense, adv)
    e1, k1 = dmg_stats(n, s, mod, hp)
    e2, k2 = dmg_stats(2 * n, s, mod, hp)
    return pnc * e1 + pc * e2, pnc * k1 + pc * k2


@lru_cache(None)
def p_fail(mod, dc, adv):
    p = sum(1 for r in range(1, 21) if r + mod >= dc) / 20
    if adv > 0:
        p = 1 - (1 - p) ** 2
    return 1 - p


class GameOver(Exception):
    pass


# ---------------------------------------------------------------- units
class Unit:
    def __init__(self, uid, kind, team, level, element, hpvar):
        self.uid, self.kind, self.team = uid, kind, team
        self.is_tamer = kind == 'Tamer'
        role, mt, rstat, skills = KIND[kind]
        stats, hp, mv, guard, ward, atk = TEMPL[(kind, level)]
        self.mods = [(x - 10) // 2 for x in stats]
        self.maxhp = hp[0] if self.is_tamer else hp[1]  # v2 E
        self.hp = self.maxhp
        self.move, self.guard, self.ward, self.atk = mv, guard, ward, atk
        self.prof = (2 if level <= 4 else 3) if self.is_tamer else math.ceil(level / 2)
        assert atk == self.mods[SEN] + self.prof, (kind, level)
        self.dc = 8 + self.prof + self.mods[rstat]
        self.el = element
        self.flying = mt == 'flying'
        self.aquatic = mt == 'aquatic'
        if kind == 'Tidewall' and VAR['tide_loadout']:
            skills = VAR['tide_loadout']
        self.skills = ['Basic Attack', 'Defend'] + skills
        self.dmg_skills = [s for s in self.skills if s in DMG_SKILLS]
        self.maxrng = max(SK[s]['rng'] for s in self.dmg_skills)

        self.st, self.cd = {}, {}
        self.pos = None
        self.alive, self.acted = True, False
        self.cmd_adv = self.cmd_move = False
        self.hits_taken = 0

    def dice(self, skill):
        if self.is_tamer and skill == 'Basic Attack':
            return (1, 6)  # v2 A
        return SK[skill]['dice']

    def dmg_mod(self, skill):
        if skill == 'Counterattack' or SK[skill].get('roll') == 'phys':
            m = self.mods[POW] + (2 if 'Empowered' in self.st else 0)
        else:
            m = self.mods[INT]
        if 'Weakened' in self.st:
            m -= 2
        return m

    def __repr__(self):
        return f"{self.team}:{self.kind}@{self.pos}({self.hp})"


def other(t):
    return 'B' if t == 'A' else 'A'


# ---------------------------------------------------------------- game
class Game:
    def __init__(self, scen, hpvar, ai, seed, log=False):
        self.rng = random.Random(seed)
        lv, star = SCEN[scen]
        self.units = []
        uid = 0
        for team in 'AB':
            self.units.append(Unit(uid, 'Tamer', team, lv, None, hpvar)); uid += 1
            for k, el in ELEMENTS[team].items():
                self.units.append(Unit(uid, k, team, star, el, hpvar)); uid += 1
        self.board = {}
        self.attune = {}
        self.insp = {'A': True, 'B': True}
        self.turn = {'A': 0, 'B': 0}
        self.side = None
        self.ai = ai
        self.winner = self.decided = self.first_drop = None
        self.log = log
        self.S = dict(skill=Counter(), atk_n=Counter(), atk_hit=Counter(), def_n=Counter(), def_hit=Counter(),
                      terr_adv=0, terr_dis=0, elem_adv=0, elem_dis=0, n_att=0, drops=[], insp=Counter(),
                      activations=0, cover_redirect=0, bleed_dmg=0,
                      prot_turns=0, tamer_turns=0, dmg_by=Counter(), tamer_hits=0, tamer_hits_prot=0, tamer_att_adj=0, tamer_att_far=0, tamer_dead=Counter())

    # --- helpers
    def team_units(self, t):
        return [u for u in self.units if u.team == t and u.alive]

    def enemies(self, t):
        return [u for u in self.units if u.team != t and u.alive]

    def tamer(self, t):
        return next(u for u in self.units if u.team == t and u.is_tamer)

    def d20(self, adv):
        a = self.rng.randint(1, 20)
        if adv == 0:
            return a
        b = self.rng.randint(1, 20)
        return max(a, b) if adv > 0 else min(a, b)

    def roll(self, n, s):
        return sum(self.rng.randint(1, s) for _ in range(n))

    def terrain(self, p):
        a = self.attune.get(p)
        return a[0] if a else BASE_TER[p]

    def terrain_mod(self, u, p):
        if u.is_tamer or u.flying:
            return 0
        el = self.terrain(p)
        if el is None:
            return 0
        if el == u.el or (u.aquatic and el == 'water'):
            return 1
        if beats(el, u.el):
            return -1
        return 0

    def adv_state(self, att, tgt, pos):
        adv = dis = ta = td = ea = ed = False
        if not att.is_tamer and not tgt.is_tamer:
            if beats(att.el, tgt.el):
                adv = ea = True
            if beats(tgt.el, att.el):
                dis = ed = True
        tm = self.terrain_mod(att, pos)
        if tm > 0:
            adv = ta = True
        elif tm < 0:
            dis = td = True
        if 'Marked' in tgt.st:
            adv = True
        if 'Off-balance' in att.st:
            dis = True
        if att.cmd_adv or 'Blessed' in att.st:
            adv = True
        if VAR['prot'] == 'v3' and tgt.is_tamer and self.protected(tgt):
            dis = True  # v3 change 2
        return (1 if adv and not dis else -1 if dis and not adv else 0), (ta, td, ea, ed)

    def guard_bonus(self, u):
        g = u.st.get('Guarded')
        return g[2] if g else 0

    def ready(self, u, s):
        return SK[s]['tier'] != 'passive' and u.cd.get(s, 0) <= self.turn[u.team]

    def move_points(self, u):
        if 'Pin' in u.st or 'Stun' in u.st:
            return 0
        return u.move + (1 if u.aquatic and self.terrain(u.pos) == 'water' else 0) + (1 if u.cmd_move else 0)

    def reachable(self, u, mv):
        start = u.pos
        res, seen, frontier = [start], {start}, [start]
        for _ in range(mv):
            nf = []
            for p in frontier:
                for q in NB[p]:
                    if q in seen:
                        continue
                    seen.add(q)
                    if q in self.board:
                        if u.flying:
                            nf.append(q)
                        continue
                    res.append(q)
                    nf.append(q)
            frontier = nf
        return res

    def los(self, a, b):
        for p in LINE[(a, b)]:
            if p in self.board:
                return False
        return True

    def protected(self, t, at=None):
        """v2 A: Tamer with an adjacent living allied monster."""
        if not t.is_tamer:
            return False
        p = t.pos if at is None else at
        return any(m.alive and not m.is_tamer and m.team == t.team and cheb(m.pos, p) == 1 for m in self.units)

    def can_target(self, u, d, e, rng, attack=True):
        dd = cheb(d, e.pos)
        if dd > rng or dd < 1:
            return False
        if dd >= 2:
            if 'Hidden' in e.st:
                return False
            if VAR['prot'] == 'v2' and e.is_tamer and self.protected(e):
                return False
            # v2 C: only a Flying ATTACKER ignores LOS; v2 ruling: LOS for every enemy-targeted skill
            if not u.flying and not self.los(d, e.pos):
                return False
        return True

    def burst_hits(self, u, upos, cpos, e):
        if cheb(cpos, e.pos) > 1:
            return False
        if 'Hidden' in e.st and cheb(upos, e.pos) >= 2:
            return False
        if VAR['prot'] == 'v2' and e.is_tamer and cheb(upos, e.pos) >= 2 and self.protected(e):
            return False
        return True

    def temp_move(self, u, d):
        if u.pos != d:
            del self.board[u.pos]
            self.board[d] = u
            u.pos = d

    # --- state changes
    def apply_status(self, tgt, name, dur, src=None):
        tgt.st[name] = [dur, tgt.team == self.side, src]

    def check_hidden(self):
        for u in self.units:
            if u.alive and 'Hidden' in u.st and self.terrain(u.pos) != 'forest':
                del u.st['Hidden']

    def end(self, winner, how):
        self.winner, self.decided = winner, how
        raise GameOver

    def kill(self, u):
        u.alive = False
        u.hp = 0
        del self.board[u.pos]
        if self.first_drop is None:
            self.first_drop = u.kind
        self.S['drops'].append((u.kind, u.hits_taken))
        if u.is_tamer:
            self.S['tamer_dead'][u.team] += 1
            self.end(other(u.team), 'tamer')
        if not any(m.alive and not m.is_tamer for m in self.units if m.team == u.team):
            self.end(other(u.team), 'monsters')

    def deal(self, tgt, amt, landed):
        cov = tgt.st.get('Covered')
        if cov and cov[2].alive:
            tgt = cov[2]
            self.S['cover_redirect'] += 1
        tgt.hp -= amt
        if landed:
            tgt.hits_taken += 1
        if tgt.hp <= 0:
            self.kill(tgt)

    def save(self, tgt, stat, dc):
        adv = 1 if 'Blessed' in tgt.st else 0
        tgt.st.pop('Blessed', None)
        ok = self.d20(adv) + tgt.mods[stat] >= dc
        if not ok and self.insp[tgt.team]:
            self.insp[tgt.team] = False
            self.S['insp']['save'] += 1
            ok = self.d20(adv) + tgt.mods[stat] >= dc
        return ok

    def attack(self, att, tgt, skill, counter=False):
        spec = SK[skill]
        phys = spec['roll'] == 'phys'
        dice = att.dice(skill)
        if counter:
            dice = (2, 8) if 'Pincer Guard' in att.skills else (1, 8)
        adv, (ta, td, ea, ed) = self.adv_state(att, tgt, att.pos)
        bonus = att.atk + (1 if 'Rallied' in att.st else 0)
        defense = (tgt.guard if phys else tgt.ward) + self.guard_bonus(tgt)
        nat = self.d20(adv)
        hit = nat == 20 or (nat != 1 and nat + bonus >= defense)
        if not hit and tgt.is_tamer and self.insp[att.team]:
            self.insp[att.team] = False
            self.S['insp']['attack_vs_tamer'] += 1
            nat = self.d20(adv)
            hit = nat == 20 or (nat != 1 and nat + bonus >= defense)
        att.st.pop('Off-balance', None)
        att.st.pop('Blessed', None)
        att.st.pop('Hidden', None)
        att.cmd_adv = False
        S = self.S
        S['n_att'] += 1
        S['terr_adv'] += ta
        S['terr_dis'] += td
        S['elem_adv'] += ea
        S['elem_dis'] += ed
        S['atk_n'][att.kind] += 1
        S['def_n'][tgt.kind] += 1
        if tgt.is_tamer:
            S['tamer_att_adj' if cheb(att.pos, tgt.pos) == 1 else 'tamer_att_far'] += 1
        tprot = tgt.is_tamer and self.protected(tgt)
        if hit and tgt.is_tamer:
            S['tamer_hits'] += 1
            S['tamer_hits_prot'] += tprot
        if hit:
            S['atk_hit'][att.kind] += 1
            S['def_hit'][tgt.kind] += 1
            if dice:
                n, s = dice
                dmg = self.roll(n * (2 if nat == 20 else 1), s) + att.dmg_mod('Counterattack' if counter else skill)
                S['dmg_by'][att.kind] += max(1, min(max(1, dmg), max(0, tgt.hp)))
                self.deal(tgt, max(1, dmg), True)
            if tgt.alive:
                if skill == 'Mark':
                    self.apply_status(tgt, 'Marked', 1)
                elif skill == 'Rend' and not self.save(tgt, VIT, att.dc):
                    self.apply_status(tgt, 'Bleed', 3)
                elif skill == 'Pin' and not self.save(tgt, VIT, att.dc):
                    self.apply_status(tgt, 'Pin', 1)
        if (not counter and tgt.alive and att.alive and 'Countering' in tgt.st
                and cheb(att.pos, tgt.pos) == 1):
            del tgt.st['Countering']
            S['skill']['(Counter triggered)'] += 1
            self.attack(tgt, att, 'Counterattack', counter=True)
        if skill == 'Shield Bash' and hit and tgt.alive and att.alive:
            dr = (tgt.pos[0] - att.pos[0], tgt.pos[1] - att.pos[1])
            q = (tgt.pos[0] + (dr[0] > 0) - (dr[0] < 0), tgt.pos[1] + (dr[1] > 0) - (dr[1] < 0))
            if 0 <= q[0] < N and 0 <= q[1] < N and q not in self.board:
                self.move(tgt, q)
                S['pushes'] = S.get('pushes', 0) + 1
        return hit

    def move(self, u, d, blink=False):
        if d != u.pos:
            if blink:
                self.S['skill']['Blink'] += 1
            self.temp_move(u, d)
            if 'Hidden' in u.st and self.terrain(d) != 'forest':
                del u.st['Hidden']

    def do_action(self, u, act):
        if act is None:
            return
        name, tgt, extra = act
        S = self.S
        S['skill'][name] += 1
        if SK[name]['tier'] == 'major':
            u.cd[name] = self.turn[u.team] + 2
        if name == 'Burst':
            hits = [e for e in self.enemies(u.team) if self.burst_hits(u, u.pos, tgt, e)]
            for e in hits:
                if e.alive and u.alive:
                    self.attack(u, e, 'Burst')
        elif name in ATTACK_SKILLS:
            self.attack(u, tgt, name)
            if name == 'Hit and Run' and extra is not None and u.alive and 'Pin' not in u.st \
                    and extra not in self.board and cheb(extra, u.pos) == 1:
                self.move(u, extra)
        elif name == 'Defend':
            self.apply_status(u, 'Guarded', None, VAR['defend'])
        elif name == 'Shield Wall':
            for a in [u] + [a for a in self.team_units(u.team) if a is not u and cheb(a.pos, u.pos) == 1]:
                if self.guard_bonus(a) < 2:
                    self.apply_status(a, 'Guarded', None, 2)
        elif name == 'Counter':
            self.apply_status(u, 'Countering', None)
        elif name == 'Pack Howl':
            for a in [u] + [a for a in self.team_units(u.team) if a is not u and cheb(a.pos, u.pos) == 1]:
                self.apply_status(a, 'Rallied', 2)
        elif name == 'Taunt':
            if not self.save(tgt, SPI, u.dc):
                self.apply_status(tgt, 'Taunted', 1, u)
        elif name == 'Hex':
            if not self.save(tgt, SPI, u.dc):
                self.apply_status(tgt, 'Weakened', 2)
        elif name == 'Distract':
            if not self.save(tgt, SPI, u.dc):
                self.apply_status(tgt, 'Off-balance', None)
        elif name == 'Camouflage':
            if self.terrain(u.pos) == 'forest':
                self.apply_status(u, 'Hidden', None)
        elif name == 'First Aid':
            tgt.hp = min(tgt.maxhp, tgt.hp + max(0, self.roll(1, 8) + u.mods[SPI]))
        elif name == 'Cover':
            self.apply_status(tgt, 'Covered', None, u)
        elif name == 'Attune':
            self.attune[tgt] = [extra, 3, True, u.team]
            self.check_hidden()

    def command(self, t, m, kind):
        if not m.alive or m.acted or self.turn[t.team] == 1:
            return
        if kind == 'adv':
            m.cmd_adv = True
        else:
            m.cmd_move = True
        self.S['skill']['Command (' + kind + ')'] += 1

    def execute(self, p):
        u = p['unit']
        self.S['activations'] += 1
        if p.get('stunned'):
            u.acted = True
            return
        cmd = p.get('cmd')
        if cmd and cmd[0] == 'start':
            self.command(u, cmd[1], cmd[2])
        if p['order'] == 'mf':
            self.move(u, p['dest'], p.get('blink', False))
            self.do_action(u, p['act'])
        else:
            self.do_action(u, p['act'])
            if u.alive and p['dest'] not in self.board:
                self.move(u, p['dest'], p.get('blink', False))
        if cmd and cmd[0] == 'end' and u.alive:
            self.command(u, cmd[1], cmd[2])
        u.acted = True

    # --- turn structure
    def start_turn(self, side):
        self.side = side
        for u in self.team_units(side):
            for k in UNTIL_NEXT:
                u.st.pop(k, None)
            u.cmd_adv = u.cmd_move = False
            u.acted = False
        for u in self.team_units(side):
            if 'Bleed' in u.st and u.alive:
                d = self.roll(1, 4)
                self.S['bleed_dmg'] += d
                self.deal(u, d, False)

    def end_turn(self, side):
        t = self.tamer(side)
        if t.alive:
            self.S['tamer_turns'] += 1
            self.S['prot_turns'] += self.protected(t)
        for u in self.team_units(side):
            for name in list(u.st):
                rec = u.st[name]
                if rec[0] is None:
                    continue
                if rec[1]:
                    rec[1] = False
                else:
                    rec[0] -= 1
                    if rec[0] <= 0:
                        del u.st[name]
            u.cmd_adv = u.cmd_move = False
        for p in list(self.attune):
            rec = self.attune[p]
            if rec[3] != side:
                continue
            if rec[2]:
                rec[2] = False
            else:
                rec[1] -= 1
                if rec[1] <= 0:
                    del self.attune[p]
        self.check_hidden()

    def deploy(self, team):
        rows = (0, 1) if team == 'A' else (6, 5)
        back, front = rows
        units = sorted(self.team_units(team), key=lambda u: u.is_tamer)
        for u in units:
            best, bs = None, -1e9
            for c in range(N):
                for r in rows:
                    p = (r, c)
                    if p in self.board:
                        continue
                    s = self.rng.random()
                    tm = self.terrain_mod(u, p)
                    s += 3 * tm
                    if u.is_tamer:
                        s += (1.0 if r == back else 0) - 0.3 * abs(c - 3)
                    elif u.maxrng <= 1:
                        s += 1.0 if r == front else 0
                    else:
                        s += 0.5 if r == back else 0
                    if s > bs:
                        best, bs = p, s
            u.pos = best
            self.board[best] = u

    def play(self):
        self.deploy('A')
        self.deploy('B')
        while True:
            ia = self.rng.randint(1, 20) + max(u.mods[AGI] for u in self.team_units('A'))
            ib = self.rng.randint(1, 20) + max(u.mods[AGI] for u in self.team_units('B'))
            if ia != ib:
                break
        first = 'A' if ia > ib else 'B'
        self.first = first
        side = first
        try:
            while not (self.turn['A'] >= 10 and self.turn['B'] >= 10):
                self.turn[side] += 1
                self.start_turn(side)
                n_act = 2 if (side == first and self.turn[side] == 1) else 3
                self.ai[side].take_turn(self, side, n_act)
                self.end_turn(side)
                side = other(side)
        except GameOver:
            pass
        if self.winner is None:
            pct = {}
            for t in 'AB':
                us = [u for u in self.units if u.team == t]
                pct[t] = sum(max(0, u.hp) for u in us) / sum(u.maxhp for u in us)
            self.decided = 'limit'
            self.winner = 'A' if pct['A'] > pct['B'] else 'B' if pct['B'] > pct['A'] else 'draw'
        return self.result()

    def result(self):
        S = self.S
        S.update(winner=self.winner, first=self.first, decided=self.decided, first_drop=self.first_drop,
                 turnsA=self.turn['A'], turnsB=self.turn['B'])
        return S


# ---------------------------------------------------------------- AI
class AI:
    """Greedy one-activation lookahead using expected values.
    mode='greedy' or 'tamer_rush'."""

    def __init__(self, mode='greedy'):
        self.mode = mode
        self.wt = {'tamer_rush': 5.0, 'neutral': 1.0}.get(mode, 2.0)

    # weights
    def w(self, u):
        return self.wt if u.is_tamer else 1.0

    def kb(self, g, u):
        if u.is_tamer:
            return 12.0 if self.mode == 'neutral' else 300.0
        if not any(m.alive and not m.is_tamer and m is not u for m in g.units if m.team == u.team):
            return 300.0
        return 12.0

    @staticmethod
    def wdef(u):
        return 2.0 if u.is_tamer else 1.0

    @staticmethod
    def kbdef(g, u):
        if u.is_tamer:
            return 120.0
        if not any(m.alive and not m.is_tamer and m is not u for m in g.units if m.team == u.team):
            return 60.0
        return 12.0

    # expected value of an attack
    def ev(self, g, att, tgt, skill, att_pos, adv=None, extra_def=0, simple=False, tdis=False):
        spec = SK[skill]
        phys = skill == 'Counterattack' or spec['roll'] == 'phys'
        if adv is None:
            if simple:
                a = d = False
                if not att.is_tamer and not tgt.is_tamer:
                    a = beats(att.el, tgt.el); d = beats(tgt.el, att.el)
                tm = g.terrain_mod(att, att_pos)
                a = a or tm > 0; d = d or tm < 0 or tdis
                adv = 1 if a and not d else -1 if d and not a else 0
            else:
                adv = g.adv_state(att, tgt, att_pos)[0]
        bonus = att.atk + (1 if 'Rallied' in att.st else 0)
        defense = (tgt.guard if phys else tgt.ward) + g.guard_bonus(tgt) + extra_def
        if skill == 'Counterattack':
            n, s = (2, 8) if 'Pincer Guard' in att.skills else (1, 8)
        else:
            n, s = att.dice(skill)
        eff = tgt
        cov = tgt.st.get('Covered')
        if cov and cov[2].alive:
            eff = cov[2]
        return ev_raw(bonus, defense, adv, n, s, att.dmg_mod(skill), max(1, eff.hp))

    def best_ev(self, g, a, e, adv=None, ready_now=True):
        best = 0.0
        for s in a.dmg_skills:
            if ready_now and not g.ready(a, s):
                continue
            if s == 'Burst':
                continue
            best = max(best, self.ev(g, a, e, s, a.pos, adv=adv, simple=adv is None)[0])
        return best

    # threat to unit u standing at d
    def threat(self, g, u, d, extra=0, hidden=False, hp=None):
        prot = g.protected(u, d) if u.is_tamer else False
        key = (u.uid, d, extra, hidden, prot)
        c = self._tc.get(key)
        if c is not None:
            return c
        total = 0.0
        for e in g.enemies(u.team):
            if 'Stun' in e.st:
                continue
            mv = 0 if 'Pin' in e.st else e.move + (1 if e.aquatic and g.terrain(e.pos) == 'water' else 0)
            dd = cheb(e.pos, d)
            if dd > mv + e.maxrng:
                continue
            if (hidden or (prot and VAR['prot'] == 'v2')) and dd > mv + 1:
                continue
            reach = mv + 1 if (prot and VAR['prot'] == 'v2') else None
            best = 0.0
            nxt = g.turn[e.team] + 1
            for s in e.dmg_skills:
                if s == 'Burst':
                    continue
                if e.cd.get(s, 0) > nxt or dd > mv + SK[s]['rng']:
                    continue
                if reach is not None and SK[s]['rng'] > 1 and dd > mv + 1:
                    continue
                best = max(best, self.ev(g, e, u, s, e.pos, extra_def=extra, simple=True,
                                         tdis=prot and VAR['prot'] == 'v3')[0])
            total += best
        self._tc[key] = total
        return total

    def pen(self, g, u, T, hp=None):
        hp = u.hp if hp is None else hp
        pd = min(0.7, max(0.0, (T / hp - 0.4) * 0.7))
        return 0.5 * self.wdef(u) * min(T, hp) + self.kbdef(g, u) * pd

    def pos_value(self, g, u, d):
        key = ('pv', u.uid, d)
        c = self._tc.get(key)
        if c is not None:
            return c
        hidden = 'Hidden' in u.st and g.terrain(d) == 'forest'
        v = -self.pen(g, u, self.threat(g, u, d, hidden=hidden))
        enemies = g.enemies(u.team)
        if u.is_tamer:
            if any(cheb(m.pos, d) <= 3 for m in g.team_units(u.team) if not m.is_tamer and m is not u):
                v += 0.3
        else:
            v += 0.8 * g.terrain_mod(u, d)
            t = g.tamer(u.team)
            if t.alive:
                v -= self.pen(g, t, self.threat(g, t, t.pos))
            r = u.maxrng
            if self.mode == 'tamer_rush':
                et = g.tamer(other(u.team))
                v -= 0.5 * max(0, cheb(d, et.pos) - r)
            elif enemies:
                dmin = min(cheb(d, e.pos) for e in enemies)
                v -= 0.25 * max(0, dmin - r)
        self._tc[key] = v
        return v

    def threat_of(self, g, e):
        """How dangerous enemy e is next turn (weighted by our units it can reach)."""
        best = 0.0
        mv = e.move + 1
        for x in g.enemies(e.team):
            f = 1.0 if cheb(e.pos, x.pos) <= mv + e.maxrng else 0.3
            best = max(best, f * self.wdef(x) * self.best_ev(g, e, x, ready_now=False))
        return best

    def attack_val(self, g, u, d, e, s):
        if s == 'Mark':
            adv = g.adv_state(u, e, d)[0]
            pnc, pc = hit_probs(u.atk + (1 if 'Rallied' in u.st else 0), e.guard + g.guard_bonus(e), adv)
            gain = 0.0
            for a in g.team_units(u.team):
                if a is u or a.acted:
                    continue
                if cheb(a.pos, e.pos) > g.move_points(a) + a.maxrng:
                    continue
                base = g.adv_state(a, e, a.pos)[0]
                new = 0 if base < 0 else 1
                if new != base:
                    gain += self.w(e) * (self.best_ev(g, a, e, adv=new) - self.best_ev(g, a, e, adv=base))
            val = (pnc + pc) * gain
        else:
            exp, pk = self.ev(g, u, e, s, d)
            eff = e
            cov = e.st.get('Covered')
            if cov and cov[2].alive:
                eff = cov[2]
            val = self.w(eff) * exp + pk * self.kb(g, eff)
            if s == 'Shield Bash':
                t = g.tamer(u.team)
                if t.alive and cheb(e.pos, t.pos) == 1:
                    val += 0.5 * self.best_ev(g, e, t, ready_now=False) * self.wdef(t) * 0.5
            if s in ('Rend', 'Pin'):
                adv = g.adv_state(u, e, d)[0]
                pnc, pc = hit_probs(u.atk + (1 if 'Rallied' in u.st else 0), e.guard + g.guard_bonus(e), adv)
                pf = p_fail(e.mods[VIT], u.dc, 1 if 'Blessed' in e.st else 0)
                if s == 'Rend' and 'Bleed' not in e.st:
                    val += (pnc + pc) * (1 - pk) * pf * 2.5 * 2.5 * self.w(e)
                if s == 'Pin':
                    val += (pnc + pc) * (1 - pk) * pf * (2.0 if e.maxrng <= 1 else 1.0)
        if 'Countering' in e.st and cheb(d, e.pos) == 1:
            pk = 0 if s == 'Mark' else self.ev(g, u, e, s, d)[1]
            cexp, cpk = self.ev(g, e, u, 'Counterattack', e.pos)
            val -= (1 - pk) * (self.wdef(u) * cexp + cpk * self.kbdef(g, u))
        return val

    def actions(self, g, u, d, mf):
        out = []
        enemies = g.enemies(u.team)
        allies = [a for a in g.team_units(u.team) if a is not u]
        for s in u.skills:
            if not g.ready(u, s):
                continue
            if s in ATTACK_SKILLS and s != 'Burst':
                rng = SK[s]['rng']
                for e in enemies:
                    if g.can_target(u, d, e, rng, True):
                        v = self.attack_val(g, u, d, e, s)
                        extra = None
                        if s == 'Hit and Run' and mf and 'Pin' not in u.st:
                            pv0 = self.pos_value(g, u, d)
                            bestq, bestv = None, 0.0
                            for q in NB[d]:
                                if q not in g.board:
                                    dv = self.pos_value(g, u, q) - pv0
                                    if dv > bestv:
                                        bestq, bestv = q, dv
                            extra = bestq
                            v += bestv
                        out.append((v, (s, e, extra), (e,)))
            elif s == 'Burst':
                centers = set()
                for e in enemies:
                    for q in WITHIN[(e.pos, 1)]:
                        if cheb(q, d) <= 3:
                            centers.add(q)
                for cpos in centers:
                    if cheb(cpos, d) >= 2 and not u.flying and not g.los(d, cpos):
                        continue
                    tg = [e for e in enemies if g.burst_hits(u, d, cpos, e)]
                    if not tg:
                        continue
                    v = sum(self.attack_val(g, u, d, e, 'Burst') for e in tg)
                    out.append((v, ('Burst', cpos, None), tuple(tg)))
            elif s in ('Taunt', 'Hex', 'Distract'):
                for e in enemies:
                    if not g.can_target(u, d, e, 3, True):
                        continue
                    pf = p_fail(e.mods[SPI], u.dc, 1 if 'Blessed' in e.st else 0)
                    if s == 'Taunt':
                        v = pf * 0.4 * self.threat_of(g, e)
                        if 'Countering' in u.st or g.ready(u, 'Counter'):
                            v += pf * 0.3 * self.ev(g, u, e, 'Counterattack', d)[0] * self.w(e)
                        if e.is_tamer:
                            v += pf * 2.0
                    elif s == 'Hex':
                        if 'Weakened' in e.st:
                            continue
                        # -2 dmg on ~2 of its attacks over 2 turns, weighted by what it threatens
                        if e.is_tamer:
                            continue
                        hitp = 0.65
                        v = pf * 2.0 * 2 * hitp * 1.4
                    else:
                        if 'Off-balance' in e.st:
                            continue
                        v = pf * 0.3 * self.threat_of(g, e)
                    out.append((v, (s, e, None), ()))
            elif s == 'Defend' and mf:
                v = self.pen(g, u, self.threat(g, u, d)) - self.pen(g, u, self.threat(g, u, d, extra=VAR['defend']))
                out.append((v, ('Defend', None, None), ()))
            elif s == 'Shield Wall' and mf:
                v = self.pen(g, u, self.threat(g, u, d)) - self.pen(g, u, self.threat(g, u, d, extra=2))
                for a in allies:
                    if cheb(a.pos, d) == 1 and g.guard_bonus(a) < 2:
                        v += self.pen(g, a, self.threat(g, a, a.pos)) - self.pen(g, a, self.threat(g, a, a.pos, extra=2))
                out.append((v, ('Shield Wall', None, None), ()))
            elif s == 'Counter' and mf and 'Countering' not in u.st:
                v = 0.0
                for e in enemies:
                    if cheb(e.pos, d) <= e.move + 1:
                        pa = 0.35 if e.maxrng <= 1 else 0.1
                        cexp, cpk = self.ev(g, u, e, 'Counterattack', d)
                        v += pa * (self.w(e) * cexp + cpk * self.kb(g, e))
                out.append((v, ('Counter', None, None), ()))
            elif s == 'Pack Howl' and mf:
                v = 0.0
                for a in [u] + allies:
                    if a is u or cheb(a.pos, d) <= 1:
                        if 'Rallied' in a.st:
                            continue
                        e_ = max((self.best_ev(g, a, e, ready_now=False) for e in enemies), default=0)
                        v += 0.05 * e_ * (2 + (1 if (a is not u and not a.acted) else 0))
                out.append((v, ('Pack Howl', None, None), ()))
            elif s == 'Camouflage' and mf:
                if not u.flying and g.terrain(d) == 'forest' and 'Hidden' not in u.st:
                    v = self.pen(g, u, self.threat(g, u, d)) - self.pen(g, u, self.threat(g, u, d, hidden=True))
                    out.append((v, ('Camouflage', None, None), ()))
            elif s == 'First Aid':
                for a in [u] + allies:
                    if a is not u and cheb(a.pos, d) > 1:
                        continue
                    miss = a.maxhp - a.hp
                    if miss <= 0:
                        continue
                    heal = min(4.5 + u.mods[SPI], miss)
                    ap = d if a is u else a.pos
                    T = self.threat(g, a, ap)
                    v = self.pen(g, a, T) - self.pen(g, a, T, hp=a.hp + heal) + 0.3 * heal * self.wdef(a)
                    out.append((v, ('First Aid', a, None), ()))
            elif s == 'Cover':
                Tt = self.threat(g, u, d)
                for a in allies:
                    if a.is_tamer or cheb(a.pos, d) != 1:
                        continue
                    Tx = self.threat(g, a, a.pos)
                    v = self.pen(g, a, Tx) - (self.pen(g, u, Tt + Tx) - self.pen(g, u, Tt))
                    out.append((v, ('Cover', a, None), ()))
            elif s == 'Attune':
                for q in NB[d]:
                    occ = g.board.get(q)
                    if occ is None or occ.is_tamer or occ.flying:
                        continue
                    old = g.terrain_mod(occ, q)
                    if occ.team == u.team:
                        el, delta = occ.el, 1 - old
                        e_ = max((self.best_ev(g, occ, e, ready_now=False) for e in enemies), default=0)
                        wgt = 1.0
                    else:
                        el, delta = BEATER[occ.el], old + 1
                        e_ = max((self.best_ev(g, occ, x, ready_now=False) for x in g.team_units(u.team)), default=0)
                        wgt = 1.0
                    if delta <= 0:
                        continue
                    v = 0.12 * e_ * 2.5 * delta * wgt
                    out.append((v, ('Attune', q, el), ()))
        return out

    def cmd_value(self, g, t, pos):
        best = (0.0, None, None)
        if g.turn[t.team] == 1:
            return best  # v2 B
        enemies = g.enemies(t.team)
        for m in g.team_units(t.team):
            if m.is_tamer or m.acted or 'Stun' in m.st or cheb(pos, m.pos) > 3:
                continue
            mv = g.move_points(m)
            near = [e for e in enemies if cheb(m.pos, e.pos) <= mv + m.maxrng]
            if near:
                gain = 0.0
                for e in near:
                    base = g.adv_state(m, e, m.pos)[0]
                    if base >= 1:
                        continue
                    new = 0 if base < 0 else 1
                    # Command adv still cancels with any disadvantage
                    gain = max(gain, self.w(e) * (self.best_ev(g, m, e, adv=new) - self.best_ev(g, m, e, adv=base)))
                if gain > best[0]:
                    best = (gain, m, 'adv')
            elif mv > 0:
                far = [e for e in enemies if cheb(m.pos, e.pos) <= mv + 1 + m.maxrng]
                if far:
                    v = 0.5 * max(self.best_ev(g, m, e) * self.w(e) for e in far)
                    if v > best[0]:
                        best = (v, m, 'move')
        return best

    def plan(self, g, u):
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
            blinkset = {q for q in WITHIN[(origin, 2)] if q not in g.board and q not in dset}
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
            mind = min(cheb(d, taunter.pos) for d in alld)
            af_dests = [d for d in alld if cheb(d, taunter.pos) == mind]
        else:
            af_dests = alld
        bestd = max(af_dests, key=lambda d: pv[d])
        for v, act, tg in self.actions(g, u, origin, False):
            cands.append((v + pv[bestd], 'af', bestd, act, tg))
        if taunter:
            forced = [c for c in cands if c[3] is not None and c[3][0] in ATTACK_SKILLS and taunter in c[4]]
            if forced:
                cands = forced
            else:
                mind = min(cheb(d, taunter.pos) for d in alld)
                cands = [c for c in cands if cheb(c[2], taunter.pos) == mind
                         and (c[3] is None or c[3][0] not in ATTACK_SKILLS)]
        best = max(cands, key=lambda c: c[0])
        score, order, dest, act, _ = best
        p = dict(unit=u, order=order, dest=dest, act=act, blink=dest in blinkset,
                 gain=score - pv.get(origin, 0.0))
        if u.is_tamer and cmdv.get(dest) and cmdv[dest][1] is not None:
            p['cmd'] = cmdv[dest]
        return p

    def take_turn(self, g, side, n_act):
        acts = 0
        while acts < n_act:
            rem = [u for u in g.team_units(side) if not u.acted]
            if not rem:
                break
            best = None
            for u in rem:
                p = self.plan(g, u)
                if best is None or p['gain'] > best['gain']:
                    best = p
            g.execute(best)
            acts += 1


# ---------------------------------------------------------------- runner / report
CONFIGS = {
    'S1': ('S1', 'plus', 'greedy', 'greedy'),
    'S2': ('S2', 'plus', 'greedy', 'greedy'),
    'S1 rushA': ('S1', 'plus', 'tamer_rush', 'greedy'),
    'S1 rushB': ('S1', 'plus', 'greedy', 'tamer_rush'),
    'S2 rushA': ('S2', 'plus', 'tamer_rush', 'greedy'),
    'S2 rushB': ('S2', 'plus', 'greedy', 'tamer_rush'),
    'S1 neutral': ('S1', 'plus', 'neutral', 'neutral'),
    'S2 neutral': ('S2', 'plus', 'neutral', 'neutral'),
}
for _v in ('T1', 'T2', 'T3', 'T4'):
    CONFIGS[f'S1 {_v}'] = ('S1', 'plus', 'greedy', 'greedy', _v)
    CONFIGS[f'S2 {_v}'] = ('S2', 'plus', 'greedy', 'greedy', _v)
GAMES = {k: 600 for k in CONFIGS if 'neutral' in k or k.split()[-1] in ('T1', 'T2', 'T3', 'T4')}


def run_one(args):
    cfg, seed = args
    scen, hpvar, ma, mb = CONFIGS[cfg][:4]
    set_variant(CONFIGS[cfg][4] if len(CONFIGS[cfg]) > 4 else 'v3')
    g = Game(scen, hpvar, {'A': AI(ma), 'B': AI(mb)}, seed)
    r = g.play()
    r['skill'] = dict(r['skill'])
    for k in ('atk_n', 'atk_hit', 'def_n', 'def_hit', 'insp', 'tamer_dead', 'dmg_by'):
        r[k] = dict(r[k])
    return r


def aggregate(rs):
    n = len(rs)
    A = dict(n=n)
    A['winA'] = sum(r['winner'] == 'A' for r in rs) / n
    A['winB'] = sum(r['winner'] == 'B' for r in rs) / n
    A['draw'] = sum(r['winner'] == 'draw' for r in rs) / n
    A['win_first'] = sum(r['winner'] == r['first'] for r in rs) / n
    A['first_A'] = sum(r['first'] == 'A' for r in rs) / n
    rounds = [max(r['turnsA'], r['turnsB']) for r in rs]
    A['turnsA_mean'] = statistics.mean(r['turnsA'] for r in rs)
    A['turnsB_mean'] = statistics.mean(r['turnsB'] for r in rs)
    A['rounds_mean'] = statistics.mean(rounds)
    A['rounds_median'] = statistics.median(rounds)
    A['limit'] = sum(r['decided'] == 'limit' for r in rs) / n
    A['by_tamer'] = sum(r['decided'] == 'tamer' for r in rs) / n
    A['by_monsters'] = sum(r['decided'] == 'monsters' for r in rs) / n
    A['tamer_first_drop'] = sum(r['first_drop'] == 'Tamer' for r in rs) / n
    A['first_drop'] = dict(Counter(r['first_drop'] for r in rs))
    drops = defaultdict(list)
    for r in rs:
        for k, h in r['drops']:
            drops[k].append(h)
    A['hits_to_drop_obs'] = {k: (statistics.mean(v), len(v)) for k, v in drops.items()}
    an, ah, dn, dh = Counter(), Counter(), Counter(), Counter()
    sk = Counter()
    insp = Counter()
    for r in rs:
        an.update(r['atk_n']); ah.update(r['atk_hit']); dn.update(r['def_n']); dh.update(r['def_hit'])
        sk.update(r['skill']); insp.update(r['insp'])
    A['hit_by_attacker'] = {k: ah[k] / an[k] for k in an}
    A['hit_vs_defender'] = {k: dh[k] / dn[k] for k in dn}
    A['skill_per_game'] = {k: v / n for k, v in sorted(sk.items(), key=lambda x: -x[1])}
    A['insp_per_game'] = {k: v / n for k, v in insp.items()}
    nat = sum(r['n_att'] for r in rs)
    A['terr_adv'] = sum(r['terr_adv'] for r in rs) / nat
    A['terr_dis'] = sum(r['terr_dis'] for r in rs) / nat
    A['elem_adv'] = sum(r['elem_adv'] for r in rs) / nat
    A['elem_dis'] = sum(r['elem_dis'] for r in rs) / nat
    A['attacks_per_game'] = nat / n
    acts = [r['activations'] for r in rs]
    A['activations_mean'] = statistics.mean(acts)
    A['minutes_mean'] = statistics.mean(acts) * 12 / 60
    A['minutes_median'] = statistics.median(acts) * 12 / 60
    A['cover_redirect_per_game'] = sum(r['cover_redirect'] for r in rs) / n
    A['bleed_dmg_per_game'] = sum(r['bleed_dmg'] for r in rs) / n
    dmg = Counter()
    for r in rs:
        dmg.update(r['dmg_by'])
    A['dmg_by_per_game'] = {k: v / n for k, v in dmg.items()}
    th = sum(r['tamer_hits'] for r in rs)
    A['tamer_hits_prot_share'] = sum(r['tamer_hits_prot'] for r in rs) / max(1, th)
    A['tamer_hits_per_game'] = th / n
    A['pushes_per_game'] = sum(r.get('pushes', 0) for r in rs) / n
    A['prot_share'] = sum(r['prot_turns'] for r in rs) / max(1, sum(r['tamer_turns'] for r in rs))
    ta = sum(r['tamer_att_adj'] for r in rs); tf = sum(r['tamer_att_far'] for r in rs)
    A['tamer_att_adj_share'] = ta / max(1, ta + tf)
    A['tamer_attacks_per_game'] = (ta + tf) / n
    A['tamerA_dead'] = sum(r['tamer_dead'].get('A', 0) for r in rs) / n
    A['tamerB_dead'] = sum(r['tamer_dead'].get('B', 0) for r in rs) / n
    A['decided_by_side'] = {f"{w}-{d}": sum(r['winner'] == w and r['decided'] == d for r in rs) / n
                            for w in 'AB' for d in ('tamer', 'monsters', 'limit')}
    return A


MAIN = {'Fangrel': 'Basic Attack', 'Tidewall': 'Basic Attack', 'Wispling': 'Element Bolt',
        'Quillfox': 'Long Shot', 'Tamer': 'Basic Attack'}


def analytic_hits(scen, hpvar, trials=20000, seed=1):
    """Mean landed hits of each opposing monster's main attack to drop a unit from full HP (no adv)."""
    rng = random.Random(seed)
    g = Game(scen, hpvar, {}, 0)
    out = {}
    for t in g.units:
        res = {}
        for a in g.units:
            if a.team == t.team or a.is_tamer:
                continue
            s = MAIN[a.kind]
            n, sd = SK[s]['dice']
            mod = a.dmg_mod(s)
            pnc, pc = hit_probs(a.atk, t.guard if SK[s]['roll'] == 'phys' else t.ward, 0)
            pcrit = pc / (pnc + pc)
            tot = 0
            for _ in range(trials):
                hp, k = t.maxhp, 0
                while hp > 0:
                    k += 1
                    m = 2 if rng.random() < pcrit else 1
                    hp -= max(1, sum(rng.randint(1, sd) for _ in range(n * m)) + mod)
                tot += k
            res[a.kind] = tot / trials
        out[t.kind] = res
    return out


def fmt_report(results, ana):
    L = []
    cfgs = list(results)
    P = lambda x: f"{100 * x:.0f}%"
    kinds = ['Tamer', 'Fangrel', 'Wispling', 'Tidewall', 'Quillfox']
    L.append("### Outcomes\n")
    L.append("| Config | A win | B win | Draw | First-mover win | Rounds mean/median | Turns A / B | 10-turn limit | Tamer first drop | By Tamer kill | By monsters | By limit | Est. minutes |")
    L.append("|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    for c in cfgs:
        A = results[c]
        L.append(f"| {c} | {P(A['winA'])} | {P(A['winB'])} | {P(A['draw'])} | {P(A['win_first'])} | "
                 f"{A['rounds_mean']:.1f} / {A['rounds_median']:.0f} | {A['turnsA_mean']:.1f} / {A['turnsB_mean']:.1f} | "
                 f"{P(A['limit'])} | {P(A['tamer_first_drop'])} | {P(A['by_tamer'])} | {P(A['by_monsters'])} | "
                 f"{P(A['limit'])} | {A['minutes_mean']:.1f} |")
    L.append("\n### Tamer protection / turtling\n")
    L.append("| Config | Tamer turn-ends protected | Attacks on Tamers/game | ...from distance 1 | Tamer A died | Tamer B died | A wins: Tamer/monsters/limit | B wins: Tamer/monsters/limit |")
    L.append("|---|---|---|---|---|---|---|---|")
    for c in cfgs:
        A = results[c]; d = A['decided_by_side']
        L.append(f"| {c} | {P(A['prot_share'])} | {A['tamer_attacks_per_game']:.1f} | {P(A['tamer_att_adj_share'])} | "
                 f"{P(A['tamerA_dead'])} | {P(A['tamerB_dead'])} | "
                 + "/".join(P(d['A-' + k]) for k in ('tamer', 'monsters', 'limit')) + " | "
                 + "/".join(P(d['B-' + k]) for k in ('tamer', 'monsters', 'limit')) + " |")
    L.append("\n### Damage dealt per game (HP actually removed, by attacker type) and Tamer hits\n")
    L.append("| Config | " + " | ".join(kinds) + " | Tamer hits landed/game | ...while protected | Shield Bash pushes/game |")
    L.append("|---" * (len(kinds) + 4) + "|")
    for c in cfgs:
        A = results[c]
        L.append(f"| {c} | " + " | ".join(f"{A['dmg_by_per_game'].get(k, 0):.1f}" for k in kinds)
                 + f" | {A['tamer_hits_per_game']:.1f} | {P(A['tamer_hits_prot_share'])} | {A['pushes_per_game']:.2f} |")
    L.append("\n### First unit to drop\n")
    kinds = ['Tamer', 'Fangrel', 'Wispling', 'Tidewall', 'Quillfox']
    L.append("| Config | " + " | ".join(kinds) + " | none |")
    L.append("|---" * (len(kinds) + 2) + "|")
    for c in cfgs:
        fd = results[c]['first_drop']
        n = results[c]['n']
        L.append(f"| {c} | " + " | ".join(P(fd.get(k, 0) / n) for k in kinds) + f" | {P(fd.get(None, 0) / n)} |")
    L.append("\n### Hits to drop (observed landed hits received by units that dropped; analytic = vs opposing monsters' main attack, no crit adv)\n")
    L.append("| Config | " + " | ".join(kinds) + " |")
    L.append("|---" * (len(kinds) + 1) + "|")
    for c in cfgs:
        h = results[c]['hits_to_drop_obs']
        L.append(f"| {c} obs | " + " | ".join(f"{h[k][0]:.1f}" if k in h else "-" for k in kinds) + " |")
    for key, a in ana.items():
        L.append(f"| {key} analytic | " + " | ".join(
            "/".join(f"{v:.1f}" for v in a[k].values()) for k in kinds) + " |")
    L.append("\n### Observed hit chance (attack rolls made by / against unit type)\n")
    L.append("| Config | " + " | ".join(f"{k} atk" for k in kinds) + " | " + " | ".join(f"vs {k}" for k in kinds) + " |")
    L.append("|---" * (2 * len(kinds) + 1) + "|")
    for c in cfgs:
        A = results[c]
        Q = lambda d, k: P(d[k]) if k in d else "-"
        L.append(f"| {c} | " + " | ".join(Q(A['hit_by_attacker'], k) for k in kinds) + " | "
                 + " | ".join(Q(A['hit_vs_defender'], k) for k in kinds) + " |")
    L.append("\n### Attack modifiers (share of attack rolls with each raw source)\n")
    L.append("| Config | Attacks/game | Terrain adv | Terrain dis | Element adv | Element dis | Bleed dmg/game | Cover redirects/game |")
    L.append("|---|---|---|---|---|---|---|---|")
    for c in cfgs:
        A = results[c]
        L.append(f"| {c} | {A['attacks_per_game']:.1f} | {P(A['terr_adv'])} | {P(A['terr_dis'])} | {P(A['elem_adv'])} | "
                 f"{P(A['elem_dis'])} | {A['bleed_dmg_per_game']:.2f} | {A['cover_redirect_per_game']:.2f} |")
    L.append("\n### Skill uses per game\n")
    allsk = ['Basic Attack', 'Defend', 'Heavy Blow', 'Rend', 'Hit and Run', 'Pack Howl', 'Taunt', 'Shield Bash', 'Shield Wall',
             'Counter', '(Counter triggered)', 'Element Bolt', 'Burst', 'Hex', 'Blink', 'Long Shot', 'Pin', 'Mark',
             'Camouflage', 'Cover', 'Attune', 'First Aid', 'Distract', 'Command (adv)', 'Command (move)']
    L.append("| Skill | " + " | ".join(cfgs) + " |")
    L.append("|---" * (len(cfgs) + 1) + "|")
    for s in allsk:
        L.append(f"| {s} | " + " | ".join(f"{results[c]['skill_per_game'].get(s, 0):.2f}" for c in cfgs) + " |")
    L.append("| Inspiration | " + " | ".join(
        f"{sum(results[c]['insp_per_game'].values()):.2f}" for c in cfgs) + " |")
    return "\n".join(L)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--games', type=int, default=2000)
    ap.add_argument('--only', nargs='*')
    ap.add_argument('--procs', type=int, default=2)
    ap.add_argument('--out', default='/home/claude/sim/results_v3')
    a = ap.parse_args()
    cfgs = a.only or list(CONFIGS)
    results = {}
    import multiprocessing as mp
    with mp.Pool(a.procs) as pool:
        for c in cfgs:
            t0 = time.time()
            ng = min(a.games, GAMES.get(c, a.games))
            rs = pool.map(run_one, [(c, 1000003 * i + 17) for i in range(ng)], chunksize=20)
            results[c] = aggregate(rs)
            print(f"{c}: {ng} games in {time.time() - t0:.0f}s", file=sys.stderr)
    set_variant('v3')
    ana = {'S1': analytic_hits('S1', 'plus'), 'S2': analytic_hits('S2', 'plus')}
    rep = fmt_report(results, ana)
    with open(a.out + '.json', 'w') as f:
        json.dump(dict(results=results, analytic=ana, ambiguities=AMBIGUITIES), f, indent=1, default=str)
    with open(a.out + '.md', 'w') as f:
        f.write(rep)
    print(rep)


if __name__ == '__main__':
    main()
