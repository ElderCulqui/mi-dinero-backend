#!/usr/bin/env bash
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(cd "$BACKEND_DIR/../mi-dinero-frontend" && pwd)"
BACKUP_SCRIPT="$HOME/bin/mi-dinero-backup.sh"

require_main() {
  local dir="$1"
  cd "$dir"
  [ "$(git branch --show-current)" = "main" ] || {
    echo "ERROR: $dir no esta en main"
    exit 1
  }
  [ -z "$(git status --porcelain)" ] || {
    echo "ERROR: $dir tiene cambios sin commitear"
    exit 1
  }
  git pull --ff-only
}

echo "==> Backend"
require_main "$BACKEND_DIR"

if [ -x "$BACKUP_SCRIPT" ]; then
  echo "==> Backup de mi_dinero_db"
  "$BACKUP_SCRIPT"
else
  echo "AVISO: no existe $BACKUP_SCRIPT; sigo sin backup"
fi

docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy
docker compose -f docker-compose.prod.yml up -d --remove-orphans

echo "==> Frontend"
require_main "$FRONTEND_DIR"
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --remove-orphans

echo "==> Smoke"
sleep 5
curl -fsS http://mi-dinero.homelab/ >/dev/null
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://mi-dinero.homelab/api/auth/login \
  -H "Content-Type: application/json" -d "{}")
[ "$code" = "400" ] || { echo "Smoke fallo: $code"; exit 1; }
echo "Deploy OK"
