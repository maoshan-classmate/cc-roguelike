#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""[HOOK] PostToolUse - 贴图资产三文件同步提醒"""
import sys, json, re, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

try:
    raw = sys.stdin.buffer.read().decode('utf-8', errors='replace')
    data = json.loads(raw) if raw.strip() else {}
except:
    sys.exit(0)

fp = data.get("tool_input", {}).get("file_path", "")
PATTERNS = [r"sprites\.ts$", r"sprite-viewer\.html$", r"sprite-inventory\.md$"]

if any(re.search(p, fp) for p in PATTERNS):
    W = 54
    print()
    print("+" + "=" * W + "+")
    print("| [HOOK] 贴图资产铁律触发" + " " * (W - 26) + "|")
    print("+" + "-" * W + "+")
    lines = [
        f"触发文件: {fp}",
        "规则: 三文件必须同步更新",
        "必须: sprites.ts + inventory.md + viewer",
        "动作: 自动调度 Agent(sprite-audit)",
    ]
    for line in lines:
        pad = max(W - len(line.encode('utf-8')) - 1, 1)
        # 中文字符占2列宽，需要按显示宽度计算
        display_len = sum(2 if ord(c) > 127 else 1 for c in line)
        pad = max(W - display_len - 1, 1)
        print("| " + line + " " * pad + "|")
    print("+" + "=" * W + "+")
    print()
