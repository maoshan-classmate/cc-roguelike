---
name: sprite-animator
description: Generate animated pixel art sprites from any image using Gemini API via yunwu.ai proxy. Send a source image + prompt, get a 16-frame sprite sheet + GIF.

---

# Sprite Animator

通用像素动画精灵生成工具。传入任意参考图片 + prompt，输出 16 帧 sprite sheet + GIF。

**核心原则：脚本是通用模板，不需要为每个怪物修改。** 所有怪物特定的内容（prompt、参考图）都通过 CLI 参数传入。

## API Configuration

Credentials are stored in project root `.env` (not committed to Git):

```
GEMINI_PROXY_BASE_URL=https://yunwu.ai
GEMINI_API_KEY=<your-key-here>
GEMINI_MODEL=gemini-3-pro-image-preview
```

The script auto-loads `.env` — no manual export needed.

## Prerequisites

```bash
uv run --with google-genai --with Pillow --with numpy python -c "from google import genai; print('OK')"
```

## Usage

### 标准用法：`--input` + `--prompt` + `--name`（推荐）

```bash
PYTHONIOENCODING=utf-8 uv run --with google-genai --with Pillow --with numpy \
  python .claude/skills/sprite-animator/scripts/generate_sprite.py \
  --input src/assets/0x72/frames/MONSTER/necromancer_anim_f0.png \
  --prompt "Fill this EXACT 4x4 sprite sheet grid (16 cells, read left-to-right, top-to-bottom). Each cell must be a PERFECT SQUARE. The output image MUST be square (1024x1024). Draw a pixel art GHOST WRAITH monster. 16x16 pixel art style, retro game aesthetic, dark dungeon theme. The ghost is a floating spectral figure: translucent deep purple body (#8060C0 core, lighter edges), two glowing white eyes, tattered dark robes trailing into mist at the bottom, NO legs. The ghost MUST fill at least 80% of each cell. This is an IDLE animation loop: Row 1: hovering -> float up -> center -> float down. Row 2: sway left -> center -> sway right -> center. Row 3: body pulse expand -> contract -> rest -> rest. Row 4: eye glow brighten -> dim -> bob -> rest. CRITICAL: Same colors, size, position across ALL 16 frames. ONLY the specified movement changes. Solid dark background (#1A1210) in ALL cells. OUTPUT MUST BE A SQUARE IMAGE." \
  --name ghost
```

### 快捷用法：`--animation`（通用动画 prompt）

```bash
PYTHONIOENCODING=utf-8 uv run --with google-genai --with Pillow --with numpy \
  python .claude/skills/sprite-animator/scripts/generate_sprite.py \
  --input photo.png --animation idle --name my_char
```

### 内置预设（示例，仅 slime/bat）

```bash
PYTHONIOENCODING=utf-8 uv run --with google-genai --with Pillow --with numpy \
  python .claude/skills/sprite-animator/scripts/generate_sprite.py --name slime
```

> `slime` 和 `bat` 是项目初期创建的示例预设，展示脚本能力。**生成新怪物不需要添加预设，直接用 `--prompt`。**

## CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `--name` | Output sprite name (required) | — |
| `-i, --input` | Input reference image path | — |
| **`-p, --prompt`** | **Custom prompt string — 生成新精灵的主要方式** | — |
| `-a, --animation` | Animation type: idle, bounce, wave, dance | idle |
| `-s, --cell-size` | Cell size in px | 256 |
| `-d, --frame-duration` | GIF frame duration in ms | 150 |
| `-r, --resolution` | Generation resolution: 1K, 2K | 1K |
| `--two-step` | Pixelate first, then animate (better for photos) | off |
| `--preset` | Built-in preset (slime, bat — 示例用) | — |
| `--output` | Output directory | src/assets/generated |

## Prompt 撰写指南

写一个好的 prompt 是生成质量的关键。必须包含以下要素：

