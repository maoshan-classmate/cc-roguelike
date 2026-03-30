#!/usr/bin/env node
/**
 * [HOOK] Stop - 任务结束时检查未提交变更
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // 重置计数器
  const counterFile = path.join(process.env.TEMP || '/tmp', 'cc-roguelike-edit-counter');
  try {
    fs.writeFileSync(counterFile, '0');
  } catch {}

  // 检查未提交的TS/TSX变更
  const result = execSync('git diff --name-only', { encoding: 'utf-8', timeout: 5000 });
  const changed = result
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f && (f.endsWith('.ts') || f.endsWith('.tsx')));

  const count = changed.length;

  if (count >= 3) {
    const W = 54;
    const pad = (s) => {
      const len = [...s].reduce((a, c) => a + (c.charCodeAt(0) > 127 ? 2 : 1), 0);
      return ' '.repeat(Math.max(W - len - 1, 1));
    };

    console.log('');
    console.log('+' + '='.repeat(W) + '+');
    console.log('| [HOOK] 任务结束 - 代码变更检测' + ' '.repeat(W - 30) + '|');
    console.log('+' + '-'.repeat(W) + '+');
    console.log('| 已修改 TS/TSX 文件: ' + count + ' 个' + pad('已修改 TS/TSX 文件: ' + count + ' 个') + '|');
    console.log('| 动作: 自动调度 Agent(dev-standard-checker)' + pad('动作: 自动调度 Agent(dev-standard-checker)') + '|');
    console.log('| 备选: 执行 /code-hygiene 全维度扫描' + pad('备选: 执行 /code-hygiene 全维度扫描') + '|');
    console.log('+' + '='.repeat(W) + '+');
    console.log('');
  }
} catch (e) {
  // silently fail
}
