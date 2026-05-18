# Backend — Portfolio

API REST en **Node.js + Express 5** sobre **MariaDB / MySQL** que da servicio al frontend del portfolio: auth con JWT, contenido bilingüe, tracking de visitas, formulario de contacto por email y chatbot con LLM vía Groq Cloud.

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node ≥ 20 (22 LTS en producción) |
| Framework | Express 5 |
| BD | MariaDB 10.5 / MySQL 8 vía `mysql2/promise` (pool) |
| Auth | `jsonwebtoken` + `bcrypt` |
| Email | `nodemailer` (Gmail SMTP) |
| IA | `groq-sdk` (Groq Cloud) |
| Rate limit | `express-rate-limit` |
| Anti-bot | Google reCAPTCHA v3 |

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

Crea `backend/.env` con estas variables:

```env
PORT=3000
CORS_ORIGINS=

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=portfolio

JWT_SECRET=

EMAIL_SERVICE=gmail
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=
EMAIL_TO=tu_correo@gmail.com

RECAPTCHA_SECRET=

AI_API_KEY=
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

- Login devuelve un JWT con `{ id, role }` firmado con `JWT_SECRET`.
- El frontend lo guarda en `localStorage` y lo añade en `Authorization: Bearer <token>` vía interceptor.
- `auth.middleware.js` protege rutas admin y comprueba `role === 'admin'` donde aplica.

## Producción

En la EC2, el proceso se gestiona con **PM2** tras un reverse proxy de **Caddy** que termina TLS con Let's Encrypt:

```bash
pm2 start server.js --name portfolio-api
pm2 save
```

Operaciones habituales:

```bash
pm2 logs portfolio-api          # ver logs
pm2 restart portfolio-api       # reiniciar tras un git pull
```

- `app.set('trust proxy', 1)` está activado para que `express-rate-limit` y el logging funcionen tras el proxy.
- Variables sensibles en `~/portfolio/backend/.env` con permisos `600`, nunca commiteadas.
