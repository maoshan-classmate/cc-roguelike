# room-diversity.md Review Log

## Review — 2026-05-05 — Verdict: NEEDS REVISION
Scope signal: L
Specialists: game-designer, systems-designer, qa-lead, creative-director (synthesis)
Blocking items: 5 | Recommended: 7 | Nice-to-have: 5
Summary: GDD 骨架扎实（8/8 章节），5 个阻塞项均为局部修复——柱子公式非单调、slow 倍率矛盾、碰撞网格 tile 对齐、法师 trap+elite 致死、9 条不可测试 AC。creative-director 裁决所有阻塞项属"修复成本低、不修成本高"类别，修订后可进入实施。
Prior verdict resolved: First review

### Blocking Items (5)

1. **柱子数公式 `4+(floor%3)` 非单调** (6→4→5) — 替换为 `4+(floor-1)` (5/6/7)
2. **slow trap 倍率 0.5 vs 0.3 矛盾** — 全文统一为 0.3
3. **碰撞网格恢复只修 1 tile** — 添加 tile 对齐约束 (`x%32===0, y%32===0`)
4. **法师 trap+elite 组合秒杀** — 竞技关陷阱间最小距离 128px
5. **9 条 FAIL AC + 12 条缺失 AC** — 重写为 43 条可测试 AC

### Recommended Items (7, non-blocking)

6. direct_exit 优先于 arena_entrance（已实施）
7. TTK 目标 3-5 min tuning knob（已添加）
8. 双重缩放 edge case 警告（已添加）
9. 双 fire trap 重叠秒杀 cleric → 陷阱间最小距离 128px（已实施）
10. 60% "none" 模板比例 → tuning knob 待 playtest
11. 陷阱检测半径 28px → tuning knob 待 playtest
12. 单人玩家竞技关不缩放 → 有意设计

### Specialist Disagreements

- **"第一个玩家决定"优先级**: game-designer 标记 CRITICAL，creative-director 降级为 recommended。解决方案：direct_exit 优先
- **法师脆性**: 两个 specialist 都指向同一问题。解决方案：生成距离约束
- **60% "none" 模板**: game-designer 认为太高，creative-director 定位为 tuning knob

### Revisions Applied

- 柱子公式: `4+(floor%3)` → `4+(floor-1)`
- slow 倍率: 0.5 → 0.3（3 处修复）
- 碰撞网格: 添加 tile 对齐约束
- 陷阱间距: 添加 128px 最小距离
- 路径优先: arena_entrance 优先 → direct_exit 优先
- ATK 缩放表: 新增验证表
- TTK 目标: 新增 tuning knob
- 双重缩放: 新增 edge case
- AC: 34 条 → 43 条（9 条重写 + 12 条新增）
- Status: In Design → In Review

## Review — 2026-05-05 — Verdict: NEEDS REVISION (re-review)
Scope signal: M
Specialists: game-designer, systems-designer, qa-lead, creative-director (synthesis)
Blocking items: 5 | Recommended: 11 | Nice-to-have: 8
Summary: 二次审查发现 5 个新阻塞项——ATK 基础值与 enemy-ai.md 不符、slow 陷阱 StatusManager 架构不匹配、路径选择触发时序鸡生蛋问题、陷阱周期追踪缺少数据结构。creative-director 裁决所有 5 项为正确性问题（非调优），修订后方可实施。附加修复 9 个推荐项（奖励唯一性、Boss 房最小尺寸、陷阱/门数量修正等）。
Prior verdict resolved: Yes (5 prior blocking items fixed)

### Blocking Items (5)

1. **ATK 基础值错误** — fast=10→8, basic=8→5, tank=15→10（与 enemy-ai.md 不符），整个 ATK 缩放表重算
2. **slow_trap 架构不匹配** — apply('slow',...,0.3) 的 value 不影响 speedMultiplier（用定义的 0.5），改为独立 slow_trap 状态类型
3. **路径选择鸡生蛋** — 玩家在 exitPoint 40px 触发生成，envObject 检测也是 40px → 即时触发无选择。改为全敌清除时生成 + 1s 宽限期
4. **同 tick 竞争** — envObject 生成与距离检测同 tick。通过宽限期解决
5. **陷阱周期追踪无数据结构** — EnvObjectState 缺 triggeredEntityIds 字段

