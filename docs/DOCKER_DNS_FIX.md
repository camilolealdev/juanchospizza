# Solución: Timeout de npm registry en Docker Desktop (Windows)

## Problema

El build de Docker falla con `ETIMEDOUT` al descargar paquetes de npm:

```
#15 [deps 2/3] RUN npm ci --omit=dev ...
#15 15.43 npm error code ETIMEDOUT
#15 15.43 npm error errno ETIMEDOUT
#15 15.43 npm error network request to https://registry.npmjs.org/... failed
```

**Causa raíz**: Docker Desktop en Windows tiene un proxy DNS virtual que falla intermitentemente con la resolución **IPv6** del registry npm (`registry.npmjs.org` resuelve a direcciones `2606:4700::...`). El host resuelve el registry en ~80ms, pero dentro del contenedor Docker la resolución DNS se cuelga.

---

## Solución 1 (recomendada): DNS global en Docker Engine

Configurar DNS globales de Cloudflare/Google para que el **daemon de Docker** los use durante builds.

1. Abrir **Docker Desktop**
2. Ir a **Settings** → **Docker Engine**
3. Reemplazar el JSON con:

```json
{
  "dns": ["1.1.1.1", "8.8.8.8"]
}
```

4. Clic en **Apply & Restart**

> ⚠️ **Esto afecta TODOS los builds y contenedores**, no solo este proyecto. Es la solución más efectiva porque el `npm ci` corre durante `docker build` (build time), no cuando el contenedor ya está corriendo (runtime).

---

## Solución 2: Mirror registry (build-time override)

Si el DNS global no es una opción, puedes usar un mirror registry de npm más cercano:

```bash
# Usar mirror chino (rápido desde Sudamérica/Asia)
docker compose build --build-arg NPM_REGISTRY=https://registry.npmmirror.com app

# Usar mirror de Cloudflare (global)
docker compose build --build-arg NPM_REGISTRY=https://registry.npmjs.cf app
```

---

## Solución 3: Pre-descargar dependencias en el host

Como workaround temporal, puedes copiar `node_modules/` desde el host si ya corriste `npm install`:

```bash
# 1. Instalar dependencias en el host
npm ci

# 2. Compilar frontend
npm run build

# 3. Build de Docker usando el node_modules local
#    Usar el mismo tag que docker-compose genera (pizzeria-merge_app)
#    para no crear imágenes huérfanas.
docker build --network=host -t pizzeria-merge_app .
```

> ⚠️ **Nota sobre BuildKit**: Docker Desktop para Windows usa BuildKit por defecto
> (desde Docker 23+). BuildKit corre dentro de una VM, y `--network=host` dentro
> de esa VM NO es la red real del host, sino la red de la VM. Por eso esta
> solución puede no funcionar en Windows. **Prefiere la Solución 1 (daemon.json)**
> que resuelve el DNS a nivel del engine, afectando tanto a BuildKit como a
> contenedores en runtime.

---

## Solución 4: Reiniciar Docker Desktop + flush DNS

A veces el proxy DNS virtual de Docker Desktop se recupera con un reinicio:

```bash
# Windows (PowerShell como Administrador)
ipconfig /flushdns
# Luego reiniciar Docker Desktop desde la bandeja del sistema
```

---

## Verificación

Para verificar que el fix funcionó:

```bash
# Probar conectividad DNS desde un contenedor (usa HTTP, no ICMP — más
# confiable en Windows donde ping puede estar bloqueado)
docker run --rm --entrypoint sh alpine -c "wget -q --spider https://registry.npmjs.org/ && echo 'DNS OK' || echo 'DNS FAIL'"

# Si funciona, el build debería completar
docker compose build app
```

---

## Referencias

- [Docker Desktop networking (docs.docker.com)](https://docs.docker.com/desktop/networking/)
- [npm registry IPv6 issues (github.com/npm/cli)](https://github.com/npm/cli/issues/4561)
- [Docker Engine daemon.json reference](https://docs.docker.com/engine/reference/commandline/dockerd/#daemon-configuration-file)
