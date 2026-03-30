#!/usr/bin/env node
/**
 * [HOOK] PostToolUse - TS/TSX 连续编辑计数器
 *
 * 触发条件: 连续编辑 ≥5 个 .ts/.tsx 文件
 * 输出: AUTO-AGENT: 已连续编辑 5 个 TS/TSX → 触发 Agent(dev-standard-checker) 调度
 */
const fs = require('fs');
const path = require('path');

try {
  const data = JSON.parse(fs.readFileSync(0, 'utf-8'));
  const fp = data?.tool_input?.file_path || '';

  if (!fp.endsWith('.ts') && !fp.endsWith('.tsx')) {
    process.exit(0);
  }

  const counterFile = path.join(process.env.TEMP || '/tmp', 'cc-roguelike-edit-counter');
  let count = 0;

  try {
    count = parseInt(fs.readFileSync(counterFile, 'utf-8').trim(), 10);
  } catch {
    count = 0;
  }

  count += 1;
  fs.writeFileSync(counterFile, String(count));

  if (count >= 5) {
    fs.writeFileSync(counterFile, '0');

    // 输出 Claude Code 自动化调度关键词（必须精确匹配 CLAUDE.md 规则）
    console.log('🤖 AUTO-AGENT: 已连续编辑 5 个 TS/TSX');

    // 详细信息供人工审查
    console.log('[HOOK] TS/TSX 连续编辑计数器触发，已编辑:', count, '个文件');
    console.log('[HOOK] 动作: 调度 Agent(dev-standard-checker) 进行开发规范审计');
  }
} catch (e) {
  // silently fail
}