1. **Grid 约束** — "Fill this EXACT 4x4 sprite sheet grid... Each cell must be a PERFECT SQUARE. Output MUST be square (1024x1024)."
2. **怪物外观** — 形状、颜色（给 hex 值）、特征（眼睛/角/尾巴等）
3. **填充率** — "MUST fill at least 80% of each cell"（防止生成太小）
4. **逐帧动画描述** — 4 行 × 4 帧，描述每帧动作
5. **一致性约束** — "Same colors, size, position across ALL 16 frames"
6. **背景色** — "Solid dark background (#1A1210) in ALL cells"

### 参考：0x72 可用参考图

| 参考图 | 适合生成的怪物类型 |
|--------|-----------------|
| `MONSTER/necromancer_anim_f0.png` | 法师/幽灵/亡灵类 |
| `MONSTER/masked_orc_idle_anim_f0.png` | 兽人/战士/盔甲类 |
| `MONSTER/orc_warrior_idle_anim_f0.png` | 近战格斗类 |
| `MONSTER/wogol_idle_anim_f0.png` | 两栖/毒物类 |
| `MONSTER/chort_idle_anim_f0.png` | 恶魔/火焰类 |
| `MONSTER/ogre_idle_anim_f0.png` | 巨型/重型类 |
| `MONSTER/tiny_zombie_idle_anim_f0.png` | 亡灵/群体系 |
| `MONSTER/imp_idle_anim_f0.png` | 飞行/小型类 |

路径前缀：`src/assets/0x72/frames/`

## Animation Types

| Type | Description |
|------|-------------|
| `idle` | Subtle breathing + blinking loop |
| `bounce` | Crouch → jump → land → recover |
| `wave` | Arm raise → wave back and forth → lower |
| `dance` | Lean, spin, jump — full party mode |

## Tips

- **`--prompt` 是推荐方式**，不需要修改脚本文件
- Use `--two-step` for photos of real people — Gemini loses likeness otherwise
- Use `-r 2K` for noticeably better quality
- Use `-d 180` for more natural playback speed (default 150ms is slightly fast)
- Prompt 里强调 "SQUARE" 和 "80% fill" 可以避免尺寸/填充率问题

## Output

所有生成结果输出到 `src/assets/generated/`：

| 文件 | 说明 |
|------|------|
| `{name}_sheet.png` | 4x4 sprite sheet (1024x1024)，背景已自动透明化 |
| `{name}.gif` | 16帧 GIF (32x32) |
| `{name}_frames/` | 16 个独立帧 PNG |

脚本内置了**逐帧背景透明化**（per-frame dominant color detection + threshold alpha=0），生成后无需手动去背景。

## Game Integration (Optional)

生成的精灵**不一定需要立即集成到游戏**。可以先作为备用素材存储在 `src/assets/generated/`。

需要集成时，按顺序执行：

1. **`src/config/generatedSprites.ts`** — 在 `GENERATED_SPRITES` 中注册新精灵
2. **`src/config/sprites.ts`** — 在 `SPRITE_REGISTRY` 中添加条目（`source: 'generated'`）
3. **`src/config/enemies.ts`**（如果是敌人）— 设置 `spriteName` 指向注册名
4. **`npx tsc --noEmit`** — 编译验证零 error
5. **`/sprite-audit`** — 三文件同步审查
6. **`npm run dev`** — 运行时验证精灵渲染正确

## Skill Structure

```
.claude/skills/sprite-animator/
├── SKILL.md                  # 本文档（通用工具说明）
└── scripts/
    └── generate_sprite.py    # 通用生成模板（API调用 + 去背景 + 帧提取 + GIF）
```

> 脚本中的 `slime`/`bat` 预设仅作示例参考。生成新怪物使用 `--prompt` 参数，脚本无需修改。

## Source

Original tool: https://github.com/Olafs-World/sprite-animator
Modified: yunwu.ai proxy, per-frame bg removal, `--prompt` CLI support, game integration workflow.
