#!/usr/bin/env node
/**
 * [HOOK] PostToolUse - 贴图资产三文件同步提醒
 *
 * 触发条件: 编辑 sprites.ts / sprite-viewer.html / sprite-inventory.md 任一文件
 * 输出: AUTO-AGENT: 贴图资产修改检测 → 触发 Agent(sprite-audit) 调度
 */
const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync(0, 'utf-8'));
  const fp = data?.tool_input?.file_path || '';

  const patterns = [/sprites\.ts$/, /sprite-viewer\.html$/, /sprite-inventory\.md$/];

  if (patterns.some(p => p.test(fp))) {
    // 输出 Claude Code 自动化调度关键词（必须精确匹配 CLAUDE.md 规则）
    console.log('🤖 AUTO-AGENT: 贴图资产修改检测');

    // 详细信息供人工审查
    console.log('[HOOK] 贴图资产铁律已触发，文件:', fp);
    console.log('[HOOK] 三文件: sprites.ts + sprite-inventory.md + sprite-viewer.html');
    console.log('[HOOK] 动作: 调度 Agent(sprite-audit) 进行三文件一致性审计');
  }
} catch (e) {
  // silently fail
}
