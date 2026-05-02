#!/usr/bin/env bash
# cc-roguelike — Status Line
# Receives JSON on stdin, outputs a single-line status.
#
# Segments: ctx% | model | git branch | recent commit

input=$(cat)

# --- Parse JSON (jq with grep fallback) ---
if command -v jq &>/dev/null; then
  model=$(echo "$input" | jq -r '.model.display_name // "Unknown"')
  used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
else
  model=$(echo "$input" | grep -oE '"display_name"\s*:\s*"[^"]*"' | head -1 | sed 's/.*: *"//;s/"//')
  used_pct=$(echo "$input" | grep -oE '"used_percentage"\s*:\s*[0-9]+' | head -1 | sed 's/.*: *//')
  [ -z "$model" ] && model="Unknown"
fi

# --- Context usage ---
if [ -n "$used_pct" ]; then
  ctx_label="ctx: ${used_pct}%"
else
  ctx_label="ctx: --"
fi

# --- Git branch ---
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached")
if [ "$branch" = "HEAD" ]; then
  branch="detached"
fi

# --- Recent commit message (first line, truncated) ---
recent_commit=$(git log --oneline -1 2>/dev/null | head -c 60 || echo "")

# --- Assemble ---
if [ -n "$recent_commit" ]; then
  printf "%s | %s | %s | %s" "${ctx_label}" "${model}" "${branch}" "${recent_commit}"
else
  printf "%s | %s | %s" "${ctx_label}" "${model}" "${branch}"
fi
