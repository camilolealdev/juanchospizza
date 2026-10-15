#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
#  backup.sh — Backup automático de PostgreSQL (Juancho's Pizza)
#
#  Uso:
#    ./backup.sh                          # backup local a ./backups/
#    ./backup.sh --s3                     # backup + subida a S3
#    ./backup.sh --output /ruta/personalizada
#    ./backup.sh --help                   # ayuda completa
#
#  Requiere:
#    - pg_dump (cliente PostgreSQL)
#    - DATABASE_URL en entorno o .env
#    - [opcional] aws CLI para subida a S3
#
#  Rotación:
#    - Conserva los últimos 30 backups locales
#    - S3: conserva 90 días (configurable vía ciclo de vida en bucket)
#
#  Exit codes:
#    0 = éxito
#    1 = error de conexión/config
#    2 = error de pg_dump
#    3 = error de subida
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuración ───────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-./backups}"
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-guido-pizza-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ── Help ────────────────────────────────────────────────────────────
show_help() {
  cat <<EOF
Uso: $(basename "$0") [OPCIONES]

Realiza backup de la base de datos PostgreSQL del proyecto Juancho's Pizza.

Opciones:
  --output DIR    Directorio de destino (default: $BACKUP_DIR)
  --s3            Subir también a S3 (requiere BACKUP_S3_BUCKET en .env)
  --help          Muestra esta ayuda

Variables de entorno requeridas:
  DATABASE_URL    Connection string de PostgreSQL

Variables opcionales:
  BACKUP_DIR      Directorio local de backups (default: ./backups)
  BACKUP_S3_BUCKET Bucket S3 para subida
  BACKUP_S3_PREFIX Prefijo en S3
  RETENTION_DAYS  Días de retención local (default: 30)
EOF
  exit 0
}

# ── Parse args ──────────────────────────────────────────────────────
DO_S3=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --output) BACKUP_DIR="$2"; shift 2 ;;
    --s3) DO_S3=true; shift ;;
    --help) show_help ;;
    *) echo "❌ Opción desconocida: $1"; show_help ;;
  esac
done

# ── Load .env si existe ─────────────────────────────────────────────
if [[ -f "$PROJECT_DIR/.env" ]]; then
  set -a; source "$PROJECT_DIR/.env"; set +a
fi
if [[ -f "$PROJECT_DIR/.env.production" ]]; then
  set -a; source "$PROJECT_DIR/.env.production"; set +a
fi

# ── Validaciones ────────────────────────────────────────────────────
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo -e "${RED}❌ DATABASE_URL no está definida${NC}"
  echo "   Crea un archivo .env o exporta la variable"
  exit 1
fi

if ! command -v pg_dump &>/dev/null; then
  echo -e "${RED}❌ pg_dump no encontrado. Instalá PostgreSQL client:${NC}"
  echo "   apt install postgresql-client  # Debian/Ubuntu"
  echo "   brew install postgresql        # macOS"
  exit 1
fi

# ── Preparar directorio ─────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

# Nombre del archivo
BACKUP_FILE="${BACKUP_DIR}/guido-pizza_${TIMESTAMP}.dump"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

echo -e "${YELLOW}📦 Iniciando backup → $BACKUP_FILE_GZ${NC}"

# ── Backup con pg_dump (formato custom comprimido) ──────────────────
# Formato custom (-Fc): comprime, permite parallel restore, preserva
# tipos, tablas, índices, schemas, datos, etc.
if pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --no-password \
  --verbose \
  --file="$BACKUP_FILE" 2>&1; then
  echo -e "${GREEN}✅ pg_dump exitoso${NC}"
else
  echo -e "${RED}❌ pg_dump falló${NC}"
  exit 2
fi

# Comprimir con gzip (compressión extra sobre el formato custom)
gzip -f "$BACKUP_FILE"
echo -e "${GREEN}✅ Comprimido: $(du -h "$BACKUP_FILE_GZ" | cut -f1)${NC}"

# ── Hash SHA256 para verificación ──────────────────────────────────
HASH_FILE="${BACKUP_FILE_GZ}.sha256"
sha256sum "$BACKUP_FILE_GZ" > "$HASH_FILE"
echo -e "${GREEN}✅ Checksum: $(cut -c1-16 "$HASH_FILE")…${NC}"

# ── Subida a S3 ────────────────────────────────────────────────────
if $DO_S3; then
  if [[ -z "${BACKUP_S3_BUCKET:-}" ]]; then
    echo -e "${YELLOW}⚠️  --s3 indicado pero BACKUP_S3_BUCKET no está definido. Omitiendo subida.${NC}"
  elif command -v aws &>/dev/null; then
    S3_KEY="${S3_PREFIX}/$(basename "$BACKUP_FILE_GZ")"
    echo -e "${YELLOW}☁️  Subiendo a s3://${BACKUP_S3_BUCKET}/${S3_KEY}${NC}"
    if aws s3 cp "$BACKUP_FILE_GZ" "s3://${BACKUP_S3_BUCKET}/${S3_KEY}"; then
      aws s3 cp "$HASH_FILE" "s3://${BACKUP_S3_BUCKET}/${S3_KEY}.sha256"
      echo -e "${GREEN}✅ Subida a S3 completa${NC}"
    else
      echo -e "${RED}❌ Subida a S3 falló${NC}"
      exit 3
    fi
  else
    echo -e "${YELLOW}⚠️  aws CLI no encontrado. Instalalo o subí manualmente:${NC}"
    echo "   apt install awscli"
  fi
fi

# ── Rotación: borrar backups locales más viejos que RETENTION_DAYS ─
echo -e "${YELLOW}🧹 Limpiando backups locales con más de ${RETENTION_DAYS} días…${NC}"
find "$BACKUP_DIR" -name "guido-pizza_*.dump.gz" -type f -mtime "+${RETENTION_DAYS}" -delete
find "$BACKUP_DIR" -name "guido-pizza_*.dump.gz.sha256" -type f -mtime "+${RETENTION_DAYS}" -delete
echo -e "${GREEN}✅ Rotación completada${NC}"

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Backup completado exitosamente${NC}"
echo -e "${GREEN}   Archivo: $BACKUP_FILE_GZ${NC}"
echo -e "${GREEN}   Tamaño:  $(du -h "$BACKUP_FILE_GZ" | cut -f1)${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