### Recommended Items Applied (9)

6. 竞技关专属奖励唯一性约束（不可叠加）
7. Boss 房间最小 224×224px 尺寸保证
8. 陷阱范围 2-4 → 2-3（匹配公式）
9. 门数量 2-4 → 固定 2
10. 奇数柱子中轴说明
11. AC 24 添加"首次进入"限定词
12. Ghost elite 穿柱子有意设计说明
13. 竞技关无 slow 陷阱理由说明
14. ARENA_OFFER 过时引用修正

### Specialist Disagreements

- **"第一个玩家决定"严重度**: game-designer CRITICAL → creative-director RECOMMENDED（设计选择非数据错误）
- **40% 模板率**: game-designer CRITICAL → creative-director RECOMMENDED（tuning knob）
- **Boss 房间宏伟感**: game-designer CRITICAL → creative-director RECOMMENDED（加最小尺寸约束即可）

### Revisions Applied

- ATK 表: fast=8, basic=5, ghost=12, tank=10，所有衍生值重算
- slow_trap: 新增独立状态类型（speedMultiplier=0.3）
- 路径时序: 全敌清除→生成 envObject + 1s 宽限期→检测
- EnvObjectState: 新增 triggeredEntityIds + createdAtMs 字段
- 状态机: 转换表更新（全敌清除→生成路径→玩家选择）
- 竞技关: 门=2, 陷阱=2-3, 柱子奇数中轴
- 奖励: 唯一性约束（不可叠加）
- Boss 房: 最小 224×224px
- Status: In Review → In Review (待四次审查)

## Review — 2026-05-05 — Verdict: NEEDS REVISION (third review, mechanism redesign)
Scope signal: L
Specialists: game-designer, systems-designer, qa-lead
Summary: 三次审查期间用户提出核心机制变更——将"二选一路径选择"改为"概率触发+攻击触发锁门"机制。新机制：Floor 2-4 过渡时 10% 概率进入竞技关（每局最多 1 次），竞技关内敌人处于 dormant 状态（慢速巡逻），出口默认打开，玩家不攻击可直接通过，主动攻击则出口关闭触发 3 波挑战。重写了 Overview、Player Fantasy、状态机转换表、竞技关系统、EnvObjectState（移除 direct_exit/arena_entrance）、20+ AC。保留不变：波次系统、敌人缩放、柱子/陷阱、奖励系统、碰撞机制、Boss 房间视觉。
Prior verdict resolved: N/A (mechanism redesign during review)

### Mechanism Changes

1. **路径选择 → 概率触发**：删除 direct_exit/arena_entrance 双路径系统，改为 FLOOR_TRANSITION 时 10% 随机触发
2. **竞技关内出口默认打开**：玩家可不攻击直接通过（无奖励）
3. **Dormant 敌人**：Wave 1 敌人以 dormant 状态生成（速度×0.3，不追击/不攻击），玩家攻击后激活
4. **门数量**：2 个（入口+出口）→ 1 个（仅出口，默认打开）
5. **每局限制**：arenaTriggered flag 保证最多 1 次竞技关

### Retained from Prior Reviews

- 竞技关房间 (128,96) 768×576（tile 对齐）
- 陷阱数 1+floor（3/4/5 单调递增）
- 陷阱生命周期伪代码
- Status types: power_essence_effect / iron_rune_effect / vitality_crystal_effect
- 奖励唯一性约束
- AC 50 柱子渐进损坏、AC 51 exitPoint 异常

- Status: In Review (待四次审查)

