#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
#  restore.sh — Restaura un backup de PostgreSQL (Juancho's Pizza)
#
#  ⚠️  ESTE COMANDO SOBREESCRIBIRÁ LA BASE DE DATOS ACTUAL. ⚠️
#  Se requiere confirmación explícita y la base destino debe estar vacía
#  o disponible para ser reemplazada.
#
#  Uso:
#    ./restore.sh backups/guido-pizza_20260721_120000.dump.gz
#    ./restore.sh backups/guido-pizza_20260721_120000.dump.gz \
#                --target postgres://user:pass@host:5432/nueva_db
#    ./restore.sh --list                    # listar backups disponibles
#    ./restore.sh --verify backup.dump.gz   # verificar sin restaurar
#    ./restore.sh --help                    # ayuda completa
#
#  Requiere:
#    - pg_restore (cliente PostgreSQL)
#    - DATABASE_URL en entorno o .env
#    - gunzip (normalmente viene con cualquier distribución)
#
#  Exit codes:
#    0 = éxito
#    1 = error de config/input
#    2 = error de verificación
#    3 = error de restauración
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Help ────────────────────────────────────────────────────────────
show_help() {
  cat <<EOF
Uso: $(basename "$0") [backup-file] [OPCIONES]

Restaura un backup de PostgreSQL. El archivo puede ser .dump o .dump.gz.

Opciones:
  --target URL    Connection string destino (default: DATABASE_URL del .env)
  --list          Lista los backups disponibles en $BACKUP_DIR
  --verify FILE   Verifica un backup sin restaurarlo
  --force         Omite la confirmación interactiva (para scripts CI)
  --help          Muestra esta ayuda

Ejemplos:
  $(basename "$0") --list
  $(basename "$0") backups/guido-pizza_20260721_120000.dump.gz
  $(basename "$0") backups/backup.dump.gz --force
  $(basename "$0") backup.dump.gz --target postgres://user:pass@localhost:5432/test_restore
  $(basename "$0") --verify backups/backup.dump.gz
EOF
  exit 0
}

# ── Parse args ──────────────────────────────────────────────────────
FORCE=false
TARGET_DB=""
MODE="restore"
VERIFY_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --list) MODE="list"; shift ;;
    --verify) MODE="verify"; VERIFY_FILE="$2"; shift 2 ;;
    --target) TARGET_DB="$2"; shift 2 ;;
    --force) FORCE=true; shift ;;
    --help) show_help ;;
    -*)
      echo "❌ Opción desconocida: $1"
      show_help
      ;;
    *)
      if [[ -z "${BACKUP_FILE:-}" ]]; then
        BACKUP_FILE="$1"
      fi
      shift
    ;;
  esac
done

# ── Load .env ───────────────────────────────────────────────────────
if [[ -f "$PROJECT_DIR/.env" ]]; then
  set -a; source "$PROJECT_DIR/.env"; set +a
fi

# ── Modo: listar backups ────────────────────────────────────────────
if [[ "$MODE" == "list" ]]; then
  echo -e "${CYAN}📋 Backups disponibles en ${BACKUP_DIR}:${NC}"
  echo ""
  if ls "${BACKUP_DIR}"/guido-pizza_*.dump.gz 2>/dev/null; then
    echo ""
    echo -e "${YELLOW}Últimos 5:${NC}"
    ls -lhS "${BACKUP_DIR}"/guido-pizza_*.dump.gz 2>/dev/null | head -5
  else
    echo "   (no se encontraron backups)"
  fi
  exit 0
fi

