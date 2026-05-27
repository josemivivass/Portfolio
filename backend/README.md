# Backend — Portfolio

API REST en **Node.js + Express 5** sobre **MariaDB / MySQL** que da servicio al frontend del portfolio: auth con JWT en cookie `httpOnly`, contenido bilingüe, tracking de visitas, formulario de contacto por email, chatbot con LLM vía Groq Cloud y backup automático a Google Drive.

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node ≥ 20 (22 LTS en producción) |
| Framework | Express 5 |
| BD | MariaDB 10.5 / MySQL 8 vía `mysql2/promise` (pool) |
| Auth | `jsonwebtoken` + `bcrypt` + `cookie-parser` (sesión en cookie `httpOnly`) |
| Email | `nodemailer` (Gmail SMTP) |
| IA | `groq-sdk` (Groq Cloud) |
| Rate limit | `express-rate-limit` |
| Anti-bot | Google reCAPTCHA v3 |
| Backups | `googleapis` (Drive OAuth2) + `node-cron` |

## Requisitos

- Node ≥ 20
- MySQL 8 o MariaDB 10.5 (recomendado XAMPP en local)
- Cuentas / API keys: Gmail SMTP (app password), Groq Cloud, Google reCAPTCHA

## Instalación

```bash
cd backend
npm install
# crea backend/.env con los valores (ver más abajo)
npm start                  # → http://localhost:3000
```

Antes del primer arranque, importa el esquema en tu BD local.

**Con XAMPP en local:**

1. Arranca **Apache** y **MySQL** desde el panel de control de XAMPP.
2. Abre [phpMyAdmin](http://localhost/phpmyadmin).
3. Pestaña **SQL**, pega el contenido de `database.sql` y pulsa **Continuar**. El script ya hace `DROP/CREATE DATABASE portfolio` con `utf8mb4`.

> En producción la BD vive en **MariaDB 10.5** dentro de la EC2 y se carga por consola con `sudo mysql < database.sql`.

## Variables de entorno

Plantilla completa en [`backend/.env.example`](./.env.example). Copia ese archivo a `backend/.env` y rellénalo.

```env
PORT=3000
CORS_ORIGINS=                                    # CSV. Vacío = abierto (solo dev)

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=portfolio

JWT_SECRET=                                      # firma de la cookie de sesión

EMAIL_SERVICE=gmail
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=                                      # Gmail: app password, no la normal
EMAIL_TO=tu_correo@gmail.com

RECAPTCHA_SECRET=

AI_API_KEY=                                      # Groq Cloud

# Backup automático a Google Drive (OAuth2)
# Vacío = backup automático deshabilitado, el resto del backend arranca normal.
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=                            # ver scripts/get-drive-token.js
GOOGLE_DRIVE_BACKUP_FOLDER=backups
GOOGLE_DRIVE_BACKUP_KEEP=100
BACKUP_CRON=0 3 * * *                            # diario a las 03:00
BACKUP_TZ=Europe/Madrid
OAUTH_HELPER_PORT=5273                           # puerto del script de token
```

`CORS_ORIGINS` vacío abre CORS a todos los orígenes (solo dev). En producción, lista separada por coma con los dominios del frontend.

## Endpoints

Todos cuelgan de `/api`. Healthcheck público en `GET /api/health` (verifica BD con `SELECT 1`).

| Prefijo | Recurso | Auth |
|---|---|---|
| `/api` | login, register, role | Mixto |
| `/api/tracking` | log de accesos del visitante | Público |
| `/api/projects` | proyectos del portfolio | GET público · escritura admin |
| `/api/experience` | experiencia laboral | GET público · escritura admin |
| `/api/education` | formación | GET público · escritura admin |
| `/api/skills` | habilidades agrupadas | GET público · escritura admin |
| `/api/profile` | foto y datos personales | GET público · escritura admin |
| `/api/contact` | envío de mensaje + email | Público (reCAPTCHA) |
| `/api/chatbot` | conversación con IA | Público |
| `/api/admin` | dashboards, usuarios, mensajes, visitas | Admin |

Rutas en `src/routes/*.routes.js`, lógica en `src/controllers/*.controller.js`.

## Estructura

```
backend/
├── server.js                Entry point: CORS, middlewares y montaje de rutas
└── src/
    ├── config/db.js         Pool de conexiones MySQL/MariaDB
    ├── routes/              auth · tracking · projects · contact · experience · education · skills · admin · chatbot · profile
    ├── controllers/         Lógica por dominio
    └── middlewares/
        └── auth.middleware.js   Verifica JWT y rol
```

## Auth

- Login firma un JWT con `{ id, role }` con `JWT_SECRET` y lo entrega como cookie `httpOnly`, `Secure` y `SameSite=Lax` (`portfolio_session`). No accesible vía JS desde el navegador.
- El frontend hace las peticiones con `withCredentials: true` (interceptor) — el navegador envía la cookie automáticamente.
- Logout (`POST /api/logout`) borra la cookie.
- `auth.middleware.js` verifica el token de la cookie y comprueba `role === 'admin' | 'editor'` donde aplica.

## Backups

- **Automático:** `node-cron` corre cada noche el dump de la BD (`mysqldump`), lo sube a una carpeta de Google Drive vía OAuth2 y borra los más antiguos según `GOOGLE_DRIVE_BACKUP_KEEP`. Si las credenciales de Drive están vacías el job se salta solo.
- **Manual desde el admin** (`/api/admin/backup`, `/api/admin/backup/drive`, `/api/admin/restore`): descarga del `.sql`, subida puntual a Drive y restauración subiendo un `.sql`. La restauración usa `multipleStatements: true` así que también sirve para aplicar migraciones puntuales — basta con que el archivo empiece por `USE portfolio;`.
- **Refresh token de Drive:** se obtiene una sola vez con `node scripts/get-drive-token.js`.

## Producción

En la EC2, el proceso se gestiona con **PM2** tras un reverse proxy de **Caddy** que termina TLS con Let's Encrypt:

```bash
pm2 start server.js --name portfolio-api
pm2 save
```

Operaciones habituales:

```bash
pm2 logs portfolio-api                      # ver logs
pm2 restart portfolio-api --update-env      # reiniciar releyendo .env
```

- `app.set('trust proxy', 1)` está activado para que `express-rate-limit` y el logging funcionen tras el proxy.
- Variables sensibles en `~/portfolio/backend/.env` con permisos `600`, nunca commiteadas.

### Despliegue automático

Cualquier push a `main` que toque `backend/**` dispara `.github/workflows/deploy-backend.yml`: SSH al EC2 → `git reset --hard origin/main` → `npm install --omit=dev` → `pm2 restart portfolio-api --update-env`.
