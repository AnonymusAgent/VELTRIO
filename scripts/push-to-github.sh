#!/bin/bash
# VELTRIO — push to your GitHub repo
# Usage:
#   chmod +x scripts/push-to-github.sh
#   ./scripts/push-to-github.sh git@github.com:YOUR_USERNAME/video-hub.git
#   # or with HTTPS:
#   ./scripts/push-to-github.sh https://github.com/YOUR_USERNAME/video-hub.git
set -e
REMOTE_URL="$1"
if [ -z "$REMOTE_URL" ]; then
  echo "Usage: ./scripts/push-to-github.sh <github-repo-url>"
  echo "Example: ./scripts/push-to-github.sh https://github.com/YOUR_USERNAME/video-hub.git"
  exit 1
fi
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repo."
  exit 1
fi
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi
git branch -M main
echo "Pushing to $REMOTE_URL ..."
git push -u origin main
echo "Done! Your VELTRIO code is on GitHub."
