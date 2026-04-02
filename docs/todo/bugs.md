# TODO — Bug 修复清单

> 详细修复记录。

## 高优先级

### 已修复
- [x] 敌人贴图错误（索引25-28空白 → 角色表16/20/24/34）
- [x] 地板/墙壁不对齐（精灵边框接缝 → fillRect像素风格）
- [x] 背景网格消失（添加 import.meta.env.DEV 叠加层）
- [x] 走廊不可见（添加 corridorTiles 协议）
- [x] 敌人穿墙（isWalkable()空网格返回false）
- [x] 碰撞网格空数组危险fallback
- [x] 房间玩家列表显示问题 — 2026-03-29 E2E验证通过
- [x] 角色贴图偶尔看不见 — 2026-03-29 修复onerror/naturalWidth检查
- [x] 角色移动速度过快 — 2026-03-29 改用CLASS_SPEED(180-220px/s)
- [x] 角色技能无法释放 — 2026-03-29 4技能槽位+skillId匹配
- [x] 四种职业都远程子弹攻击 — 2026-03-29 class→weapon映射(warrior=sword)
- [x] 角色子弹贴图不匹配 — 2026-03-29 按characterType区分子弹颜色+发光
- [x] 怪物寻路卡墙角 — 2026-03-29 isWalkableRadius+随机偏移避障
- [x] 角色/怪物移动无过渡动画 — 2026-03-29 客户端lerp插值
- [x] 副本网格太小 — 2026-03-29 1024×768(32×24 tiles)
- [x] 怪物贴图错误 — 2026-03-29 roguelikeSheet正确索引(1671/1721/1648/1725) + drawSheetSprite()
- [x] 当鼠标移动到左右两边时，角色贴图会消失 — 2026-03-29 改为front/back+Canvas翻转，修复空白索引引用
- [x] 怪物贴图不像怪物 — 2026-03-29 资源审计后替换为roguelikeSheet正确索引(史莱姆1671/蝙蝠1665/骷髅1648/恶魔1668)
- [x] 角色武器贴图与设定不符合 — 2026-03-29 子弹颜色按职业区分(warrior金/ranger蓝/mage紫/cleric绿)
- [x] 角色使用1-4任意一个技能之后，游戏卡死且技能无效果 — 2026-03-29 4技能槽位修复
- [x] 角色死亡之后，游戏没有任何提示 — 2026-03-29 40%透明精灵+"☠ 已阵亡"红色文字标记
- [x] 地板颜色丑陋+网格不可见 — 2026-03-29 石褐色色系+网格线色差30+阶，tile级碰撞网格渲染
- [x] 墙壁密度/位置不对 — 2026-03-29 改用collisionGrid逐tile渲染，视觉=物理边界
- [x] 怪物穿墙 — 2026-03-29 碰撞半径按敌人类型分配(basic:16/fast:14/tank:20/boss:28)
- [x] 角色身上有一个白色棍子，确认是什么东西。如无必要需要移除.如有必要，需要用0x72的资源去替换。因为这个武器看不出是什么东西。 — 2026-03-29 根因：drawDirectionArrow 白色12px方向指示器叠加在玩家头顶，已移除该绘制调用（GamePage.tsx）；废弃 PixelSprites/GameAssets/images 目录已清理
- [x] 职业选择法师，无法进行游戏。职业选择游侠和牧师，攻击方式完全相同。 — 2026-03-29 handleSelectClass 同时更新 lobby 内存，handleRoomStart 优先读内存；cleric 武器改为 staff
- [x] 角色技能只有1可用，234技能都不可用。且没有明显的交互反馈和冷却提示。 — 2026-03-29 DB DEFAULT 改为4技能，GameRoom skill fallback 补齐旧角色
- [x] 角色死亡后没有弹窗。 — 2026-03-29 GameRoom update() 加全灭检测，设置 _gameOver 触发 game:end
- [x] 角色图标过小，攻击范围与实际图标大小不符。 — 2026-03-29 SPRITE_REGISTRY CHARACTER size 32→48（atlas原始16px，scale=3x放大到48px使角色在768px canvas中清晰可见）；PLAYER_BASE.radius 保持 20；白色棍子 drawDirectionArrow 已移除
- [x] 第二次进入游戏角色高速瞬移 — 2026-03-29 GameRoom tick 残留 + session 过滤失效，详见 docs/bugs/2026-03-29-second-entry-teleport.md；修复：handleRoomLeave/disconnect 清理 GameRoom，handleExit 重置 session refs，简化 game:state 过滤逻辑
- [x] 贴图资产三文件不一致 — 2026-03-29 审计发现 cleric 武器贴图错误（weapon_knight_sword→weapon_red_magic_staff）；移除 pumpkin_dude_kenney 和 bullet_kenney 两个死代码条目；sprites.ts/sprite-inventory.md/sprite-viewer.html 三文件同步修正
- [x] 页面没有做自适应 — 2026-04-01 viewport meta添加maximum-scale=1，body overflow:hidden→overflow-x:hidden，LoginCard width 360→90%/maxWidth，Lobby弹窗width 400→90%/maxWidth，添加@media响应式断点(768px/480px)
- [x] 用户登录之后，登录失效后应该回到登录页面 — 2026-04-01 server: token无效时主动emit auth:error；client: AuthErrorHandler组件监听auth:error并调用logout()+navigate('/login')
- [x] 角色攻击时，武器没有攻击动作，只有简单的平移。 — 2026-04-01 drawWeaponSprite() 增加 isMelee 参数，攻击时切换 weapon_anime_sword 挥砍帧；SPRITE_REGISTRY 添加 weapon_anime_sword 注册
- [x] 角色贴图和武器贴图的位置不自然。 — 2026-04-01 drawWeaponSprite() 偏移系数 0.2→0.3（握柄偏右30%于玩家中心），isMelee 近战专用挥砍帧
- [x] 在房间里，玩家切换职业后并没有正常显示。 — 2026-04-01 SocketServer.handleSelectClass 添加 room:player:update 广播；RoomPage 监听事件并调用 setPlayerCharacterType 更新其他玩家职业显示
- [x] 怪物遇到障碍物之后就一直顶着障碍物了，避障有问题。 — 2026-04-01 GameRoom.updateEnemy() stuck 分支改为 8 方向逃逸尝试（±90°/±45°/±135°/180°/0°），而非只试一个垂直方向
- [x] 有的时候角色可以穿墙。 — 2026-04-01 GameRoom.handlePlayerInput() 碰撞检测从 isWalkable 单点改为 isWalkableRadius(player, 16) 5点检测，与敌人一致
- [x] 角色、怪物、场景贴图不匹配，需要参考贴图资产三文件重新选择，此外，完全废弃kenney相关贴图资产，与游戏主题不符 — 2026-04-02 P9团队E2E验证通过：零sprite错误，10条kenney死代码已清除，floor_stairs改为SPRITE_REGISTRY动态查找，weapon_anime_sword三文件同步
- [x] 贴图资产三文件里面要删除kenney相关贴图资产，项目里面Kenney的相关资源也都要删除。 — 2026-04-02 Kenney目录已物理删除，src/assets/kenney/不存在，sprites.ts无kenney导入，GamePage.tsx/priteLoader.ts残留引用已修复
- [x] 贴图资产三文件里面的角色精灵图引用遗漏。举个例子：战士knight目前只引用了knight_m_idle_anim_f0、knight_m_idle_anim_f1，但是knight_m_idle_anim_f2、knight_m_idle_anim_f3、knight_f_idle_anim_f0未被引用，其他资源也是一样。 — 2026-04-02 28条registry条目已补全（idle f2/f3×8 + run f0-3×16 + hit×4），characters.ts spriteName改为4帧数组，useGameRenderer.ts适配，tsc零error
- [x] 目前游戏是打完当前关卡的怪物就自动进入下一层，应该是进入floor_stairs才到达下一层 — 2026-04-02 GameRoom.checkFloorCompletion()改为exitPoint碰撞检测（exitRange=40px）触发下一层
- [ ] 【**重新打开**】 房间中选择角色时，玩家左侧的职业图标与选择职业下面的职业图标不一致（以玩家左侧的职业图标为准） — 2026-04-02 PixelPlayerSlot avatarComponents加入PixelStar，mage/cleric图标正确显示；2026-04-02 根因修复：PixelPlayerSlot传入selectedClass prop，本地玩家直接用selectedClass（响应式）而非player.characterType（Zustand异步），tsc零error，E2E验证通过
- [x] 房间中多次变更职业，但是进入游戏后职业变更没有生效。
- [x] 游戏失败后选择返回房间，房间里面玩家信息丢失。
- [ ] 
## 中优先级

- [x] 多人游戏结束后回到房间，其他玩家在大厅里面无法找到那个房间。 — 2026-04-01 根因：endGame()删除房间+getAllRooms()过滤waiting+endGame从未被调用；修复：LobbyManager新增resetRoom()方法将房间重置为waiting状态，SocketServer.startStateBroadcast在game:end时调用resetRoom并广播lobby:list更新；E2E验证：playerb返回大厅房间列表自动显示无需刷新
- 
## 低优先级


