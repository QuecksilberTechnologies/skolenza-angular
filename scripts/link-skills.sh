#!/usr/bin/env bash
# Recreate .claude/skills as links into .agents/skills.
#
# Skills are tracked once, under .agents/skills/. Claude Code only reads
# .claude/skills/, so each skill is linked into place instead of copied -
# a second copy silently drifts from the first.
#
# The links are machine-specific (a Windows junction stores an absolute
# target) and gitignored, so run this after cloning and after adding a skill.
#
# Usage: bash scripts/link-skills.sh
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
src="$repo_root/.agents/skills"
dest="$repo_root/.claude/skills"

mkdir -p "$dest"
created=0
kept=0
pruned=0

# Drop links whose skill was deleted - a dangling link fails `-e` below and
# would make the relink error out.
for link in "$dest"/*; do
  if [ -L "$link" ] && [ ! -e "$link" ]; then
    rm "$link"
    pruned=$((pruned + 1))
  fi
done

for path in "$src"/*/; do
  name="$(basename "$path")"
  link="$dest/$name"
  if [ -e "$link" ]; then
    kept=$((kept + 1))
    continue
  fi

  case "$(uname -s)" in
    MINGW* | MSYS* | CYGWIN*)
      # git-bash without Developer Mode copies instead of linking, so use a
      # directory junction - same effect, and it needs no elevation.
      powershell -NoProfile -Command "New-Item -ItemType Junction \
        -Path '$(cygpath -w "$link")' -Target '$(cygpath -w "$src/$name")' | Out-Null"
      ;;
    *)
      ln -s "../../.agents/skills/$name" "$link"
      ;;
  esac
  created=$((created + 1))
done

echo "linked $created, already present $kept, pruned $pruned"
