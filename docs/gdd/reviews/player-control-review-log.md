# Player Control GDD — Review Log

## Review — 2026-05-07 — Verdict: MAJOR REVISION NEEDED → Revised

**Scope signal**: L (multi-system integration, 5+ formulas, PlayerState schema changes, protocol migration)
**Specialists**: game-designer, systems-designer, gameplay-programmer, network-programmer, creative-director
**Blocking items**: 3 → all resolved
**Recommended items**: 7 → all resolved
**Summary**: Three mathematical formula errors (dt double-application, fabricated frame equivalence, missing diagonal normalization) made the GDD unimplementable. Core design tension between "instant response" and "weighty acceleration" was unresolved. All blocking and recommended items addressed in revision pass.
**Prior verdict resolved**: N/A (first review)

### Blocking Items Resolved

| # | Issue | Fix |
|---|-------|-----|
| 1 | F5 dt double-application → frame-rate-dependent movement | Removed `* dt` from F5, clarified dt only in position update |
| 2 | DECEL_RATE=6.0 needs ~73 frames to stop (AC says 3) | Hybrid model: instant 70% drop + exponential decay. DECEL_RATE raised to 15-20 |
| 3 | Missing diagonal normalization → 141% speed exploit | Added input vector normalization step |

### Recommended Items Resolved

| # | Issue | Fix |
|---|-------|-----|
| 4 | "Instant response" vs "weighty feel" contradiction | Hybrid model: frame 0 = 70% maxSpeed (instant) + 30% exponential ramp (weight) |
| 5 | 100ms input buffer too tight | Increased to 150ms (covers ~120ms human anticipatory variance) |
| 6 | speedMultiplier 3.0 ceiling → collision bypass | Ceiling lowered to 2.0 × base |
| 7 | PlayerState missing 5 fields + angle deprecation | Added Schema Changes section with migration strategy |
| 8 | "Phantom ready" blind spot on every skill use | Cooldown sync changed to local-first + server correction |
| 9 | No dt cap for lag spikes | Added dt.max = 50ms clamp |
| 10 | Preview indicator 200ms hold contradicts "invisible control" | Changed to always show range for ready skills |

### Design Decisions Made

- **Acceleration model**: Hybrid (70% instant + 30% exponential ramp) — user confirmed
- **Preview indicator**: Always show for ready skills — user confirmed
- **Input buffer**: 150ms — design review recommendation
- **Speed ceiling**: 2.0 × base — collision safety calculation

## Review — 2026-05-07 — Verdict: NEEDS REVISION → Revised

**Scope signal**: L (multi-system integration, 5+ formulas, PlayerState schema changes, protocol migration)
**Specialists**: game-designer, systems-designer, ux-designer, creative-director
**Blocking items**: 5 → all resolved
**Recommended items**: 12 → deferred to implementation tuning
**Summary**: Second review found 5 new blocking issues: Player Fantasy "< 16ms" contradicted 10Hz architecture; "~3 frames to stop" was mathematically false (actual: ~9 frames); first-frame velocity was ~12% not 70%; hourglass icon timing contradicted buffer window; cursor:none had accessibility issues. All blocking items resolved — simplified acceleration formula (pure exponential approach), corrected frame counts, added cursor accessibility.
**Prior verdict resolved**: Yes (MAJOR REVISION → 3 items, all resolved)

### Blocking Items Resolved

| # | Issue | Fix |
|---|-------|-----|
| B1 | Player Fantasy "< 16ms" vs 10Hz architecture | Restated as "visual < 1 frame, server < 100ms"; added honest caveats to reference games |
| B2 | "~3 frames to stop" mathematically false (actual ~9) | Corrected to ~5 frames with new ACCEL_RATE=50/60; simplified formula |
| B3 | First-frame velocity ~12% not "instant 70%" | Simplified to pure exponential approach: velocity = lerp(velocity, target, factor). Frame 0 = ~55% |
| B4 | Hourglass 100ms vs buffer 150ms + no discard feedback | Icon persists 150ms; red-X flash on discard; connection warning 2s + fade-in |
| B5 | cursor:none accessibility | Added focus-loss recovery + settings toggle; documented in UI section |

### Design Decisions Made

- **Acceleration model**: Simplified exponential approach (pure lerp) — replaces hybrid 70/30 model
- **ACCEL_RATE = DECEL_RATE**: Symmetric feel, halved parameters
- **Per-class rates**: warrior=50, ranger=60, mage=50, cleric=50
- **Reference games**: Kept with honest architectural caveats
- **Cursor**: cursor:none + focus-loss recovery + settings toggle

