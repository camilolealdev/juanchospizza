# 🚨 Disaster Recovery Runbook — Guido Pizza

## 📋 Resumen

| Aspecto | Detalle |
|---------|---------|
| RPO (Recovery Point Objetive) | ≤ 24h (backup diario) |
| RTO (Recovery Time Objetive) | ≤ 30 min (restore completo) |
| Backups | PostgreSQL diario + S3 |
| Responsable | DevOps / SysAdmin |

---

## 1. Restore de Base de Datos

### 1.1 Restore desde backup local

```bash
# Listar backups disponibles
ls -lh /backups/pizza-db/

# Restore
gunzip -c /backups/pizza-db/guido_pizza_YYYY-MM-DD_HHmmss.sql.gz | \
  psql -h localhost -U postgres -d guido_pizza
```

### 1.2 Restore desde backup S3

```bash
# Descargar
aws s3 cp s3://guidopizza-backups/prod/guido_pizza_YYYY-MM-DD_HHmmss.sql.gz /tmp/

# Verificar checksum (SHA256)
sha256sum /tmp/guido_pizza_YYYY-MM-DD_HHmmss.sql.gz

# Restore
gunzip -c /tmp/guido_pizza_YYYY-MM-DD_HHmmss.sql.gz | \
  psql -h localhost -U postgres -d guido_pizza
```

### 1.3 Verificar restore

```sql
-- Consultas de verificación post-restore
SELECT COUNT(*) AS total_orders FROM orders;
SELECT COUNT(*) AS total_clients FROM clients;
SELECT status, COUNT(*) FROM orders GROUP BY status;
SELECT NOW() - MIN("createdAt") AS oldest_order FROM orders;
```

---

## 2. Recovery de Servidor Completo

### Escenario: Caída total del servidor

```bash
# 1. Iniciar servicios
cd /opt/guido-pizza
docker-compose up -d

# 2. Verificar health
curl -f http://localhost:3001/api/health

# 3. Verificar métricas
curl -f http://localhost:3001/api/metrics

# 4. Verificar frontend
curl -f http://localhost:3000/
```

### Verificación post-recovery

```bash
# Todos los servicios deben responder
docker-compose ps
# Debe mostrar: app (Up), nginx (Up), postgres (Up), redis (Up)

# Logs sin errores críticos
docker-compose logs --tail=20 app | grep -i error
```

---

## 3. Rollback de Deploy

```bash
# 1. Volver a versión anterior
git checkout <commit-hash-anterior>
npm ci
npm run build
docker-compose restart app

# 2. Verificar
curl -f http://localhost:3001/api/health
```

---

## 4. Incident Response

| Síntoma | Causa probable | Acción |
|---------|---------------|--------|
| Health check DB fail | Postgres caído | `docker-compose restart postgres` |
| Health check Redis fail | Redis caído | `docker-compose restart redis` |
| 502 Bad Gateway | Nginx → App falla | `docker-compose restart app` |
| Páginas lentas | Alto tráfico | Verificar `GET /api/metrics` |
| Error de pago | API key expirada | Rotar API key, actualizar .env |

### Escalado

| Contacto | Canal |
|----------|-------|
| DevOps | Teléfono / Slack / Email |
| Dueño | Teléfono |
| Proveedor DB | Portal cloud / Soporte |

---

## 5. Backup Verification

Programar verificación semanal automatizada:

```bash
#!/bin/bash
# weekly-backup-verify.sh
# Verifica que los backups sean válidos

LATEST=$(ls -t /backups/pizza-db/*.gz | head -1)
gunzip -c "$LATEST" | psql -h localhost -U postgres -d guido_pizza_verify 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Backup verification: PASS ($LATEST)"
  psql -h localhost -U postgres -d guido_pizza_verify -c "DROP OWNED BY CURRENT_USER CASCADE;"
else
  echo "❌ Backup verification: FAIL ($LATEST)"
fi
```

---

## 6. Métricas de DR

| Métrica | Objetivo |
|---------|----------|
| Tiempo de restore | < 30 min |
| Último backup exitoso | < 24h |
| Verificaciones semanales | 100% |
| Incidentes de datos perdidos | 0 |
