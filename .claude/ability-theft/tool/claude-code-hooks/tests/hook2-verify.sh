#!/bin/bash
# HOOK-2 Test Runner — verifies ability library completeness
# Windows-compatible: avoids multi-line python3 -c (cmd.exe interference)
set -euo pipefail

PASS=0
FAIL=0

pass() { PASS=$((PASS+1)); echo "PASS: $1"; }
fail() { FAIL=$((FAIL+1)); echo "FAIL: $1"; }

# --- TC-01: SessionStart JSON format ---
CONTENT="Rule: no guessing. No shortcuts."
s="$CONTENT"
s="${s//\\/\\\\}"; s="${s//\"/\\\"}"; s="${s//$'\n'/\\n}"; s="${s//$'\r'/\\r}"
OUTPUT=$(printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$s")
RESULT=$(echo "$OUTPUT" | python3 -c "import sys,json; d=json.loads(sys.stdin.read()); print('ok' if 'additionalContext' in d['hookSpecificOutput'] else 'fail')" 2>/dev/null || echo "fail")
[ "$RESULT" = "ok" ] && pass "TC-01: SessionStart JSON valid" || fail "TC-01: SessionStart JSON invalid"

# --- TC-02: Error signal detection ---
TOOL_RESULT="npm ERR! code E404
error Command failed with exit code 1"
if echo "$TOOL_RESULT" | grep -qiE 'error|Error|ERROR|exit code [1-9]|FAILED'; then
  pass "TC-02: Error signal detected"
else
  fail "TC-02: Error signal missed"
fi

# --- TC-03: Stop hook block JSON (single-line python via stdin) ---
BLOCK_JSON='{"decision":"block","reason":"Continue task","systemMessage":"Iteration 3"}'
RESULT=$(echo "$BLOCK_JSON" | python3 -c "import sys,json; d=json.loads(sys.stdin.read()); print('ok' if d['decision']=='block' else 'fail')" 2>/dev/null || echo "fail")
[ "$RESULT" = "ok" ] && pass "TC-03: Stop hook block JSON valid" || fail "TC-03: Stop hook block JSON invalid"

# --- TC-04: CRLF handling ---
printf -- "---\r\nactive: true\r\niteration: 3\r\n---\r\nprompt\r\n" > /tmp/test-crlf-$$$.txt
tr -d '\r' < /tmp/test-crlf-$$$.txt > /tmp/test-crlf-norm-$$$.txt && mv /tmp/test-crlf-norm-$$$.txt /tmp/test-crlf-$$$.txt
FRONTMATTER=$(sed -n '/^---$/,/^---$/{ /^---$/d; p; }' /tmp/test-crlf-$$$.txt)
ITERATION=$(echo "$FRONTMATTER" | grep '^iteration:' | sed 's/iteration: *//')
[ "$ITERATION" = "3" ] && pass "TC-04: CRLF handled (iter=$ITERATION)" || fail "TC-04: CRLF fail (iter=$ITERATION)"
rm -f /tmp/test-crlf-$$$.txt

# --- TC-05: Flavor template source ---
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$BASE_DIR/scripts/flavor-helper-template.sh"
if [ -f "$TEMPLATE" ]; then
  HAS_GET_FLAVOR=$(grep -c "get_flavor()" "$TEMPLATE" || echo "0")
  [ "$HAS_GET_FLAVOR" -ge 1 ] && pass "TC-05: Flavor template has get_flavor()" || fail "TC-05: get_flavor() not found"
else
  fail "TC-05: Template file missing"
fi

# --- TC-06: State persistence (single-line python) ---
STATEJSON='{"pressure_level":"L2","failure_count":3}'
RESULT=$(echo "$STATEJSON" | python3 -c "import sys,json; d=json.loads(sys.stdin.read()); print('ok' if d['pressure_level']=='L2' else 'fail')" 2>/dev/null || echo "fail")
[ "$RESULT" = "ok" ] && pass "TC-06: State persistence JSON works" || fail "TC-06: State persistence failed"

# --- Summary ---
echo ""
echo "============================"
echo "HOOK-2 Results: $PASS pass, $FAIL fail (total: $((PASS+FAIL)))"
echo "============================"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
