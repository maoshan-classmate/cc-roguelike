#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""[HOOK] Stop - 任务结束时检查未提交变更"""
import sys, json, os, subprocess, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

counter_file = os.path.join(os.environ.get("TEMP", "/tmp"), "cc-roguelike-edit-counter")
try:
    with open(counter_file, "w") as f:
        f.write("0")
except:
    pass

try:
    result = subprocess.run(
        ["git", "diff", "--name-only"],
        capture_output=True, text=True, timeout=5
    )
    changed = [f for f in result.stdout.strip().split("\n")
               if f and (f.endswith(".ts") or f.endswith(".tsx"))]
    count = len(changed)

    if count >= 3:
        W = 54
        print()
        print("+" + "=" * W + "+")
        print("| [HOOK] 任务结束 - 代码变更检测" + " " * (W - 32) + "|")
        print("+" + "-" * W + "+")
        lines = [
            f"已修改 TS/TSX 文件: {count} 个",
            "动作: 自动调度 Agent(dev-standard-checker)",
            "备选: 执行 /code-hygiene 全维度扫描",
        ]
        for line in lines:
            display_len = sum(2 if ord(c) > 127 else 1 for c in line)
            pad = max(W - display_len - 1, 1)
            print("| " + line + " " * pad + "|")
        print("+" + "=" * W + "+")
        print()
except Exception:
    pass
