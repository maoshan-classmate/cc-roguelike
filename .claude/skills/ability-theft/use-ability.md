---
name: ability-theft:use-ability
description: 当需要激活、使用或加载某个已窃取的能力时触发。当用户明确指定 ability-theft:use-ability、需要注入某能力库、或询问有哪些可用能力时使用。
---

# use-ability（能力注入）

将窃取到的能力以**次高优先级**注入当前任务或目标 skill，仅次于目标 skill 的主要内容。

## 参数

从调用时传入的参数中解析：
- `能力名称`（必填）：对应 `<项目根目录>/.claude/ability-theft/<分类>/<能力名>/` 目录
- `目标skill名称`（选填）：若指定，先加载该 skill 再注入能力

## 优先级规则

```
优先级 1：目标 skill 的核心指令（若指定）— 不可覆盖
优先级 2：窃取能力内容                   — 本命令注入
优先级 3：Claude 通用知识
优先级 4：其他上下文
```

冲突时：遵从目标 skill 指令，用能力补充细节，不替换 skill 的判断。

## 执行步骤

**第一步：解析参数**

- `能力名称`：必填
- `目标skill名称`：选填

**若参数为空 → 展示能力库列表供用户选择：**

```
<项目根目录>/.claude/ability-theft/
├── language/
│   ├── python-async（v2，测试通过）
│   └── rust-ownership（v1，测试中）
├── framework/
│   ├── react-patterns（v3，测试通过）
│   └── django-orm（v2，测试通过）
├── tool/
│   ├── git-advanced（v2，测试通过）
│   └── docker-compose（v1，测试通过）
├── domain/
│   └── ml-pipeline（v1，测试中）
├── pattern/
│   └── ddd-aggregate（v2，测试通过）
└── workflow/
    └── ci-cd-github-actions（v1，测试通过）

请选择能力：[输入分类/能力名] [取消]
```

**第二步：定位能力库**

在 `<项目根目录>/.claude/ability-theft/` 下搜索：

1. 遍历各分类目录（language/, framework/, tool/, domain/, pattern/, workflow/, skill/, misc/）
2. 查找匹配 `<能力名称>/` 的目录
3. 进入目录，读取 `INDEX.md`

- 找到 → 继续
- 未找到 → 停止并提示：
  ```
  找不到能力库 `<能力名称>`。
  可用能力列表：{展示上述列表}
  请先用 ability-theft 窃取该能力，或从列表中选择。
  ```

**第三步：加载能力**

1. 读取 `INDEX.md`，了解：
   - 能力结构（core/, rules/, patterns/, mechanisms/, ...）
   - 快速入口（哪个文件对应什么任务）
   - 版本信息（v{N}，测试状态）

2. 按「快速入口」按需加载相关能力文件（不必全量加载）
   - 例如：用户任务与 "组件设计" 相关 → 加载 `patterns/component-design.md`

**第四步：加载目标 skill（若指定）**

使用 Skill 工具加载 `<目标skill名称>`。

**第五步：告知用户**

输出确认：
```
已注入能力「<能力名称>」：
- 核心能力点：{来自 INDEX.md 核心能力速查}
- 存储位置：<项目根目录>/.claude/ability-theft/{分类}/{能力名}/
- [与 skill「<目标skill名称>」协同运行]
- 优先级：[目标 skill >] 窃取能力 > 通用知识
```

## 错误处理

| 情况 | 处理 |
|------|------|
| 能力库不存在 | 提示用户先运行 ability-theft 窃取，并展示可用能力列表 |
| INDEX.md 缺失 | 提示能力库结构不完整，建议重新运行 HOOK-2 验证 |
| 目标 skill 不存在 | 报告 skill 未找到，仅加载能力继续执行 |
| 参数为空 | 展示能力库分类树供用户选择 |

## 能力浏览功能

当用户不确定有哪些能力可用时，可调用：

```
ability-theft:use-ability
# 或
ability-theft:use-ability --list
```

输出格式：
```
📚 可用能力库（<项目根目录>/.claude/ability-theft/）

framework/        ← 框架与库
  ├── react-patterns        v3  ✅ 测试通过
  ├── django-orm            v2  ✅ 测试通过
  └── vue-composition       v1  🔄 测试中

tool/             ← 工具
  ├── git-advanced          v2  ✅ 测试通过
  └── docker-compose        v1  ✅ 测试通过

language/         ← 编程语言
  └── python-async          v2  ✅ 测试通过

[...其他分类...]

💡 使用方式：ability-theft:use-ability <分类/能力名>
   例如：ability-theft:use-ability framework/react-patterns
```
