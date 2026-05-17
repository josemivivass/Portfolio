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
- **Panel admin** protegido por JWT: gestión de perfil, experiencias, proyectos, educación, habilidades, mensajes, visitas, usuarios y chatbot.
- **Chatbot** con LLM vía Groq Cloud.
- **Tracking** de accesos y formulario de contacto con envío por email (Gmail + reCAPTCHA v3).
- **CVs descargables** en Español e Inglés directamente desde el hero.

---

## Inicio rápido (local)

Requisitos: Node ≥ 20, MySQL / MariaDB (XAMPP o equivalente), Git.

```bash
git clone https://github.com/josemivivass/Portfolio.git
cd Portfolio
```

**1. Base de datos**

Inicia MySQL e importa el esquema:

```bash
mysql -u root -p < database.sql
```

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
- **Backend:** EC2 + Caddy (reverse proxy con HTTPS) + PM2 (process manager) + MariaDB 10.5.
- **DNS y registrar:** Cloudflare.

---

## Autor

**José Miguel Vivas Sánchez** — [LinkedIn](https://linkedin.com/in/josemiguelvivassanchez/) · [GitHub](https://github.com/josemivivass)
