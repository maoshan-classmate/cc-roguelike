#!/bin/bash
# Hook: detect-gaps.sh
# Event: SessionStart
# Purpose: Detect missing documentation when code/prototypes exist
# Cross-platform: Windows Git Bash compatible (uses grep -E, not -P)

# Exit on error for debugging (but don't fail the session)
set +e

echo "=== Checking for Documentation Gaps ==="

# --- Check 0: Fresh project detection (suggests /start) ---
FRESH_PROJECT=true

# Check if source code exists
if [ -d "src" ]; then
  SRC_CHECK=$(find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) 2>/dev/null | head -1)
  if [ -n "$SRC_CHECK" ]; then
    FRESH_PROJECT=false
  fi
fi

# Check for config files (project already initialized)
if [ -f "package.json" ] || [ -f "CLAUDE.md" ]; then
  FRESH_PROJECT=false
fi

if [ "$FRESH_PROJECT" = true ]; then
  echo ""
  echo "NEW PROJECT: No source code, no config files detected."
  echo "   This looks like a fresh start! Run: npm init or similar."
  echo ""
  echo "==================================="
  exit 0
fi

# --- Check 1: Substantial codebase but sparse design docs ---
if [ -d "src" ]; then
  # Count source files (cross-platform, handles Windows paths)
  SRC_FILES=$(find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) 2>/dev/null | wc -l)
else
  SRC_FILES=0
fi

if [ -d "docs" ]; then
  DESIGN_FILES=$(find docs -type f -name "*.md" 2>/dev/null | wc -l)
else
  DESIGN_FILES=0
fi

# Normalize whitespace from wc output
SRC_FILES=$(echo "$SRC_FILES" | tr -d ' ')
DESIGN_FILES=$(echo "$DESIGN_FILES" | tr -d ' ')

if [ "$SRC_FILES" -gt 50 ] && [ "$DESIGN_FILES" -lt 5 ]; then
  echo "GAP: Substantial codebase ($SRC_FILES source files) but sparse docs ($DESIGN_FILES md files)"
  echo "    Suggested action: Review docs/ for completeness"
fi

# --- Check 2: Config files without docs ---
CONFIG_DIR="src/config"
if [ -d "$CONFIG_DIR" ]; then
  CONFIG_FILES=$(find "$CONFIG_DIR" -type f -name "*.ts" 2>/dev/null | wc -l)
  CONFIG_FILES=$(echo "$CONFIG_FILES" | tr -d ' ')
  if [ "$CONFIG_FILES" -gt 3 ]; then
    # Check for corresponding docs
    if [ ! -f "docs/components.md" ] && [ ! -f "docs/project-structure.md" ]; then
      echo "GAP: $CONFIG_FILES config files but missing component/structure documentation"
      echo "    Expected: docs/components.md or docs/project-structure.md"
    fi
  fi
fi

# --- Check 3: Core systems without architecture docs ---
if [ -d "src/pages" ] || [ -d "src/components" ]; then
  if [ ! -d "docs/bugs" ] || [ ! -d "docs/todo" ]; then
    echo "GAP: Frontend components exist but missing docs/bugs/ or docs/todo/ directories"
    echo "    Suggested action: Ensure docs/bugs/ and docs/todo/ exist for tracking"
  fi
fi

# --- Check 4: Server code without API documentation ---
if [ -d "server" ]; then
  SERVER_FILES=$(find server -type f -name "*.ts" -o -name "*.js" 2>/dev/null | wc -l)
  SERVER_FILES=$(echo "$SERVER_FILES" | tr -d ' ')
  if [ "$SERVER_FILES" -gt 5 ]; then
    if [ ! -f "docs/api.md" ] && [ ! -f "docs/architecture.md" ]; then
      echo "GAP: Server code ($SERVER_FILES files) but no API/architecture documentation"
      echo "    Expected: docs/api.md or docs/architecture.md"
    fi
  fi
fi

# --- Check 5: Sprite sync validation ---
SPRITE_FILES=("src/config/sprites.ts" "docs/sprite-inventory.md" "sprite-viewer.html")
MISSING_SPRITE=0
for f in "${SPRITE_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    MISSING_SPRITE=$((MISSING_SPRITE + 1))
  fi
done
if [ "$MISSING_SPRITE" -gt 0 ] && [ "$MISSING_SPRITE" -lt 3 ]; then
  echo "GAP: Sprite sync files incomplete — $MISSING_SPRITE of 3 missing"
  echo "    Expected: src/config/sprites.ts + docs/sprite-inventory.md + sprite-viewer.html"
  echo "    Suggested action: Run /sync-sprite to synchronize"
fi

# --- Summary ---
echo ""
echo "==================================="

exit 0
