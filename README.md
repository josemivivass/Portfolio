# Portfolio — José Miguel Vivas Sánchez

Portfolio personal full-stack con landing animada, panel de administración y chatbot con IA. Bilingüe (ES / EN) y desplegado en AWS.

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
- **Tracking** de accesos y formulario de contacto con envío por email (Gmail + reCAPTCHA v3).
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

> En producción la BD vive en **MariaDB 10.5** dentro de la EC2 y se carga por consola con `sudo mysql < database.sql`.

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

Infraestructura actual en AWS Free Tier:

```
Cloudflare DNS
  ├── josemivivass.com         → AWS Amplify Hosting (SSR Angular)
  └── api.josemivivass.com  →  EC2 t3.micro
                                  └── Caddy (HTTPS Let's Encrypt)
                                       └── PM2 → Node + Express
                                               └── MariaDB
```

- **Frontend:** AWS Amplify, despliegue automático en push a `main`.
- **Backend:** EC2 + Caddy (reverse proxy con HTTPS) + PM2 (process manager) + MariaDB 10.5. Despliegue automático en push a `main` vía **GitHub Actions** (`.github/workflows/deploy-backend.yml`): SSH al EC2 → `git reset --hard origin/main` → `npm install --omit=dev` → `pm2 restart portfolio-api --update-env`.
- **DNS y registrar:** Cloudflare.

---

## Backups

La base de datos se respalda de forma automática en **Google Drive**:

- **Cuándo:** todos los días a las 03:00 (configurable con `BACKUP_CRON`).
- **Qué:** un volcado `.sql` completo — estructura y datos de todas las tablas.
- **Dónde:** una carpeta `backups` del Drive, conservando los últimos N (`GOOGLE_DRIVE_BACKUP_KEEP`); los más antiguos se eliminan solos.
- **Manual:** desde el panel admin (*Perfil*) se puede descargar el `.sql`, subirlo a Drive al instante o restaurar la BD desde un `.sql`. También se puede descargar un `.zip` con la carpeta `data` (las imágenes de proyectos subidas, que no van en el `.sql`).

La subida usa la API de Google Drive vía OAuth2; el job programado corre con `node-cron` dentro del backend. La primera vez se obtiene un *refresh token* ejecutando `node backend/scripts/get-drive-token.js`. Todas las variables necesarias están documentadas en `backend/.env.example`.

---

## Tests

- **Frontend:** Vitest (`@angular/build:unit-test`) — `cd frontend && npm test`. Specs `*.spec.ts` junto al código (utils y servicios).
- **Backend:** runner nativo de Node (`node:test`, sin dependencias) — `cd backend && npm test`. Ficheros `*.test.js`.
- **CI:** `.github/workflows/ci.yml` ejecuta ambas suites en cada push a `main` y en cada PR. Es informativo (no bloquea pushes ni merges).

---

## Autor

*José Miguel Vivas Sánchez* — [LinkedIn](https://linkedin.com/in/josemiguelvivassanchez/) · [GitHub](https://github.com/josemivivass)
