---
name: sync-sprite
description: 新增/修改贴图资产时，自动同步三文件（sprites.ts + sprite-inventory.md + sprite-viewer.html）
---

# Sync Sprite — 贴图资产三文件同步执行工具

> 铁律：三个文件必须完全一致。违反即为 3.25。
>
> **职责定位**：sync-sprite 是**执行者**（修改文件），sprite-audit 是**审查者**（只读检查）。两者协同工作，审查发现 → 执行修复。

## ⚠️ 执行公告（强制，不可跳过）

Skill 被触发时，**必须**在执行任何操作之前向用户输出以下公告：

```
╔══════════════════════════════════════════════════╗
║ [SKILL] sync-sprite 已触发                        ║
╠══════════════════════════════════════════════════╣
║ 功能: 贴图资产三文件原子同步                       ║
║ 操作: {add/update/remove}                         ║
║ 目标: {sprite名称}                                ║
║ 状态: 正在同步三文件...                            ║
╚══════════════════════════════════════════════════╝
```

每个文件修改后输出：
- `📝 [SKILL:sync-sprite] 已更新: {文件名} ✓`
- 验证时输出：`✅ [SKILL:sync-sprite] 三文件验证通过` 或 `❌ [SKILL:sync-sprite] {文件名} 缺失条目`

## 使用场景

- 新增 sprite 到 SPRITE_REGISTRY
- 修改已有 sprite 的 source/atlasKey/category
- 删除废弃 sprite

## 执行流程

### Step 1: 收集参数

需要用户提供以下信息（或从上下文推断）：

| 参数 | 必需 | 说明 |
|------|------|------|
| name | ✅ | sprite 名称，如 `knight_m_idle_anim_f0` |
| source | ✅ | `kenney` 或 `0x72` |
| atlasKey | ✅ | Kenney 索引号 或 0x72 atlas 坐标 |
| category | ✅ | CHARACTER/MONSTER/WEAPON/ITEM/SCENE/UI |
| size | ✅ | 精灵尺寸，默认 16 |
| animated | ✅ | 是否动画 |
| frameCount | ✅ | 帧数（静态=1） |
| action | ✅ | add / update / remove |

### Step 2: 用户确认（强制——参数收集后必须停顿）

**参数收集完成后，禁止直接进入 Step 3。必须向用户确认以下内容：**

```
╔══════════════════════════════════════════════════╗
║ [SKILL:sync-sprite] Step 2 — 参数确认          ║
╠══════════════════════════════════════════════════╣
║ 操作: {action}                                  ║
║ 目标: {name}                                    ║
║ source: {source} | category: {category}         ║
║ atlasKey: {atlasKey} | size: {size}            ║
║ animated: {animated} | frameCount: {frameCount}║
║                                                    ║
║ 即将修改: sprites.ts + inventory.md + viewer      ║
╚══════════════════════════════════════════════════╝
```

向用户确认后才进入 Step 3。如果用户说「取消」，skill 在此结束。

### Step 3: 执行同步修改

**按以下顺序修改三个文件**：

#### 3.1 `src/config/sprites.ts`

在 `SPRITE_REGISTRY` 中添加/修改/删除对应条目。

格式：
```typescript
'sprite_name': {
  category: SpriteCategory.CHARACTER,
  source: '0x72',
  atlasKey: 'sprite_name',
  size: 16,
  animated: true,
  frameCount: 4
},
```

#### 3.2 `docs/sprite-inventory.md`

在对应 category 分区添加/修改/删除条目。

格式：
```markdown
| sprite_name | 0x72 | atlasKey值 | CHARACTER | 16 | 4帧动画 | `src/config/characters.ts` |
```

#### 3.3 `sprite-viewer.html`

在对应 category 的 JavaScript 数组中添加/修改/删除条目。

格式与 sprites.ts 一致。

### Step 4: 验证

```bash
# 三文件必须同时出现
grep "sprite_name" src/config/sprites.ts docs/sprite-inventory.md sprite-viewer.html
```

如果三文件都有匹配，同步成功。
如果任一文件缺失，**立即修复后再验证**。

### Step 5: 编译检查

```bash
npx tsc --noEmit
```

## 注意事项

- **三文件修改必须原子完成**——不能改了一个就停下
- **验证不通过不停手**——grep 发现缺失立即补
- **删除操作需额外确认**——先检查代码引用，确认零引用才删
