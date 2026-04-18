---
name: sprite-animator
description: Generate animated pixel art sprites from any image using Gemini API via yunwu.ai proxy. Send a source image, get a 16-frame sprite sheet + GIF.

---

# Sprite Animator

Turn any image into an animated pixel art sprite GIF. Uses Gemini API (yunwu.ai proxy) to create a 16-frame sprite sheet in a single request, then assembles it into an animated GIF.

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

三种模式：预设快捷 / 自定义图片 + 动画类型 / 混合模式

```bash
# 1. 预设快捷 — 内置 prompt + 参考图
PYTHONIOENCODING=utf-8 uv run --with google-genai --with Pillow --with numpy \
  python .claude/skills/sprite-animator/scripts/generate_sprite.py --name slime

# 2. 自定义图片 — 传入任意图片 + 选择动画类型
PYTHONIOENCODING=utf-8 uv run --with google-genai --with Pillow --with numpy \
  python .claude/skills/sprite-animator/scripts/generate_sprite.py \
  --input assets/inbox/my_character.png --animation idle --name my_char

# 3. 混合 — 自定义图片 + 预设 prompt
PYTHONIOENCODING=utf-8 uv run --with google-genai --with Pillow --with numpy \
  python .claude/skills/sprite-animator/scripts/generate_sprite.py \
  --input photo.png --preset slime --name my_slime
```

## CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `--name` | Output sprite name (required) | — |
| `-i, --input` | Input reference image path | 预设图片 |
| `-a, --animation` | Animation type: idle, bounce, wave, dance | idle |
| `-s, --cell-size` | Cell size in px | 256 |
| `-d, --frame-duration` | GIF frame duration in ms | 150 |
| `-r, --resolution` | Generation resolution: 1K, 2K | 1K |
| `--two-step` | Pixelate first, then animate (better for photos) | off |
| `--preset` | Use built-in preset (slime, bat) | — |
| `--output` | Output directory | src/assets/generated |

## Animation Types

| Type | Description |
|------|-------------|
| `idle` | Subtle breathing + blinking loop |
| `bounce` | Crouch → jump → land → recover |
| `wave` | Arm raise → wave back and forth → lower |
| `dance` | Lean, spin, jump — full party mode |

## Tips

- Use `--two-step` for photos of real people — Gemini loses likeness otherwise
- Use `-r 2K` for noticeably better quality
- Use `-d 180` for more natural playback speed (default 150ms is slightly fast)
- Save good base pixel art sprites and reuse them for different animations

## Adding New Presets

在 `scripts/generate_sprite.py` 的 `PRESETS` 字典中添加：

```python
PRESETS["golem"] = {
    "input": "src/assets/0x72/frames/MONSTER/ogre_idle_anim_f0.png",
    "prompt": GOLEM_PROMPT,  # 自定义 prompt
}
```

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
├── SKILL.md                  # 本文档
└── scripts/
    └── generate_sprite.py    # 生成脚本（API调用 + 去背景 + 帧提取 + GIF）
```

## Source

Original tool: https://github.com/Olafs-World/sprite-animator
Modified: yunwu.ai proxy, per-frame bg removal, game integration workflow.