## Review — 2026-05-05 — Verdict: NEEDS REVISION (third review)
Scope signal: L
Specialists: game-designer, systems-designer, qa-lead, creative-director (synthesis)
Blocking items: 6 | Recommended: 7 | Nice-to-have: 4
Summary: 三次审查发现 6 个新阻塞项——竞技关房间几何与 tile 对齐矛盾（112%32≠0）、power_essence/iron_rune 状态类型未在 status-effects.md 定义、陷阱生命周期规范空白、路径 envObject 可能放置在不可行走 tile、AC 内部矛盾（AC 2/4c 重叠 + AC 7/32 门数量冲突）、12 条 FAIL AC。附加修复 7 个推荐项（陷阱数公式改为 1+floor、路径偏移增至 ±48、fire DPS 标注、AC 拆分等）。
Prior verdict resolved: Yes (5 prior blocking items fixed)

### Blocking Items (6)

1. **竞技关房间几何不 tile 对齐** — (112,84) 800×600 → (128,96) 768×576，偏移为 32 倍数
2. **power_essence/iron_rune 状态类型缺失** — Dependencies 和奖励描述更新为正确 typeId
3. **陷阱生命周期未定义** — 新增 spawn→tick→activate→deactivate 完整生命周期伪代码
4. **路径 envObject 放置验证** — 新增可行走 tile 检查 + fallback 扫描逻辑
5. **AC 内部矛盾** — 删除 AC 2（合并到 3c），修复 AC 32 门数量（2-4→2）
6. **12 条 FAIL AC** — 重写为 51 条可测试 AC（12 条重写 + 8 条新增）

### Recommended Items Applied (7)

7. 陷阱数公式: 2+(floor%2) → 1+floor (3/4/5 单调递增)
8. 路径偏移: ±24px → ±48px (检测区不重叠)
9. Fire DPS 标注: 单周期 10.0 + 叠加持续约 13.75
10. AC 7 拆分为 6a-6f
11. 竞技关敌人工厂 AC: 新增 AC 32 禁用 createEnemy()
12. Boss 房 AC 拆分: 37/38 → 37/38a/38b
13. 缺失 AC: 新增 8 条（断线/宽限期边界/波间死亡竞态/工厂约束/击杀归属/奖励唯一性/柱子损坏/exitPoint 异常）

### Revisions Applied

- Arena room: (112,84) 800×600 → (128,96) 768×576
- 中心柱公式: roomX+width/2-16 → Math.floor((roomX+width/2)/32)×32
- 陷阱生命周期: 新增 spawn/tick/activate/deactivate 伪代码
- 路径偏移: ±24px → ±48px + 可行走验证
- Status types: power_essence_effect / iron_rune_effect / vitality_crystal_effect
- 奖励实现: apply() 调用改用 typeId 而非 flag 名
- AC: 43 条 → 51 条（重编号 + 拆分 + 新增）
- Trap count: 2+(floor%2) → 1+floor
- Status: In Review (待四次审查)

## Review — 2026-05-05 — Verdict: APPROVED (fourth review)
Scope signal: M
Specialists: game-designer, systems-designer, qa-lead, creative-director (synthesis)
Blocking items: 8 | Recommended: 5 | Nice-to-have: 3
Summary: 四次审查发现 8 个阻塞项——Floor 触发集内部矛盾（3处说法不一致）、ATK 基础值与代码不符（enemy-ai.md 传播错误值）、dormant 敌人缺少视觉信号、Floor 5 胜利条件变更未标注依赖、AC 重复编号+缺失编号+脆弱前提+混淆测试与行为。creative-director 裁决全部为编辑性修复（~45 min），无设计变更。附加修复 5 个推荐项（TTK 目标修正、陷阱法师脆弱性上下文、竞技关地板色信号、柱子偏移 tile 对齐、dead fields 清理）。多人触发自主性、陷阱 vs 法师、TTK 目标等争议项通过信号增强和 tuning knobs 解决，不需机制重构。
Prior verdict resolved: Yes (6 prior blocking items fixed)

### Blocking Items (8, all editorial)

