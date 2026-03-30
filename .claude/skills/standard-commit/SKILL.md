---
name: standard-commit
description: 按项目规范执行 git commit（tsc 先行、单次一事、格式正确）
disable-model-invocation: true
---

# Standard Commit — 规范化提交

> 提交规范不是形式主义，是回滚和追溯的抓手。

## ⚠️ 执行公告（强制，不可跳过）

Skill 被触发时，**必须**在执行任何操作之前向用户输出以下公告：

```
╔══════════════════════════════════════════════════╗
║ [SKILL] standard-commit 已触发                    ║
╠══════════════════════════════════════════════════╣
║ 功能: 规范化 Git 提交                              ║
║ 步骤: tsc门禁 → 变更分析 → 生成message → 提交    ║
║ 状态: 正在执行 Step 1 编译检查...                  ║
╚══════════════════════════════════════════════════╝
```

每个步骤输出状态：
- `🔍 [SKILL:standard-commit] Step 1: tsc 编译 — {通过/失败}`
- `📊 [SKILL:standard-commit] Step 2: 变更分析 — {N} 个文件, 类型: {type}`
- `📝 [SKILL:standard-commit] Step 3: message = "{commit message}"`
- `✅ [SKILL:standard-commit] Step 5: 提交成功` 或 `❌ [SKILL:standard-commit] 提交被阻止: {原因}`

## 执行流程

### Step 1: 编译检查（前置门禁）

```bash
npx tsc --noEmit
```

- 零 error → 继续
- 有 error → **阻止提交**，输出错误让用户先修

### Step 2: 变更分析

```bash
git status          # 查看所有变更文件
git diff --stat     # 变更统计
git diff            # 具体变更内容
```

分析变更内容，判断：
- 变更是否属于**同一类**改动
- 如果混了多种不相关改动，**提示用户拆分**

### Step 3: 生成 commit message

格式：`<type>: <简短描述>`

**type 选择**：
- `feat`: 新功能
- `fix`: Bug 修复
- `refactor`: 重构（不改功能）
- `docs`: 文档更新
- `test`: 测试相关
- `chore`: 构建/工具/依赖
- `style`: 格式调整（不影响逻辑）

**规则**：
- 首行不超过 72 字符
- 用中文描述
- 聚焦"为什么"而非"做了什么"

### Step 4: 执行提交

```bash
git add <具体文件>    # 不用 git add -A
git commit -m "type: 描述"
```

### Step 5: 验证

```bash
git status            # 确认提交成功
git log --oneline -3  # 确认 commit message 正确
```

## 禁止行为

- ❌ 跳过 tsc 检查直接提交
- ❌ `git add -A` 或 `git add .`（可能误提交 .env 等敏感文件）
- ❌ 混合多种不相关改动到一次提交
- ❌ commit message 含 emoji（除非用户要求）
- ❌ 不经用户确认直接 push
