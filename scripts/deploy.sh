#!/bin/bash
# Deploy BASE GPT to 192.168.17.12
set -e

REMOTE=harrygpt@192.168.17.12

echo "==> Pushing latest commits..."
git push

echo "==> Deploying on remote..."
ssh "$REMOTE" 'bash -s' << 'REMOTE_SCRIPT'
set -e
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

cd ~/base-gpt
git pull
cd client && npm run build && cd ..

pm2 restart ecosystem.config.cjs --update-env
pm2 save

echo "=== Status ==="
pm2 list
echo "=== Ports ==="
ss -tlnp | grep -E "3000|8080"
REMOTE_SCRIPT

echo "==> Done. App available at http://192.168.17.12:3000"
