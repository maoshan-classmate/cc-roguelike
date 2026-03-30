#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""[HOOK] PostToolUse - TS/TSX 连续编辑计数器"""
import sys, json, os, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

try:
    raw = sys.stdin.buffer.read().decode('utf-8', errors='replace')
    data = json.loads(raw) if raw.strip() else {}
except:
    sys.exit(0)

fp = data.get("tool_input", {}).get("file_path", "")
if not fp or not (fp.endswith(".ts") or fp.endswith(".tsx")):
    sys.exit(0)

counter_file = os.path.join(os.environ.get("TEMP", "/tmp"), "cc-roguelike-edit-counter")
try:
    with open(counter_file, "r") as f:
        count = int(f.read().strip())
except:
    count = 0

count += 1
with open(counter_file, "w") as f:
    f.write(str(count))

if count >= 5:
    with open(counter_file, "w") as f:
        f.write("0")
    W = 54
    print()
    print("+" + "=" * W + "+")
    print("| [HOOK] TS/TSX 连续编辑计数器触发" + " " * (W - 34) + "|")
    print("+" + "-" * W + "+")
    lines = [
        f"已连续编辑: {count} 个 TS/TSX 文件",
        "动作: 自动调度 Agent(dev-standard-checker)",
    ]
    for line in lines:
        display_len = sum(2 if ord(c) > 127 else 1 for c in line)
        pad = max(W - display_len - 1, 1)
        print("| " + line + " " * pad + "|")
    print("+" + "=" * W + "+")
    print()