1. **Floor 触发集统一** — Section 1 `{2,3,4}` → `{1,2,3}`，与 Section 5/AC 5/Overview 对齐
2. **ATK 缩放表重算** — 用 shared/constants.ts 实际值 (basic=8/fast=10/tank=15) 替换 enemy-ai.md 错误值
3. **Dormant 敌人视觉指示器** — 新增紫色睡眠指示器 + 着色差异
4. **Floor 5 胜利依赖标注** — 在 Dependencies 反向验证添加 progression.md 变更说明
5. **AC 重复编号** — 第二个 AC 14 重编号为 15
6. **AC 编号间隙** — AC 15-44 整体重编号为 16-45（填补原 45 空缺）
7. **AC 30(原29) 前提脆弱** — 从依赖特定 seed 改为结构性前提
8. **AC 47 行为化** — 从"单元测试验证"改为可观察行为

### Revisions Applied

- Floor 触发: {2,3,4} → {1,2,3}（2处文本 + 1处位置描述）
- ATK 表: basic=8/fast=10/tank=15 全部重算
- Dormant 视觉: 新增紫色着色 + 睡眠指示器
- Dependencies: progression.md 添加 Floor 5 胜利条件变更说明
- AC: 30 项重编号 + AC 30 改结构性前提 + AC 47 改行为形式
- TTK: 3-5 min → 1-3 min
- 陷阱: 添加法师脆弱性说明
- 柱子: 偏移量 tile 对齐约束
- Dead fields: 移除 detectionRadius/createdAtMs
- Status: In Review → Approved

### Post-Review Note

- `enemy-ai.md` 和 `.claude/rules/game-constants.md` 的 ATK 值 (basic=5/fast=8/tank=10) 与代码 (shared/constants.ts: basic=8/fast=10/tank=15) 不一致，需在实施前同步更新

## Review — 2026-05-05 — Verdict: APPROVED (fifth review, re-review)
Scope signal: L
Specialists: game-designer, systems-designer, qa-lead
Summary: 五次审查（re-review）确认 GDD 骨架扎实（8/8 章节），4th review 的 8 个阻塞项全部已修复。新发现 5 个需修复项——explored tile alpha 内部矛盾（0.3 vs 0.7 两种说法）、slow_trap 持续时间跨 GDD 不一致（2s vs 3s）、enemy-ai 依赖表缺 dormant 行为、竞技关代码（ArenaGenerator.ts 单矩形）与 GDD（同心双层）布局不符、dungeon-generation.md 严重过时。前三项已当场修复，后两项属实施阶段同步问题（以 GDD 为准重建代码）。附加发现：法师竞技关生存性问题（调参解决）、57 条 AC 通过率 60%（34 条通过，23 条需修订/补充）。QA 建议补充 15 条新 AC（wave 2/3 生成、竞技关奖励效果、迷宫死胡同保证等）。
Prior verdict resolved: Yes (all 8 editorial items fixed)

### Fixed Items (3)

1. **explored tile alpha 统一** — "alpha=0.3 显示" → "fog overlay alpha=0.7（地面 30% 可见）"（消除歧义）
2. **slow_trap 持续时间统一** — status-effects.md 3000ms → 2000ms（匹配 room-diversity.md 的 2s）
3. **enemy-ai 依赖表补充** — 新增 dormant 行为硬依赖说明

### Propagated Changes

- dungeon-generation.md: 完整重写，反映 BSP-Enhanced + 4 种生成器
- progression.md: 完整重写，反映迷宫关/竞技关触发路由 + Floor 5 直接 VICTORY

### Implementation Notes (not blocking)

- ArenaGenerator.ts 需重建为 ColosseumGenerator.ts（同心双层布局）
- 法师竞技关生存性：Floor 3 arena Wave 1 DPS 可在 4-6s 内击杀 60HP 法师（调参解决）
- iron_rune 价值偏低：建议 buff 或允许玩家自选奖励
- 57 条 AC 中 34 条通过，需补充 wave 2/3、奖励效果、迷宫死胡同等 AC
- Dash 穿越陷阱的交互未在 GDD 中记录（位置传送绕过检测）