# ── Modo: verificar ─────────────────────────────────────────────────
if [[ "$MODE" == "verify" ]]; then
  if [[ ! -f "$VERIFY_FILE" ]]; then
    echo -e "${RED}❌ Archivo no encontrado: $VERIFY_FILE${NC}"
    exit 1
  fi
  echo -e "${YELLOW}🔍 Verificando: $VERIFY_FILE${NC}"

  # Verificar checksum si existe
  if [[ -f "${VERIFY_FILE}.sha256" ]]; then
    echo -e "${YELLOW}   Verificando checksum SHA256…${NC}"
    if sha256sum -c "${VERIFY_FILE}.sha256" --status 2>/dev/null; then
      echo -e "${GREEN}   ✅ Checksum OK${NC}"
    else
      echo -e "${RED}   ❌ Checksum NO coincide — el archivo puede estar corrupto${NC}"
      exit 2
    fi
  else
    echo -e "${YELLOW}   ⚠️  No hay archivo .sha256 para verificar${NC}"
  fi

  # Probar integridad con pg_restore --list (lee el dump sin restaurar)
  tmpfile=$(mktemp)
  if [[ "$VERIFY_FILE" == *.gz ]]; then
    gunzip -c "$VERIFY_FILE" | pg_restore --list 2>"$tmpfile" >/dev/null || true
  else
    pg_restore --list "$VERIFY_FILE" 2>"$tmpfile" >/dev/null || true
  fi

  if grep -q "error\|corrupt\|invalid" "$tmpfile" 2>/dev/null; then
    echo -e "${RED}   ❌ El archivo parece corrupto:${NC}"
    cat "$tmpfile"
    rm -f "$tmpfile"
    exit 2
  fi

  rm -f "$tmpfile" 2>/dev/null
  echo -e "${GREEN}   ✅ Archivo de backup válido${NC}"
  echo -e "${GREEN}   Tamaño: $(du -h "$VERIFY_FILE" | cut -f1)${NC}"
  exit 0
fi

# ── Validaciones para restore ───────────────────────────────────────
if [[ -z "${BACKUP_FILE:-}" ]]; then
  echo -e "${RED}❌ Especificá un archivo de backup.${NC}"
  echo "   Usá --list para ver los disponibles"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo -e "${RED}❌ Archivo no encontrado: $BACKUP_FILE${NC}"
  exit 1
fi

DB_URL="${TARGET_DB:-${DATABASE_URL:-}}"
if [[ -z "$DB_URL" ]]; then
  echo -e "${RED}❌ No hay base de datos destino.${NC}"
  echo "   Definí DATABASE_URL en .env o usá --target"
  exit 1
fi

if ! command -v pg_restore &>/dev/null; then
  echo -e "${RED}❌ pg_restore no encontrado. Instalá PostgreSQL client.${NC}"
  exit 1
fi

# ── Confirmación ────────────────────────────────────────────────────
DB_NAME=$(echo "$DB_URL" | sed -n 's/.*\/\/[^/]*\/\(.*\)/\1/p')
echo -e "${RED}⚠️  ⚠️  ⚠️  ATENCIÓN ⚠️  ⚠️  ⚠️${NC}"
echo -e "${RED}   Esto SOBREESCRIBIRÁ la base de datos:${NC}"
echo -e "${RED}   → $DB_URL${NC}"
echo ""

if ! $FORCE; then
  read -r -p "¿Estás seguro? Escribí el nombre de la base para confirmar [${DB_NAME}]: " confirm
  if [[ "$confirm" != "$DB_NAME" ]]; then
    echo -e "${YELLOW}⏹  Restauración cancelada.${NC}"
    exit 1
  fi
fi

# ── Restaurar ───────────────────────────────────────────────────────
echo -e "${YELLOW}♻️  Restaurando backup → $DB_URL${NC}"
echo -e "${YELLOW}   Archivo: $BACKUP_FILE${NC}"
echo ""

if [[ "$BACKUP_FILE" == *.gz ]]; then
  # Descomprimir on-the-fly y pasar a pg_restore
  gunzip -c "$BACKUP_FILE" | pg_restore \
    --dbname="$DB_URL" \
    --clean \
    --if-exists \
    --no-owner \
    --verbose 2>&1 && \
  echo -e "${GREEN}✅ Restauración exitosa${NC}" || {
    echo -e "${RED}❌ Restauración falló${NC}"
    exit 3
  }
else
  pg_restore \
    --dbname="$DB_URL" \
    --clean \
    --if-exists \
    --no-owner \
    --verbose \
    "$BACKUP_FILE" 2>&1 && \
  echo -e "${GREEN}✅ Restauración exitosa${NC}" || {
    echo -e "${RED}❌ Restauración falló${NC}"
    exit 3
  }
fi

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Restauración completada${NC}"
echo -e "${GREEN}   Base:  $DB_URL${NC}"
echo -e "${GREEN}   Desde: $BACKUP_FILE${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
