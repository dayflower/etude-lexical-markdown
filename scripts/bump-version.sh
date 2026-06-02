#!/usr/bin/env bash
#
# Bump the package version and open a pull request with the diff.
#
# Usage: scripts/bump-version.sh [patch|minor|major]   (default: patch)
#
# Requires a clean working tree on the main branch, plus the gh CLI.
set -euo pipefail

bump="${1:-patch}"
case "$bump" in
  patch | minor | major) ;;
  *)
    echo "Usage: $0 [patch|minor|major]" >&2
    exit 1
    ;;
esac

cd "$(git rev-parse --show-toplevel)"

branch="$(git symbolic-ref --short HEAD)"
if [ "$branch" != "main" ]; then
  echo "Must be run on the main branch (current: $branch)." >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean. Commit or stash your changes first." >&2
  exit 1
fi

# Updates package.json and package-lock.json without creating a git tag.
new_version="$(npm version "$bump" --no-git-tag-version)"

git switch -c "bump-version/${new_version}"
git commit -am "chore: bump version to ${new_version}"
git push -u origin HEAD
gh pr create \
  --base main \
  --title "chore: bump version to ${new_version}" \
  --body "Automated version bump to ${new_version}."
