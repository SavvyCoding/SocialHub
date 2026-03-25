#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.prod.yml"
ENV_FILE="$SCRIPT_DIR/.env"

# ── Preflight checks ──
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found."
  echo "Copy .env.example to .env and fill in your values:"
  echo "  cp deployment/.env.example deployment/.env"
  exit 1
fi

if ! command -v docker &>/dev/null; then
  echo "Error: docker is not installed."
  exit 1
fi

# ── Parse arguments ──
ACTION="${1:-up}"

case "$ACTION" in
  build)
    echo "==> Building images..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build
    ;;

  up)
    echo "==> Building and starting all services..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

    echo "==> All services are running (migration runs automatically before web starts)."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    ;;

  down)
    echo "==> Stopping all services..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    ;;

  restart)
    echo "==> Restarting application services..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart web socket worker
    ;;

  logs)
    SERVICE="${2:-}"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f $SERVICE
    ;;

  migrate)
    echo "==> Running database migrations..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up migrate
    ;;

  seed)
    echo "==> Seeding database..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm \
      -e DATABASE_URL="$(grep DATABASE_URL "$ENV_FILE" | head -1 | cut -d= -f2-)" \
      -e DIRECT_DATABASE_URL="$(grep DIRECT_DATABASE_URL "$ENV_FILE" | head -1 | cut -d= -f2-)" \
      --entrypoint sh worker -c "cd /app/apps/web && prisma db seed"
    ;;

  status)
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    ;;

  *)
    echo "Usage: $0 {build|up|down|restart|logs [service]|migrate|seed|status}"
    exit 1
    ;;
esac
