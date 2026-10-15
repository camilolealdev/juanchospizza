# =============================================================================
# docker-reset.ps1 — Reset completo de Docker + npm para Windows
# Ejecutar como Administrador (PowerShell)
# =============================================================================
# Este script limpia el entorno después de builds fallidos que dejaron:
# - Docker Engine congelado/corrupto
# - npm cache corrupto (ENOTEMPTY / EPERM)
# - node_modules con archivos bloqueados por antivirus
# =============================================================================

Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     🐳 Docker + npm Reset - Juancho's Pizza     ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan

# ── 1. Matar procesos zombi ──────────────────────────────────
Write-Host "`n📌 Paso 1/6: Matando procesos Node.js y npm..." -ForegroundColor Yellow
Get-Process | Where-Object { 
    $_.ProcessName -like '*node*' -or 
    $_.ProcessName -like '*npm*' -or 
    $_.ProcessName -like '*vite*' -or
    $_.ProcessName -like '*esbuild*' 
} | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "  ✅ Procesos Node.js/npm detenidos" -ForegroundColor Green

# ── 2. Limpiar node_modules ──────────────────────────────────
Write-Host "📌 Paso 2/6: Limpiando node_modules..." -ForegroundColor Yellow
$projectPath = Split-Path -Parent $PSScriptRoot
$nmPath = Join-Path $projectPath "pizzeria-merge\node_modules"
if (Test-Path $nmPath) {
    # Intentar remover con atributos normales
    Remove-Item -Path $nmPath -Recurse -Force -ErrorAction SilentlyContinue
    if (Test-Path $nmPath) {
        # Si hay archivos bloqueados, forzar con takeown
        Write-Host "  ⚠️ Archivos bloqueados detectados, forzando..." -ForegroundColor Yellow
        takeown /f "$nmPath" /r /d Y 2>$null | Out-Null
        Remove-Item -Path $nmPath -Recurse -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "  ✅ node_modules eliminado" -ForegroundColor Green

# ── 3. Limpiar npm cache ─────────────────────────────────────
Write-Host "📌 Paso 3/6: Limpiando npm cache..." -ForegroundColor Yellow
$npmCache = npm config get cache 2>$null
if ($npmCache) {
    $cacachePath = Join-Path $npmCache "_cacache"
    $locksPath = Join-Path $npmCache "_locks"
    
    if (Test-Path $cacachePath) {
        Remove-Item -Path "$cacachePath\*" -Recurse -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $locksPath) {
        Remove-Item -Path "$locksPath\*" -Recurse -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  ✅ npm cache limpiado manualmente" -ForegroundColor Green
}
npm cache clean --force 2>$null
Write-Host "  ✅ npm cache clean --force ejecutado" -ForegroundColor Green

# ── 4. Configurar DNS Docker (daemon.json) ──────────────────
Write-Host "📌 Paso 4/6: Verificando config DNS de Docker..." -ForegroundColor Yellow
$dockerDir = "$env:USERPROFILE\.docker"
$daemonFile = Join-Path $dockerDir "daemon.json"
if (-not (Test-Path $dockerDir)) {
    New-Item -ItemType Directory -Path $dockerDir -Force | Out-Null
}
if (Test-Path $daemonFile) {
    $daemon = Get-Content $daemonFile | ConvertFrom-Json
    if (-not $daemon.dns) {
        $daemon | Add-Member -NotePropertyName "dns" -NotePropertyValue @("1.1.1.1", "8.8.8.8")
        $daemon | ConvertTo-Json | Set-Content $daemonFile
        Write-Host "  ✅ DNS 1.1.1.1, 8.8.8.8 agregado a daemon.json" -ForegroundColor Green
    } else {
        Write-Host "  ✅ DNS ya configurado en daemon.json" -ForegroundColor Green
    }
} else {
    @{ dns = @("1.1.1.1", "8.8.8.8") } | ConvertTo-Json | Set-Content $daemonFile
    Write-Host "  ✅ daemon.json creado con DNS 1.1.1.1, 8.8.8.8" -ForegroundColor Green
}

# ── 5. Flush DNS de Windows ──────────────────────────────────
Write-Host "📌 Paso 5/6: Flushing DNS de Windows..." -ForegroundColor Yellow
ipconfig /flushdns 2>$null | Out-Null
Write-Host "  ✅ DNS flush ejecutado" -ForegroundColor Green

# ── 6. Instrucciones finales ─────────────────────────────────
Write-Host "`n╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     ✅ Reset completado                          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`n📋 Próximos pasos:" -ForegroundColor Green
Write-Host "  1. Cierra y REABRE la terminal (bash/PowerShell)" -ForegroundColor White
Write-Host "  2. Abre Docker Desktop manualmente desde el menú inicio" -ForegroundColor White
Write-Host "  3. Espera a que Docker Engine esté listo (el icono debe estar estable)" -ForegroundColor White
Write-Host "  4. Ve a Docker Desktop → Settings → Docker Engine" -ForegroundColor White
Write-Host "     y verifica que `"dns`": [`"1.1.1.1`", `"8.8.8.8`"] esté ahí" -ForegroundColor White
Write-Host "  5. Aplica Apply & Restart" -ForegroundColor White
Write-Host "  6. Una vez Docker responda, ejecuta:" -ForegroundColor White
Write-Host "     cd pizzeria-merge" -ForegroundColor Yellow
Write-Host "     npm ci --no-audit --no-fund" -ForegroundColor Yellow
Write-Host "     npm run build" -ForegroundColor Yellow
Write-Host "     docker compose build --build-arg NPM_REGISTRY=https://registry.npmmirror.com app" -ForegroundColor Yellow
Write-Host "     docker compose up -d" -ForegroundColor Yellow
