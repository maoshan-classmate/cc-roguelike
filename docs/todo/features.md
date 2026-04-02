# TODO — 功能待办

## 高优先级
- [x] 当前怪物的精灵图完全看不出是怪物 — 2026-03-29 集成 0x72 TilesetII暗黑风格怪物精灵（goblin/skelet/big_demon）+ 统一 Sprite Registry
- [x] 需要添加一个关卡调试模式（如：跳关、角色无敌、一键杀死当前关卡所有怪物），方便你调试游戏逻辑 — 2026-04-02 DebugMenu组件（按D键 DEV模式显示）+ handleDebugCommand()服务端接口，支持跳关/无敌/清怪
## 中优先级
- [ ] 添加更多武器类型
- [ ] 添加更多技能
- [ ] 完善地牢生成算法
- [ ] 添加商店系统
- [ ] 没有怪物图鉴系统
- [ ] 没有完善的职业系统
## 低优先级
- [ ] 添加音效
- [ ] 添加好友系统
- [ ] 添加成就系统
- [ ] 利用 roguelikeSheet_transparent.png 第三张精灵图增加更多精灵种类

## 已完成

- [x] 用户注册/登录
- [x] 创建房间
- [x] 加入房间
- [x] 房间准备逻辑
- [x] 多人 Socket 连接
- [x] 地牢程序生成
- [x] 战斗系统基础
- [x] 弹幕系统
- [x] GameRoom.update() 游戏循环修复
- [x] UI 图标全面替换为像素 SVG
- [x] 全面 UI 优化：Tailwind CSS + 像素字体 + 消除所有 emoji/Unicode
- [x] Canvas 像素艺术风格血条/皇冠/箭头/名称标签
- [x] 统一 Sprite Registry（Kenney+0x72）— sprites.ts 重构，src/config/sprites.ts 为单一数据源，GamePage.tsx 渲染路径接入
