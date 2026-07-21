#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
#  verify-backup.sh — Verificación de integridad de backups
#
#  Verifica que el backup más reciente sea válido haciendo un restore
#  de prueba en una base temporal. Reporta éxito/fallo.
#
#  USO:
#    ./verify-backup.sh                        # verifica backup local más reciente
#    ./verify-backup.sh --s3                   # verifica backup en S3
#    ./verify-backup.sh /ruta/al/backup.sql.gz # verifica archivo específico
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/pizza-db}"
PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${PG_USER:-postgres}"
VERIFY_DB="guido_pizza_verify_$(date +%s)"

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
fail() { log "❌ $*"; exit 1; }

# ── Resolver archivo a verificar ──────────────────────────────────
BACKUP_FILE=""

if [ $# -ge 1 ] && [ "$1" != "--s3" ]; then
  BACKUP_FILE="$1"
elif [ "$1" = "--s3" ]; then
  S3_BUCKET="${S3_BACKUP_BUCKET:-guidopizza-backups}"
  S3_PREFIX="${S3_BACKUP_PREFIX:-prod}"
  log "📦 Descargando backup más reciente de S3 (s3://$S3_BUCKET/$S3_PREFIX/)..."
  BACKUP_FILE=$(mktemp)
  aws s3 cp "s3://$S3_BUCKET/$S3_PREFIX/" "$BACKUP_FILE" --recursive --exclude "*" --include "*.sql.gz" 2>/dev/null || \
    fail "No se pudo descargar backup desde S3"
  log "✅ Backup descargado: $BACKUP_FILE"
else
  log "🔍 Buscando backup local más reciente en $BACKUP_DIR..."
  BACKUP_FILE=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1) || \
    fail "No se encontraron backups en $BACKUP_DIR"
  log "✅ Backup encontrado: $BACKUP_FILE"
fi

[ -f "$BACKUP_FILE" ] || fail "Archivo no encontrado: $BACKUP_FILE"

# ── Verificar checksum si existe ───────────────────────────────────
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "$CHECKSUM_FILE" ]; then
  log "🔐 Verificando checksum SHA256..."
  sha256sum -c "$CHECKSUM_FILE" || fail "Checksum no coincide — backup corrupto"
  log "✅ Checksum OK"
else
  log "⚠️  No hay archivo .sha256, se omite verificación de checksum"
fi

# ── Test restore ────────────────────────────────────────────────
log "🧪 Creando base de verificación: $VERIFY_DB"
createdb -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$VERIFY_DB" 2>/dev/null || \
  fail "No se pudo crear base de verificación"

log "🔄 Restore de prueba..."
if gunzip -c "$BACKUP_FILE" | psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$VERIFY_DB" > /dev/null 2>&1; then
  log "✅ Restore de prueba EXITOSO"

  # Verificar tablas críticas
  for table in orders clients employees products; do
    COUNT=$(psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$VERIFY_DB" \
      -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
    log "   Tabla $table: $COUNT registros"
  done

else
  fail "Restore de prueba FALLÓ — backup inválido o corrupto"
fi

# ── Limpiar ───────────────────────────────────────────────────────
log "🧹 Limpiando base de verificación..."
psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS \"$VERIFY_DB\";" > /dev/null 2>&1

if [ "$1" = "--s3" ]; then
  rm -f "$BACKUP_FILE"
fi

log "✅ Verificación de backup completada exitosamente"
