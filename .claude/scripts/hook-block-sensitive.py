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
    # 输出结构化 JSON: systemMessage(用户可见) + reason(阻塞原因)
    msg = f"╔══ [HOOK] 敏感文件拦截 ══╗ — 禁止编辑: {fp}"
    output = json.dumps({
        "systemMessage": msg,
        "continue": False,
        "reason": f"敏感文件拦截: {fp} 匹配 .env / credentials / secret 模式",
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": f"文件 {fp} 匹配敏感文件模式 (.env / credentials / secret)"
        }
    }, ensure_ascii=False)
    print(output)
    sys.exit(0)

sys.exit(0)
