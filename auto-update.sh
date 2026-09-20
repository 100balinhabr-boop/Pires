#!/bin/bash
cd /opt/pires || exit 1
LOCAL=$(git rev-parse HEAD 2>/dev/null)
git fetch origin main --quiet 2>/dev/null
REMOTE=$(git rev-parse origin/main 2>/dev/null)
if [ "$LOCAL" != "$REMOTE" ] && [ -n "$REMOTE" ]; then
    echo "[$(date)] Nova versao detectada. Atualizando..."
    git pull origin main
    npm install --silent
    npm run build
    pm2 restart pires --update-env
    echo "[$(date)] Atualizado pra $REMOTE"
else
    echo "[$(date)] Sem mudancas."
fi
