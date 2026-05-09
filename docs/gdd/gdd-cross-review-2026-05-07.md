# Cross-GDD Review Report
**Date**: 2026-05-07
**GDDs Reviewed**: 9 (all Approved)
**Systems Covered**: Combat, Dungeon Generation, Enemy AI, Items, Progression, Status Effects, Skills, Room Diversity, Player Control

---

## Consistency Issues

### Blocking

**🔴 C1: Damage formula ordering mismatch — combat.md vs status-effects.md** → RESOLVED: combat.md formulas aligned with status-effects.md D2 (multiplier AFTER defense). All 3 formula paths (player→enemy普攻, player→enemy技能, enemy→player) updated.

**🔴 C2: Skill slot count ambiguity — combat.md internal conflict** → FALSE POSITIVE: The "4 shared skills" text is historical context in skills.md line 10 ("替代当前所有职业共享同一组 4 技能"), not a current rule in combat.md. combat.md correctly says "每职业 3 个技能槽". No fix needed.

**🔴 C3: Arena/Maze knob ownership — progression.md vs room-diversity.md** → RESOLVED: progression.md arena/maze parameters replaced with reference to room-diversity.md. Tuning knobs section updated to point to authoritative source.

### Warnings

**⚠️ C4: Boss ATK scaling undocumented in enemy-ai.md formulas section** — buried in table cell only

**⚠️ C5: Drop rate owned by both progression.md and items.md** — items.md is authoritative

**⚠️ C6: Dependency gaps** — room-diversity→status-effects and room-diversity→items not reciprocated

### Clean
- ✅ Arena HP formula chain (room-diversity vs progression) — verified, no double-scaling
- ✅ Speed aggregation chain (player-control F5 ↔ status-effects D1/C6) — compatible
- ✅ All cross-references verified — no stale references
- ✅ Acceptance criteria — no mutually exclusive ACs found

---

## Game Design Issues

### Blocking

**🔴 G1: Gold has zero sinks** → RESOLVED: Added between-floor shop to items.md (HP/energy potions, buff scrolls). 3-4 gold/floor income vs 5-10 gold prices creates meaningful spending decisions.

**🔴 G2: Player stats static vs enemy scaling** → RESOLVED: Added per-floor stat boost to progression.md (+10% ATK, +15% HP per floor cleared). Floor 5: player 1.6× HP / 1.4× ATK vs enemy 1.6× HP / 1.4× ATK — symmetric scaling.

### Warnings

**⚠️ G3: 7-8 concurrent active systems during combat** — exceeds 4-system cognitive load threshold (movement, aiming, cooldowns, status effects, enemy types, hazards, ally positions, fog-of-war)

**⚠️ G4: Boss pacing contradicts "fast-paced" pillar** — 800 HP fixed boss with no player stat scaling = long attrition fight

**⚠️ G5: Enemy AI GDD text vs implementation mismatch** — GDD says "no attack cooldown" but TODO shows it was implemented (P0, done 2026-05-03)

### Clean
- ✅ No dominant strategy detected — all classes have tradeoffs
- ✅ Player fantasy coherence — 4 class fantasies reinforce cooperative identity

---

## Cross-System Scenario Issues

### Warnings

**⚠️ S1: Dash + CC interaction** — iframes (`invulnerable=true`) don't block CC application (`ccImmune` is a separate flag). Stun CAN be applied mid-dash. GDDs don't specify if this is intended. Either add `ccImmune=true` to iframes or document as intentional counterplay.

**⚠️ S2: Boss debuff mechanics undefined** — progression.md mentions "boss applies damage reduction debuff" but enemy-ai.md only defines melee/bullet/slam attacks. No debuff specification exists.

### Info (all clean)
- ✅ Ranger buffer + slow — works correctly
- ✅ Mage freeze + projectile hit — instant skills can't be interrupted
- ✅ War Cry + Meteor combo — valid synergy, correct kill attribution
- ✅ Energy economy — bounded, not degenerate

---

## GDDs Flagged for Revision

| GDD | Reason | Type | Priority |
|-----|--------|------|----------|
| combat.md | Damage formula ordering (C1) + skill slot text (C2) | Consistency | Blocking |
| status-effects.md | Damage formula ordering (C1) | Consistency | Blocking |
| progression.md | Arena/Maze knob ownership (C3) + gold sink (G1) + player progression (G2) | Consistency + Design | Blocking |
| room-diversity.md | Dependency reciprocation (C6) | Consistency | Warning |
| enemy-ai.md | Boss ATK docs (C4) + boss debuff (S2) + GDD text mismatch (G5) | Consistency + Design | Warning |
| items.md | Gold sink design (G1) + drop rate ownership (C5) | Design + Consistency | Blocking |
| skills.md | Dash + CC interaction (S1) | Design | Warning |

---

## Verdict: PASS (after fixes)

All 5 blocking issues resolved:
1. ~~Damage formula ordering~~ → combat.md aligned with status-effects.md (multiplier AFTER defense)
2. ~~Skill slot ambiguity~~ → False positive (historical context in skills.md, not combat.md)
3. ~~Arena/Maze knob ownership~~ → progression.md now references room-diversity.md
4. ~~Gold sink missing~~ → Between-floor shop added to items.md
5. ~~Player stat progression missing~~ → Per-floor stat boost (+10% ATK, +15% HP) added to progression.md

Remaining warnings (non-blocking): Boss ATK docs, drop rate ownership, dependency gaps, attention budget, boss pacing, Dash+CC interaction, boss debuff mechanics.