## Review — 2026-05-07 — Verdict: NEEDS REVISION → Revised (Approved)

**Scope signal**: L (multi-system integration, 5+ formulas, PlayerState schema changes, protocol migration)
**Specialists**: game-designer, systems-designer, ux-designer, network-programmer, creative-director
**Blocking items**: 3 → all resolved
**Recommended items**: 10 → 4 applied, 6 deferred to tuning/implementation
**Summary**: Third review found 3 specification gaps: buffer eviction policy (unspecified), freeze/speed-floor conflict (frozen players would slide), skill rejection rollback (no client reconciliation). All resolved with minimal additions. Recommended revisions included server tick rate documentation (20Hz), fantasy language correction (no client prediction = 50ms position delay), dt cap reframed as hard collision constraint.
**Prior verdict resolved**: Yes (NEEDS REVISION → 5 items, all resolved)

### Blocking Items Resolved

| # | Issue | Fix |
|---|-------|-----|
| B1 | Buffer eviction policy unspecified | Added last-write-wins: new input overwrites existing buffer |
| B2 | Freeze speedMultiplier=0.0 vs speed floor 0.1×base | Clarified: freeze uses blocksMovement only, bypasses speed floor |
| B3 | Skill rejection rollback missing | Added skill:rejected protocol + client rollback (cooldown reset, energy restore, red flash) |

### Recommended Items Applied

| # | Issue | Fix |
|---|-------|-----|
| R1 | Server tick rate not stated | Added "20Hz (50ms tick)" to Overview + pseudocode |
| R2 | dt cap pseudocode placement | Moved to top of simulation block |
| R3 | "Instant response" overpromises | Corrected to "local velocity < 1 frame, position < 1 server tick (~50ms)" |
| R4 | dt cap as collision safety constraint | Reframed: diagonal 31px < 32px tile, hard constraint not just lag protection |

### Design Decisions Made

- **Buffer eviction**: last-write-wins (new input overwrites) — matches player intent
- **Freeze path**: blocksMovement=true only (not speedMultiplier) — prevents 10% creep
- **Skill rejection**: client predicts → server rejects → client rolls back (cooldown + energy + red flash)
- **Server tick**: 20Hz simulation, 10Hz broadcast (explicitly documented)
- **Acceleration visibility**: "weighty feel" local-only; other players see 10Hz interpolated positions (acknowledged in GDD)

## Review — 2026-05-07 — Verdict: NEEDS REVISION (4th review)

**Scope signal**: L (multi-system integration, 5+ formulas, cross-document contradictions, network reliability, UX perception)
**Specialists**: game-designer, systems-designer, network-programmer, ux-designer
**Blocking items**: 10 → all resolved
**Recommended items**: 18 → deferred to implementation tuning
**Summary**: Fourth review revealed three new categories of issues missed in prior reviews: (1) cross-document contradictions with StatusEffects GDD (D1 `* dt` mismatch, speed ceiling 2.0 vs 3.0-5.0), (2) network reliability gaps (Date.now() clock skew breaks cooldown sync and input buffer, missing SkillAccepted protocol, no client prediction timeout), (3) UX perception tensions ("invisible control" vs "weighty feel" contradiction, deceleration animation reads as lag, skill rejection feedback below perception threshold). All 10 blocking items resolved. Additional design change: skill casting hybrid approach (instant skills key-down + AoE skills hold-preview-release) and sprite flip direction resolved to aimAngle.
**Prior verdict resolved**: Yes (Approved → 10 items from 4 specialist domains)

### Blocking Items Resolved

