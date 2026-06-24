#!/usr/bin/env zsh
# =============================================================================
# create-issues.sh
# Data-driven GitHub issue creator. All content lives in issues.yml —
# this script is a reusable engine with zero hardcoded strings.
#
# Prerequisites:
#   - gh CLI:   brew install gh  →  gh auth login
#   - yq CLI:   brew install yq          (YAML processor)
#
# Usage:
#   chmod +x project-management/create-issues.sh
#   ./project-management/create-issues.sh [path/to/issues.yml]
#
# The optional argument lets you point at a different data file.
# Defaults to issues.yml in the same directory as this script.
#
# Idempotency: issues whose title already exists (open or closed) are skipped.
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Resolve data file (default: issues.yml next to this script)
# ---------------------------------------------------------------------------
SCRIPT_DIR="${0:A:h}"
DATA_FILE="${1:-$SCRIPT_DIR/issues.yml}"

if [[ ! -f "$DATA_FILE" ]]; then
  print -P "%F{red}Error:%f Data file not found: $DATA_FILE" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Read config from YAML (single source of truth)
# ---------------------------------------------------------------------------
REPO=$(yq '.config.repo' "$DATA_FILE")
PROJECT_NAME=$(yq '.config.project' "$DATA_FILE")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Print a coloured status line
log()  { print -P "%F{cyan}[create-issues]%f $*"; }
ok()   { print -P "%F{green}  ✔%f $*"; }
skip() { print -P "%F{yellow}  ⊘%f $* (already exists – skipping)"; }

# Return 0 if an issue with the exact title already exists (open or closed)
issue_exists() {
  local title="$1"
  gh issue list \
    --repo "$REPO" \
    --state all \
    --limit 200 \
    --json title \
    --jq ".[].title" \
    | grep -qxF "$title"
}

# Create a single issue and add it to the project.
# Args: <title> <label> <body>
create_issue() {
  local title="$1"
  local label="$2"
  local body="$3"

  if issue_exists "$title"; then
    skip "$title"
    return
  fi

  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --label "$label" \
    --body "$body" \
    --project "$PROJECT_NAME"

  ok "Created: $title"
}

# ---------------------------------------------------------------------------
# 1. Ensure labels exist — read entirely from YAML
# ---------------------------------------------------------------------------
log "Ensuring labels exist…"

label_count=$(yq '.labels | length' "$DATA_FILE")
for (( i = 0; i < label_count; i++ )); do
  lname=$(yq ".labels[$i].name" "$DATA_FILE")
  ldesc=$(yq ".labels[$i].description" "$DATA_FILE")
  lcolor=$(yq ".labels[$i].color" "$DATA_FILE")

  if gh label list --repo "$REPO" --json name --jq ".[].name" | grep -qxF "$lname"; then
    ok "Label '$lname' already exists"
  else
    gh label create "$lname" \
      --repo "$REPO" \
      --description "$ldesc" \
      --color "$lcolor"
    ok "Created label '$lname'"
  fi
done

# ---------------------------------------------------------------------------
# 2. Create all issues — read entirely from YAML
# ---------------------------------------------------------------------------
log "Creating issues…"

issue_count=$(yq '.issues | length' "$DATA_FILE")
for (( i = 0; i < issue_count; i++ )); do
  title=$(yq ".issues[$i].title" "$DATA_FILE")
  label=$(yq ".issues[$i].label" "$DATA_FILE")
  body=$(yq ".issues[$i].body" "$DATA_FILE")

  create_issue "$title" "$label" "$body"
done

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
log "All done! View issues at: https://github.com/$REPO/issues"
