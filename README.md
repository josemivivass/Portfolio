# Portfolio — José Miguel Vivas Sánchez

Portfolio personal full-stack con landing animada, panel de administración y chatbot con IA. Bilingüe (ES / EN) y **autohospedado** en un servidor propio con Proxmox, publicado a internet con Cloudflare Tunnel.

- **Web:** [josemivivass.com](https://josemivivass.com)
- **API:** [api.josemivivass.com](https://api.josemivivass.com)
- **Health:** [`/api/health`](https://api.josemivivass.com/api/health)

Monorepo con dos aplicaciones:

| Carpeta | Stack | Detalle |
|---|---|---|
| [`frontend/`](./frontend) | Angular 21 + SSR | Landing, admin, chatbot UI |
| [`backend/`](./backend) | Node 22 + Express 5 + MariaDB | API REST y chatbot con IA |

---

## Características

- **Landing** con hero animado (GSAP + ScrollTrigger), fondo 3D (Three.js), typewriter dinámico y secciones por capítulos romanos: About · Experience · Education · Skills · Projects.
- **i18n** propio ES / EN con servicio de traducción y contenido bilingüe en base de datos.
- **Panel admin** protegido por sesión JWT en cookie `httpOnly`: gestión de perfil, experiencias, proyectos (web · móvil · IA), notebooks, educación, habilidades, mensajes, visitas, usuarios y chatbot.
- **Visor de notebooks** (.ipynb) integrado: convierte los notebooks de IA enlazados desde GitHub y los renderiza con resaltado de sintaxis.
- **Chatbot** con LLM vía Groq Cloud y selector de modelo desde el admin.
- **Tracking** de accesos con **geolocalización por IP** (`geoip-lite`/MaxMind GeoLite2) y formulario de contacto con envío por email (Gmail + reCAPTCHA v2).
- **Mapa de visitas** en el dashboard del admin: choropleth mundial con `d3-geo` + TopoJSON, marcadores por ciudad y leyenda con nombres de país traducidos según el idioma activo.
- **CVs descargables** en Español e Inglés directamente desde el hero, actualizables desde el panel admin.
- **Backups automáticos** de la base de datos a Google Drive (diarios, con rotación), además de backup y restauración manual desde el panel admin, y descarga de un ZIP con los archivos (imágenes de proyectos en disco).
- **SEO**: meta tags y descripción, Open Graph / Twitter Cards para la previsualización al compartir, datos estructurados JSON-LD, `robots.txt` y `sitemap.xml`. Bilingüe (ES / EN).

---

## Inicio rápido (local)

Requisitos: Node ≥ 20, MySQL / MariaDB (XAMPP o equivalente), Git.

```bash
git clone https://github.com/josemivivass/Portfolio.git
cd Portfolio
```

**1. Base de datos en local con XAMPP**

1. Arranca **Apache** y **MySQL** desde el panel de control de XAMPP.
2. Abre [phpMyAdmin](http://localhost/phpmyadmin).
3. Pestaña **SQL**, pega el contenido de `database.sql` y pulsa **Continuar**. El script ya hace `DROP/CREATE DATABASE portfolio` con `utf8mb4`.

> En producción la BD vive en **MariaDB 10.11** dentro del contenedor LXC y se carga por consola con `sudo mysql < database.sql`.

**2. Backend** ([detalles](./backend/README.md))

```bash
cd backend
npm install
# crea backend/.env con las variables (ver backend/README.md)
npm start                  # → http://localhost:3000
```

**3. Frontend** ([detalles](./frontend/README.md))

```bash
cd frontend
npm install
npm start                  # → http://localhost:4200
```

---

## Estructura

```
Portfolio/
├── frontend/         Angular 21 SPA con SSR
├── backend/          API Express + MariaDB
├── database.sql      Esquema completo de la BD
└── README.md
```

---

## Despliegue

Front, API y base de datos conviven en un único contenedor LXC sobre **Proxmox VE**, en un servidor doméstico. Se publica con **Cloudflare Tunnel**:

```
Cloudflare (DNS · TLS · CDN)
  │
  └── cloudflared ──túnel saliente──► LXC Debian 12
        ├── josemivivass.com      → PM2 → Angular SSR   (:4000)
        ├── www.josemivivass.com  → PM2 → Angular SSR   (:4000)
        └── api.josemivivass.com  → PM2 → Node + Express (:3000)
                                            └── MariaDB 10.11 (bind 127.0.0.1)
```

- **Sin puertos abiertos.** El túnel lo establece el servidor *hacia* Cloudflare, así que el router no expone nada y la IP doméstica no aparece en ningún registro DNS. Funciona igual con IP dinámica o CGNAT.
- **TLS** lo termina Cloudflare en el edge: no hace falta certificado ni reverse proxy en el origen (adiós Caddy y Let's Encrypt).
- **SSR y API en la misma máquina.** El renderizado en servidor llama al backend por loopback en vez de salir a internet y volver a entrar por el túnel; lo resuelve `frontend/src/app/interceptors/ssr-api.interceptor.ts`, que reescribe la URL solo cuando corre en servidor y deja intacto al navegador.
- **Despliegue automático:** push a `main` → `.github/workflows/deploy.yml` sobre un **runner self-hosted** dentro del contenedor: `git reset --hard origin/main` → deps del backend → `npm ci` del front solo si cambió el lockfile → build SSR → `pm2 restart` → healthcheck. El runner también sale hacia GitHub, así que tampoco requiere puertos abiertos.
- **Proceso:** PM2 con dos apps (`portfolio-api`, `portfolio-web`) definidas en un `ecosystem.config.js` fuera del repo, resucitadas por systemd al arrancar.
- **DNS y registrar:** Cloudflare.

---

## Backups

La base de datos se respalda de forma automática en **Google Drive**:

- **Cuándo:** todos los días a las 03:00 (configurable con `BACKUP_CRON`).
- **Qué:** un volcado `.sql` completo — estructura y datos de todas las tablas.
- **Dónde:** una carpeta `backups` del Drive, conservando los últimos N (`GOOGLE_DRIVE_BACKUP_KEEP`); los más antiguos se eliminan solos.
- **Manual:** desde el panel admin (*Perfil*) se puede descargar el `.sql`, subirlo a Drive al instante o restaurar la BD desde un `.sql`. También se puede descargar un `.zip` con la carpeta `data` (las imágenes de proyectos subidas, que no van en el `.sql`).

La subida usa la API de Google Drive vía OAuth2; el job programado corre con `node-cron` dentro del backend. La primera vez se obtiene un *refresh token* ejecutando `node backend/scripts/get-drive-token.js`. Todas las variables necesarias están documentadas en `backend/.env.example`.

A nivel de infraestructura, Proxmox hace además un **`vzdump` diario del contenedor completo** (03:30, retención de 7 diarios y 4 semanales), que sirve para volver atrás ante un error de configuración.

---

## Tests

- **Frontend:** Vitest (`@angular/build:unit-test`) — `cd frontend && npm test`. Specs `*.spec.ts` junto al código (utils y servicios).
- **Backend:** runner nativo de Node (`node:test`, sin dependencias) — `cd backend && npm test`. Ficheros `*.test.js`.
- **CI:** `.github/workflows/ci.yml` ejecuta ambas suites en cada push a `main` y en cada PR. Es informativo (no bloquea pushes ni merges).

---

## Autor

*José Miguel Vivas Sánchez* — [LinkedIn](https://linkedin.com/in/josemiguelvivassanchez/) · [GitHub](https://github.com/josemivivass)