| # | Issue | Fix |
|---|-------|-----|
| B1 | StatusEffects D1 `* dt` vs Player Control F5 — formula unit mismatch | Removed `* dt` from D1, added reference to F5 |
| B2 | StatusEffects G3 speed ceiling range 2.0-5.0 vs Player Control hard cap 2.0 | Changed G3 to hard constraint 2.0 (not tunable) |
| B3 | Collision safety margin 0.89px (2.8%) dangerously thin | Added detailed safety margin analysis + sub-step collision recommendation |
| B4 | `Date.now()` clock skew breaks cooldown sync and input buffer | Switched to `performance.now()` (monotonic) + server `receivedAt` for buffer expiry |
| B5 | `skill:accepted` event referenced but never defined | Defined `SkillAccepted` interface + expanded rejection reasons |
| B6 | No client-side timeout for skill prediction | Added 100ms prediction timeout (auto-rollback) |
| B7 | Player Fantasy "< 1 帧" position claim is false (50-100ms actual) | Restated as "动画 < 1 帧启动，位置 < 1 server tick" |
| B8 | "Invisible control" vs "weighty feel" contradictory goals | Reframed as "透明的重量" — responsive weight with zero intent delay |
| B9 | Deceleration animation (frame interval ×1.5) reads as frame drops | Removed animation slowdown, use dust trails + position deceleration |
| B10 | Skill rejection feedback 100ms below perception threshold | Extended to 250ms flash + 500ms text tooltip |

### Additional Design Changes

| Change | Details |
|--------|---------|
| Skill casting hybrid | Instant skills (Dash etc.) = key-down direct; AoE skills (Meteor etc.) = hold-preview + release-cast |
| Sprite flip direction | Resolved: based on aimAngle (not movement direction) |
| Channeled skills | Documented as future extension: `casting` state in state machine |
| Connection thresholds | Unified: 500ms debug warning, 1s UI indicator, 3s disconnect |

### Design Decisions Made

- **Timestamps**: `performance.now()` (monotonic) for all client-side timing; server sends relative durations, not absolute timestamps
- **Speed ceiling**: 2.0× base is a mathematically derived hard constraint, not a tuning value
- **Skill casting**: Mixed approach — instant skills on key-down, AoE skills on key-up with preview
- **Player Fantasy**: "透明的重量" — weight is intentional feel, not a compromise; animation feedback is immediate, position follows server authority
- **Deceleration visual**: Constant-speed animation + dust trails (not animation slowdown)

## Review — 2026-05-07 — Verdict: NEEDS REVISION → Revised (Approved)

**Scope signal**: L (multi-system integration, cross-document sync with Skills GDD + Combat GDD)
**Specialists**: none (lean mode — single-session analysis)
**Blocking items**: 3 → all resolved
**Recommended items**: 7 → deferred to implementation
**Summary**: Fifth review focused on cross-document consistency. Player Control GDD itself was highly polished after 4 rounds; all 3 blocking items were downstream GDDs not reflecting Player Control's design decisions. Skills GDD used `Date.now()` for cooldown (should be server-authoritative), Dodge Roll direction was undefined relative to aimAngle vs movement, and Combat GDD melee arc center line was unspecified. All resolved via targeted edits to Skills GDD and Combat GDD.
**Prior verdict resolved**: Yes (4th review → 10 items, all resolved)

### Blocking Items Resolved

| # | Issue | Fix |
|---|-------|-----|
| B1 | Skills GDD `Date.now()` cooldown check vs Player Control `performance.now()` | Updated Skills GDD useSkill flow to server-authoritative cooldown + skill:rejected/accepted protocol |
| B2 | Dodge Roll direction undefined (Skills GDD: movement, Player Control: unspecified) | Added Edge Case: Dodge Roll follows movement direction (defensive escape), Dash follows aimAngle (offensive gap-close) |
| B3 | Combat GDD melee arc center line unspecified | Added `player.aimAngle` as arc center reference |

### Design Decisions Made

- **Dodge Roll direction**: Movement direction (not aimAngle) — defensive skill follows escape intuition, consistent with Enter the Gungeon. Dash remains aimAngle-based for offensive gap-closing.
- **Cooldown clock**: Server-authoritative with `performance.now()` client conversion — consistent across all GDDs

### Recommended Items (deferred to implementation)

| # | Issue | Context |
|---|-------|---------|
| R1 | Skills GDD missing AoE targetPos parameter for Arrow Rain/Meteor handlers | Handler signature TBD at implementation |
| R2 | Skills GDD useSkill flow doesn't branch instant vs AoE casting | Documented as note in updated Skills GDD |
| R3 | Input buffer mechanism not in Skills GDD useSkill flow | Documented as note in updated Skills GDD |
| R4 | skill:rejected/accepted protocol not in Skills GDD | Added to useSkill step 5-6 |
| R5 | Prediction timeout (100ms) not in Skills GDD | Deferred to implementation — low risk |
| R6 | Cooldown sync mechanism not detailed in Skills GDD | Added brief note in step 8 |
| R7 | Skills GDD state machine may need update for casting modes | Deferred to implementation
