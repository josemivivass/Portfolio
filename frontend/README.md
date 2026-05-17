# Frontend — Portfolio

SPA en **Angular 21** con SSR (Express + `@angular/ssr`), animaciones GSAP / Three.js, edición rica con Quill y servicio de i18n propio (ES / EN). Desplegada en AWS Amplify.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Angular 21 (standalone components) |
| Renderizado | SSR via `@angular/ssr` + Express |
| Animación | GSAP + ScrollTrigger, Three.js |
| Editor rico | ngx-quill (admin) |
| Estilos | CSS plano con variables (`colors.css`, `fonts.css`) |
| Lenguaje | TypeScript 5.9 |

## Requisitos

- Node ≥ 20
- npm 11
- Backend corriendo en `http://127.0.0.1:3000` (ver `src/environments/environment.ts`)

## Instalación

```bash
cd frontend
npm install
```

La configuración de entorno vive en `src/environments/environment.ts` (dev) y `src/environments/environment.prod.ts` (prod). El build de producción usa el segundo vía `fileReplacements` en `angular.json`.

## Scripts

| Comando | Descripción |
|---|---|
| `npm start` | Dev server en `http://localhost:4200` con HMR |
| `npm run build` | Build de producción (bundle browser + server SSR) |
| `npm run watch` | Build en modo development con watch |
| `npm run serve:ssr:frontend` | Sirve el bundle SSR construido (puerto 4000) |
| `npm test` | Tests con Vitest |

## Estructura

```
src/
├── app/
│   ├── components/
│   │   ├── home/             Landing (hero, about, experience, education, skills)
│   │   ├── experience/       Scroll horizontal de experiencia
│   │   ├── projects/         Telón de proyectos con lightbox
│   │   ├── contact/          Formulario de contacto
│   │   ├── chatbot/          Widget de chat con IA
│   │   ├── background/       Fondo animado (Three.js)
│   │   ├── preloader/        Intro animada
│   │   ├── login/ register/  Auth
│   │   └── admin/            Panel admin con tabs (dashboard, profile, projects, …)
│   ├── services/             translation, auth, profile, project, experience, chatbot, tracking, …
│   ├── guards/               admin.guard, admin-exit.guard
│   ├── interceptors/         auth.interceptor (JWT en headers)
│   ├── utils/tech-icons.ts   Mapeo tecnología → SVG en /icons
│   └── app.routes.ts
├── environments/             environment.ts / environment.prod.ts
├── styles.css  colors.css  fonts.css
└── server.ts                 Entrada SSR
public/                       Assets servidos en la raíz (/icons, CVs en PDF, favicon)
```

## Configuración de entornos

`src/environments/environment.ts` (dev):

```ts
export const environment = {
  production: false,
  apiHost: 'http://127.0.0.1:3000',
  apiUrl: 'http://127.0.0.1:3000/api'
};
```

`src/environments/environment.prod.ts` (prod) apunta a `https://api.josemivivass.com`. El swap se hace automáticamente en el build de producción.

## i18n

Sistema propio en `services/translation.service.ts`. En plantillas:

```html
{{ i18n.t('clave') }}
<div [innerHTML]="i18n.t('clave.html')"></div>
```

Para datos bilingües del backend (ej. `edu.title` / `edu.title_en`):

```html
{{ i18n.lang === 'es' ? edu.title : (edu.title_en || edu.title) }}
```

## CVs descargables

El menú "Descargar CV" del hero usa descarga programática (`fetch` + Blob) para evitar conflictos con el ciclo de vida de Angular. Coloca los PDFs en `public/` con nombres exactos:

- `CV_ES_JoseMiguelVivasSanchez.pdf`
- `CV_EN_JoseMiguelVivasSanchez.pdf`

## Convenciones

- **Prettier:** `printWidth: 100`, `singleQuote: true`, parser `angular` para `.html`.
- **Standalone components** con `imports: [...]` directamente.
- **Estilo de commits:** español, descripción corta (ej. *"Landing en móvil"*).

## Producción

```bash
npm run build
node dist/frontend/server/server.mjs
```

En producción el build lo lanza AWS Amplify automáticamente al hacer push a `main`.
