#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

git -C "$ROOT_DIR" config core.hooksPath tools/git-hooks

echo "Installed Recallo git hooks:"
echo "  core.hooksPath=$(git -C "$ROOT_DIR" config --get core.hooksPath)"
