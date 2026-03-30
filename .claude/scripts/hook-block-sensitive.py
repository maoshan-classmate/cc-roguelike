#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""[HOOK] PreToolUse - 敏感文件拦截"""
import sys, json, re, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

try:
    raw = sys.stdin.buffer.read().decode('utf-8', errors='replace')
    data = json.loads(raw) if raw.strip() else {}
except:
    sys.exit(0)

fp = data.get("tool_input", {}).get("file_path", "")
PATTERNS = [r"\.env$", r"\.env\.", r"credentials", r"secret"]

if any(re.search(p, fp) for p in PATTERNS):
    W = 54
    print()
    print("+" + "=" * W + "+")
    print("| [HOOK] 敏感文件拦截 - BLOCKED" + " " * (W - 31) + "|")
    print("+" + "-" * W + "+")
    lines = [
        f"BLOCKED: {fp}",
        "规则: 禁止编辑 .env / credentials / secret",
    ]
    for line in lines:
        display_len = sum(2 if ord(c) > 127 else 1 for c in line)
        pad = max(W - display_len - 1, 1)
        print("| " + line + " " * pad + "|")
    print("+" + "=" * W + "+")
    print()
    sys.exit(1)

sys.exit(0)
