# Playwright MCP 工具

## 常用命令

| 功能 | 命令 |
|------|------|
| 导航 | `browser_navigate` |
| 点击 | `browser_click` |
| 输入 | `browser_type` |
| 截图 | `browser_take_screenshot` |
| 快照 | `browser_snapshot` |
| 等待 | `browser_wait_for` |
| 控制台 | `browser_console_messages` |
| 评价 | `browser_evaluate` |

## 工作流

1. **下载资源**：`browser_navigate` + `browser_click`
   - 下载文件默认保存到 `.playwright-mcp/` 目录

2. **验证 UI 改动**：
   ```
   browser_navigate → browser_click（触发操作）→ browser_take_screenshot
   ```

3. **验证完成后**：必须删除截图文件
   ```bash
   rm -f *.png
   ```

## 示例：游戏流程验证
1. 登录 → 创建房间 → 选择职业 → 准备 → 开始冒险
2. 截图存档确认渲染正确
