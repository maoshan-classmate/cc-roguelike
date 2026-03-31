# Bug: 创建房间后无法往下滑动

**发现时间**: 2026-03-31
**优先级**: P2
**状态**: 修复中

## 复现步骤
1. 进入 LobbyPage
2. 点击创建房间
3. 进入 RoomPage（房间页面）
4. 尝试往下滑动查看更多内容

## 预期行为
页面内容应该可以滚动

## 实际行为
无法滚动，内容被截断

## 相关代码
- `src/pages/RoomPage.tsx` - 房间页面
- `src/pages/LobbyPage.tsx` - 大厅页面（导航来源）

## 根因分析

**文件**: `src/pages/RoomPage.tsx` 第 292-298 行

**问题**: 外层容器 `div` 设置了 `minHeight: '100vh'` 但没有设置滚动属性 `overflow-y: auto`，导致内容超出视口时无法滚动。

```tsx
// 修复前
<div style={{
  minHeight: '100vh',
  padding: 20,
  background: 'var(--pixel-bg)',
  position: 'relative',
}}>

// 修复后
<div style={{
  minHeight: '100vh',
  padding: 20,
  background: 'var(--pixel-bg)',
  position: 'relative',
  overflowY: 'auto',  // ← 新增
}}>
```

## 修复记录
- [x] 2026-03-31: 添加 `overflow-y: auto` 样式
- [x] 2026-03-31: `npx tsc --noEmit` 编译通过
