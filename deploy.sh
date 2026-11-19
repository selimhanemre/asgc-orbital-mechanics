#!/usr/bin/env bash
#
# deploy.sh — build the static site and publish it to the gh-pages branch.
#
# GitHub Pages is configured to serve the repo from the `gh-pages` branch
# (Settings > Pages > Source: Deploy from a branch > gh-pages). This script
# builds with Vite and force-pushes the build output to that branch.
#
# The branch is updated via git plumbing (temporary index + commit-tree), so
# the working tree is never modified.
#
# Usage:  ./deploy.sh
set -euo pipefail

cd "$(dirname "$0")"

BRANCH="gh-pages"

echo "==> Building (npm run build)..."
npm run build

echo "==> Creating deploy commit from dist/ ..."
index_file=$(mktemp)
rm -f "$index_file" # git wants a non-existent path, not a 0-byte file
tree_file=$(mktemp)
trap 'rm -f "$index_file" "$tree_file"' EXIT

( cd dist && GIT_INDEX_FILE="$index_file" git add -fA . )
GIT_INDEX_FILE="$index_file" git write-tree > "$tree_file"
# git records paths relative to the repo root (dist/...); the gh-pages branch
# root must be the dist/ subtree itself, so peel off one level.
full_tree=$(cat "$tree_file")
subtree=$(git ls-tree "$full_tree" dist | awk '{print $3}')
[ -n "$subtree" ] || { echo "ERROR: dist/ subtree not found in tree" >&2; exit 1; }

commit=$(
  GIT_AUTHOR_NAME="ASGC deploy" \
  GIT_AUTHOR_EMAIL="deploy@localhost" \
  GIT_COMMITTER_NAME="ASGC deploy" \
  GIT_COMMITTER_EMAIL="deploy@localhost" \
  git commit-tree "$subtree" \
    -m "Deploy: static build ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
)
git update-ref "refs/heads/$BRANCH" "$commit"

echo "==> Pushing to origin/$BRANCH (force)..."
git push origin "$BRANCH" --force

echo
echo "Done. Site will be (re)published at:"
echo "  https://selimhanemre.github.io/asgc-orbital-mechanics/"
echo "(GitHub usually needs 1-2 minutes to finish building Pages.)"
