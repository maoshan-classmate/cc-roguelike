#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""[HOOK] PreToolUse - 敏感文件拦截"""
import sys, json, re, io, os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

try:
    raw = sys.stdin.buffer.read().decode('utf-8', errors='replace')
    data = json.loads(raw) if raw.strip() else {}
except:
    sys.exit(0)

fp = data.get("tool_input", {}).get("file_path", "")
PATTERNS = [r"\.env$", r"\.env\.", r"credentials", r"secret"]

if any(re.search(p, fp) for p in PATTERNS):
    # exit 2 = 阻止操作；stderr 显示给用户
    print("[HOOK] 敏感文件拦截 — 禁止编辑 .env / credentials / secret 文件", file=sys.stderr)
    sys.exit(2)

sys.exit(0)
