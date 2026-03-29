# 精灵/资源使用指南

## Kenney.nl（主要资源）
- **许可**：Creative Commons CC0（可免费商用）
- **网址**：https://kenney.nl/assets
- **原始压缩包**：`resources/kenney/`（8个zip文件）
- **解压资源**：`src/assets/kenney/`（约800+ PNG文件）
- **字体**：`public/fonts/`（12个Kenney像素字体）

## 精灵图规格

### 尺寸
- 单个精灵：16x16 像素
- 间距：1px

### 主要 Spritesheet
| 文件 | 尺寸 | 用途 |
|------|------|------|
| `roguelikeChar_transparent.png` | 918×203 | 角色精灵 |
| `roguelikeDungeon_transparent.png` | 492×305 | 地牢/道具精灵 |
| `roguelikeSheet_transparent.png` | 784×640 | 综合精灵 |

### 精灵索引

**角色 (roguelikeChar)**：
- 0-15：战士、弓箭手、法师、牧师各 4 方向
- 16-24：额外角色变体
- **敌人贴图**：使用索引 16（basic）、20（fast）、24（tank）、34（boss）

**地牢 (roguelikeDungeon)**：
- 0-8：地板（室内设计，不是边缘感知瓦片）
- 9-16：墙壁（带边框的墙砖）
- 17-20：门
- 21-22：宝箱
- 23-24：楼梯
- 29-35：道具（health、coin、key、potion、shield、bullet、energy）

### 相关文件
- 资源索引：`src/assets/kenney/index.ts`
- 精灵加载器：`src/utils/spriteLoader.ts`
- 绘制函数：`src/config/sprites.ts`（`drawDungeonSprite`、`drawCharacterSprite`）

### 精灵计算公式
```
spritesPerRow = floor(sheetWidth / (tileSize + margin))
row = floor(index / spritesPerRow)
col = index % spritesPerRow
x = col * (tileSize + margin)
y = row * (tileSize + margin)
```

## SVG 资源
- 放置在 `src/assets/images/` 目录
- 使用 ES6 import：`import x from './x.svg'`
- 资源组件：`src/components/GameAssets.tsx`、`src/components/PixelSprites.tsx`
