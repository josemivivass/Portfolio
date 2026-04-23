import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export type Lang = 'es' | 'en';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private langSubject!: BehaviorSubject<Lang>;
  lang$!: ReturnType<BehaviorSubject<Lang>['asObservable']>;
  private overrides: Record<Lang, Record<string, string>> = { es: {}, en: {} };
  private overridesSubject = new BehaviorSubject<number>(0);
  overrides$ = this.overridesSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    const saved = isPlatformBrowser(this.platformId)
      ? (localStorage.getItem('lang') as Lang) || 'es'
      : 'es';
    this.langSubject = new BehaviorSubject<Lang>(saved);
    this.lang$ = this.langSubject.asObservable();
  }

  get lang(): Lang { return this.langSubject.value; }

  toggle(): void {
    const next: Lang = this.lang === 'es' ? 'en' : 'es';
    this.langSubject.next(next);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('lang', next);
    }
  }

  applyOverrides(es: Record<string, string> = {}, en: Record<string, string> = {}): void {
    // Usamos setTimeout para aplicar los textos del backend en el siguiente fotograma,
    // evitando colisiones con el ciclo de detección de cambios de Angular (NG0100).
    setTimeout(() => {
      this.overrides = { es: { ...es }, en: { ...en } };
      this.overridesSubject.next(this.overridesSubject.value + 1);
    }, 0);
  }

  t(key: string, params?: Record<string, string | number>): string {
    const override = this.overrides[this.lang]?.[key];
    const base = this.lang === 'es' ? ES : EN;
    let value = override ?? (base as any)[key] ?? key;
    if (params) {
      for (const k of Object.keys(params)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
      }
    }
    return value;
  }
}

// ═══════════════════════════════════════════════════════
//  DICCIONARIOS
// ═══════════════════════════════════════════════════════

const ES: Record<string, string> = {
  // --- Nav ---
  'nav.pages': 'PÁGINAS',
  'nav.cv': 'MI CURRÍCULUM',
  'nav.projects': 'PROYECTOS',
  'nav.contact': 'CONTACTO',
  'nav.account': 'CUENTA',
  'nav.connected': '● CONECTADO',
  'nav.logout': 'CERRAR SESIÓN',
  'nav.login': 'INICIAR SESIÓN',
  'nav.register': 'REGISTRARSE',
  'nav.admin': 'PANEL ADMIN',
  'nav.lang': 'EN',

  // --- Hero ---
  'hero.tagline': 'DESARROLLADOR FULL-STACK ESPECIALIZADO EN IA Y BIGDATA',
  'hero.email': 'Email',
  'hero.phone': '+34 645 31 63 09',
  'hero.github': 'GitHub',
  'hero.cv': 'Descargar CV',
  'hero.cv.es': 'CV en español',
  'hero.cv.en': 'CV in English',

  // --- About ---
  'about.title': 'Sobre Mí',
  'about': 'Especialista en <strong>Inteligencia Artificial y Big Data</strong> con trayectoria previa en <strong>Quality Assurance</strong>. Combino la disciplina de pruebas con conocimientos en modelos predictivos y gestión de datos para desarrollar soluciones de IA escalables y libres de errores. Actualmente trabajando como <strong>Desarrollador Full Stack</strong> en Fundación COMPUTAEX, modernizando aplicaciones web con Python y React. Con más de un año de experiencia en QA para el sector bancario en Viewnext.',
  'about.lang.es': 'Español',
  'about.lang.es.level': 'Nativo',
  'about.lang.en': 'Inglés',
  'about.lang.en.level': 'Profesional completo',

  // --- Experience ---
  'exp.title': 'Experiencia',
  'exp.scroll_hint': 'Desliza',
  'exp.badge.current': 'Actual',
  'exp.badge.internship': 'Prácticas',
  'exp.growing': 'En crecimiento continuo',

  // --- Education ---
  'edu.title': 'Educación',
  'edu.1.name': 'Desarrollo de Aplicaciones Multiplataforma (DAM)',
  'edu.1.date': '2025 - 2026',
  'edu.2.name': 'Especialización en IA y Big Data',
  'edu.2.date': '2024 - 2025',
  'edu.3.name': 'Desarrollo de Aplicaciones Web (DAW)',
  'edu.3.date': '2022 - 2024',

  // --- Skills ---
  'skills.title': 'Habilidades Técnicas',
  'skills.ai': 'IA & Data Science',
  'skills.dev': 'Desarrollo Full Stack & Móvil',
  'skills.cloud': 'Cloud & DevOps',
  'skills.qa': 'QA & Testing',

  // --- Projects ---
  'projects.title': 'Proyectos Destacados',
  'projects.error': 'Error al cargar los proyectos.',
  'projects.none': 'No hay proyectos disponibles en este momento.',
  'projects.code': 'Código',
  'projects.demo': 'Demo',
  'projects.scan': 'Escanéame',
  'projects.featured_label': 'Selección destacada',

  // --- Footer ---
  'footer.role': 'Desarrollador Web · IA & Big Data',

  // --- Contact ---
  'contact.title': 'Contacto',
  'contact.subtitle': '¿Tienes un proyecto en mente? Hablemos.',
  'contact.location': 'Cáceres, España',
  'contact.name': 'Nombre',
  'contact.email': 'Email',
  'contact.message': 'Mensaje',
  'contact.name.required': 'El nombre es requerido.',
  'contact.email.required': 'El email es requerido.',
  'contact.email.invalid': 'Formato de email inválido.',
  'contact.message.required': 'El mensaje es requerido.',
  'contact.message.min': 'El mensaje debe tener al menos 20 caracteres.',
  'contact.name.max': 'El nombre no puede exceder los 100 caracteres.',
  'contact.empty': 'Todos los campos son obligatorios.',
  'contact.send': 'Enviar Mensaje',
  'contact.success': 'Mensaje enviado correctamente. Me pondré en contacto contigo pronto.',
  'contact.error': 'Hubo un error al enviar el mensaje. Inténtalo de nuevo más tarde.',

  // --- Login ---
  'login.back': 'Portfolio',
  'login.role': 'Desarrollador Full Stack',
  'login.tagline': 'Construyendo experiencias digitales con precisión y creatividad.',
  'login.session': 'Sesión activa',
  'login.session.hint': 'Ya has iniciado sesión en el portfolio.',
  'login.go': 'Ir al portfolio',
  'login.logout': 'Cerrar sesión',
  'login.welcome': 'Bienvenido de nuevo',
  'login.subtitle': 'Introduce tus credenciales para acceder',
  'login.email': 'Correo electrónico',
  'login.password': 'Contraseña',
  'login.email.required': 'El email es requerido.',
  'login.email.invalid': 'Formato de email inválido.',
  'login.password.required': 'La contraseña es requerida.',
  'login.password.min': 'Mínimo 6 caracteres.',
  'login.submit': 'Iniciar sesión',
  'login.loading': 'Verificando...',
  'login.no.account': '¿No tienes cuenta?',
  'login.create': 'Crear cuenta',
  'login.show.password': 'Mostrar contraseña',
  'login.hide.password': 'Ocultar contraseña',
  'login.error': 'Credenciales incorrectas o error de servidor.',

  // --- Register ---
  'register.tagline': 'Únete y accede a contenido exclusivo de mi portfolio profesional.',
  'register.session.hint': 'Ya has iniciado sesión. No es necesario crear una nueva cuenta.',
  'register.title': 'Crear cuenta',
  'register.subtitle': 'Rellena los campos para registrarte',
  'register.confirm': 'Confirmar contraseña',
  'register.confirm.placeholder': 'Repite la contraseña',
  'register.mismatch': 'Las contraseñas no coinciden.',
  'register.submit': 'Crear cuenta',
  'register.loading': 'Registrando...',
  'register.has.account': '¿Ya tienes cuenta?',
  'register.login': 'Iniciar sesión',
  'register.password.placeholder': 'Min. 6 caracteres',
  'register.error': 'Error en el registro. El email podria estar en uso.',

  // --- Admin ---
  'admin.brand.title': 'Admin',
  'admin.brand.sub': 'Portfolio JMVS',
  'admin.role.administrator': 'Administrador',
  'admin.role.editor': 'Editor',
  'admin.loading': 'Cargando datos…',

  // Sidebar sections
  'admin.section.content': 'Contenido',
  'admin.section.data': 'Datos',
  'admin.section.system': 'Sistema',

  // Tabs
  'admin.tab.dashboard': 'Dashboard',
  'admin.tab.projects': 'Proyectos',
  'admin.tab.experience': 'Experiencia',
  'admin.tab.visitors': 'Visitas',
  'admin.tab.logins': 'Inicios de sesión',
  'admin.tab.messages': 'Mensajes',
  'admin.tab.users': 'Usuarios',
  'admin.tab.profile': 'Perfil',

  // Profile
  'admin.profile.title': 'Perfil',
  'admin.profile.sub': 'Actualiza la foto y los textos que aparecen en la página principal.',
  'admin.profile.photo.title': 'Foto de perfil',
  'admin.profile.photo.sub': 'Sube una imagen cuadrada. JPG, PNG o WEBP, máximo 5 MB.',
  'admin.profile.photo.current': 'Actual',
  'admin.profile.photo.preview': 'Nueva',
  'admin.profile.photo.select': 'Elegir imagen',
  'admin.profile.photo.change': 'Cambiar imagen',
  'admin.profile.photo.upload': 'Guardar',
  'admin.profile.photo.saving': 'Subiendo…',
  'admin.profile.photo.saved': 'Foto actualizada',
  'admin.profile.photo.error': 'No se pudo subir la foto',
  'admin.profile.photo.invalid': 'Selecciona una imagen JPG, PNG o WEBP menor de 5 MB.',
  'admin.profile.texts.title': 'Textos de la página',
  'admin.profile.texts.sub': 'Textos de la página principal en el idioma activo. Usa Editar para modificarlos en ambos idiomas.',
  'admin.profile.texts.edit': 'Editar textos',
  'admin.profile.texts.edit.title': 'Editar textos de la página',
  'admin.profile.texts.save': 'Guardar textos',
  'admin.profile.texts.saving': 'Guardando…',
  'admin.profile.texts.saved': 'Textos actualizados',
  'admin.profile.texts.error': 'No se pudieron guardar los textos',
  'admin.profile.lang.es': 'Español',
  'admin.profile.lang.en': 'Inglés',
  'admin.profile.field.hero.tagline': 'Titular principal',
  'admin.profile.field.about': 'Sobre mí',
  'admin.profile.field.footer.role': 'Rol mostrado en el footer',
  'admin.profile.chatbot.title': 'Prompt del chatbot',
  'admin.profile.chatbot.sub': 'Instrucciones que recibe Nanas antes de cada conversación. Define su tono, su conocimiento sobre el perfil y cómo debe responder.',
  'admin.profile.chatbot.placeholder': 'Escribe las instrucciones para el chatbot…',
  'admin.profile.chatbot.save': 'Guardar prompt',
  'admin.profile.chatbot.saving': 'Guardando…',
  'admin.profile.chatbot.saved': 'Prompt actualizado',
  'admin.profile.chatbot.error': 'No se pudo guardar el prompt',
  'admin.profile.chatbot.empty': 'El prompt no puede estar vacío',
  'admin.profile.chatbot.reset': 'Restaurar por defecto',

  // Dashboard
  'admin.dashboard.title': 'Dashboard',
  'admin.dashboard.sub': 'Resumen general de la actividad del portfolio.',
  'admin.stat.visits': 'Visitas totales',
  'admin.stat.visits.foot': '{n} únicos',
  'admin.stat.logins': 'Inicios de sesión',
  'admin.stat.logins.foot': 'acumulado',
  'admin.stat.messages': 'Mensajes',
  'admin.stat.messages.foot': 'en buzón',
  'admin.stat.users': 'Usuarios',
  'admin.stat.users.foot': 'registrados',
  'admin.stat.projects': 'Proyectos',
  'admin.stat.projects.foot': 'publicados',
  'admin.stat.chatbot': 'Chatbot',
  'admin.stat.chatbot.foot': '{n} conversaciones',
  'admin.chart.activity.title': 'Actividad — últimos 14 días',
  'admin.chart.logins14.title': 'Logins — últimos 14 días',
  'admin.chart.tokens.title': 'Tokens gastados — histórico',

  // Users
  'admin.users.title': 'Usuarios',
  'admin.users.sub': 'Gestiona los usuarios registrados.',
  'admin.users.col.id': 'ID',
  'admin.users.col.email': 'Email',
  'admin.users.col.role': 'Rol',
  'admin.users.col.created': 'Creado',
  'admin.users.col.actions': 'Acciones',
  'admin.users.empty': 'No hay usuarios.',
  'admin.users.edit.title': 'Editar usuario',
  'admin.users.field.email': 'Email',
  'admin.users.field.role': 'Rol',

  // Projects
  'admin.projects.title': 'Proyectos',
  'admin.projects.sub.full': 'Crea, edita y elimina los proyectos del portfolio.',
  'admin.projects.sub.editor': 'Crea, edita los proyectos del portfolio.',
  'admin.projects.new': '+ Nuevo proyecto',
  'admin.projects.col.id': 'ID',
  'admin.projects.col.title': 'Título',
  'admin.projects.col.date': 'Fecha',
  'admin.projects.col.tags': 'Tags',
  'admin.projects.col.featured': 'Destacado',
  'admin.projects.col.actions': 'Acciones',
  'admin.projects.empty': 'No hay proyectos.',
  'admin.projects.yes': 'Sí',
  'admin.projects.no': 'No',
  'admin.projects.edit.title': 'Editar proyecto',
  'admin.projects.create.title': 'Crear proyecto',
  'admin.projects.field.title': 'Título',
  'admin.projects.field.desc': 'Descripción',
  'admin.projects.field.date': 'Fecha',
  'admin.projects.field.tags': 'Tags',
  'admin.projects.field.repo': 'Repositorio',
  'admin.projects.field.demo': 'Demo',
  'admin.projects.field.image': 'Imagen URL',
  'admin.projects.field.featured': 'Destacado',

  // Experience
  'admin.experience.title': 'Experiencia',
  'admin.experience.sub': 'Trayectoria profesional mostrada en el CV.',
  'admin.experience.new': '+ Nueva experiencia',
  'admin.experience.col.id': 'ID',
  'admin.experience.col.role': 'Cargo',
  'admin.experience.col.company': 'Empresa',
  'admin.experience.col.start': 'Inicio',
  'admin.experience.col.end': 'Fin',
  'admin.experience.col.actions': 'Acciones',
  'admin.experience.empty': 'No hay experiencias.',
  'admin.experience.current': 'Actualidad',
  'admin.experience.edit.title': 'Editar experiencia',
  'admin.experience.create.title': 'Crear experiencia',
  'admin.experience.field.start': 'Inicio',
  'admin.experience.field.end': 'Fin (vacío = actualidad)',
  'admin.experience.field.company': 'Empresa',
  'admin.experience.field.role': 'Cargo',
  'admin.experience.field.contract': 'Tipo contrato',
  'admin.experience.field.location': 'Ubicación',
  'admin.experience.field.desc': 'Descripción',
  'admin.experience.field.tags': 'Tags',

  // Visitors
  'admin.visitors.title': 'Visitas',
  'admin.visitors.sub': '{total} visitas registradas — {unique} únicas.',
  'admin.visitors.col.date': 'Fecha',
  'admin.visitors.col.uuid': 'UUID',
  'admin.visitors.col.ip': 'IP',
  'admin.visitors.col.browser': 'Navegador',
  'admin.visitors.col.logged': 'Logueado',
  'admin.visitors.empty': 'No hay visitas registradas.',

  // Logins
  'admin.logins.title': 'Inicios de sesión',
  'admin.logins.sub': '{n} sesiones iniciadas.',
  'admin.logins.col.date': 'Fecha',
  'admin.logins.col.email': 'Email',
  'admin.logins.col.ip': 'IP',
  'admin.logins.col.browser': 'Navegador',
  'admin.logins.col.lang': 'Idioma',
  'admin.logins.col.resolution': 'Resolución',
  'admin.logins.col.zone': 'Zona',
  'admin.logins.empty': 'No hay logins registrados.',

  // Messages
  'admin.messages.title': 'Buzón de mensajes',
  'admin.messages.sub': '{n} mensajes recibidos · {p} pendientes',
  'admin.messages.empty': 'El buzón está vacío.',
  'admin.messages.empty.filtered': 'Ningún mensaje coincide con los filtros aplicados.',
  'admin.messages.search.placeholder': 'Buscar por nombre, email o contenido…',
  'admin.messages.filter.label': 'Estado',
  'admin.messages.filter.all': 'Todos',
  'admin.messages.filter.pending': 'Pendientes',
  'admin.messages.filter.answered': 'Respondidos',
  'admin.messages.sort.label': 'Orden',
  'admin.messages.sort.newest': 'Más recientes',
  'admin.messages.sort.oldest': 'Más antiguos',
  'admin.messages.status.answered': 'Respondido',
  'admin.messages.status.pending': 'Pendiente',

  // Modal actions
  'admin.action.save': 'Guardar',
  'admin.action.cancel': 'Cancelar',
  'admin.action.edit': 'Editar',
  'admin.action.delete': 'Eliminar',
  'admin.action.close': 'Cerrar',
  'admin.action.menu': 'Abrir menú',
  'admin.mobile.sort.label': 'Ordenar por',
  'admin.mobile.sort.dir': 'Cambiar dirección',

  // Confirmations
  'admin.confirm.user.title': 'Eliminar usuario',
  'admin.confirm.user.msg': '¿Seguro que quieres eliminar al usuario "{name}"? Esta acción no se puede deshacer.',
  'admin.confirm.project.title': 'Eliminar proyecto',
  'admin.confirm.project.msg': '¿Seguro que quieres eliminar el proyecto "{name}"? Esta acción no se puede deshacer.',
  'admin.confirm.experience.title': 'Eliminar experiencia',
  'admin.confirm.experience.msg': '¿Seguro que quieres eliminar la experiencia "{name}"? Esta acción no se puede deshacer.',
  'admin.confirm.message.title': 'Eliminar mensaje',
  'admin.confirm.message.msg': '¿Seguro que quieres eliminar el mensaje de "{name}"? Esta acción no se puede deshacer.',

  // Errors / alerts
  'admin.error.role': 'No se pudo actualizar el rol',
  'admin.error.self.delete': 'No puedes eliminar tu propia cuenta',
  'admin.error.user.update': 'No se pudo actualizar el usuario',
  'admin.error.user.delete': 'No se pudo eliminar el usuario',
  'admin.error.project.save': 'Error al guardar proyecto',
  'admin.error.project.create': 'Error al crear proyecto',
  'admin.error.project.delete': 'Error al eliminar proyecto',
  'admin.error.experience.save': 'Error al guardar experiencia',
  'admin.error.experience.create': 'Error al crear experiencia',
  'admin.error.experience.delete': 'Error al eliminar experiencia',
  'admin.error.message.delete': 'Error al eliminar mensaje',
  'admin.error.message.update': 'No se pudo actualizar el mensaje',

  // Admin Chatbot
  'admin.tab.chatbot': 'Chatbot',
  'admin.chatbot.title': 'Conversaciones del Chatbot',
  'admin.chatbot.sub': '{n} mensajes en {c} conversaciones',
  'admin.chatbot.search.placeholder': 'Buscar por email o contenido…',
  'admin.chatbot.msgs': 'msgs',
  'admin.chatbot.role.user': 'Usuario',
  'admin.chatbot.role.assistant': 'Nanas',
  'admin.chatbot.empty': 'No hay conversaciones del chatbot.',
  'admin.chatbot.empty.filtered': 'Ninguna conversación coincide con la búsqueda.',
  'admin.chatbot.confirm.msg.title': 'Eliminar mensaje',
  'admin.chatbot.confirm.msg.body': '¿Seguro que quieres eliminar este mensaje del chatbot? Esta acción no se puede deshacer.',
  'admin.chatbot.confirm.convo.title': 'Eliminar conversación',
  'admin.chatbot.confirm.convo.body': '¿Seguro que quieres eliminar toda esta conversación? Esta acción no se puede deshacer.',
  'admin.error.chatbot.delete': 'Error al eliminar mensaje del chatbot',

  // --- Chatbot ---
  'chatbot.title': 'Nanas — Asistente IA',
  'chatbot.welcome': 'Hola, soy Nanas, el asistente virtual del portfolio de José Miguel. Pregunta lo que quieras.',
  'chatbot.placeholder': 'Escribe un mensaje...',
  'chatbot.send': 'Enviar',
  'chatbot.clear': 'Borrar chat',
  'chatbot.unavailable': 'El asistente no está disponible temporalmente. Inténtalo mañana.',
  'chatbot.error': 'Error al enviar el mensaje. Inténtalo de nuevo.',
};

const EN: Record<string, string> = {
  // --- Nav ---
  'nav.pages': 'PAGES',
  'nav.cv': 'MY RESUME',
  'nav.projects': 'PROJECTS',
  'nav.contact': 'CONTACT',
  'nav.account': 'ACCOUNT',
  'nav.connected': '● CONNECTED',
  'nav.logout': 'LOG OUT',
  'nav.login': 'LOG IN',
  'nav.register': 'SIGN UP',
  'nav.admin': 'ADMIN PANEL',
  'nav.lang': 'ES',

  // --- Hero ---
  'hero.tagline': 'FULL-STACK DEVELOPER SPECIALIZED IN AI AND BIG DATA',
  'hero.email': 'Email',
  'hero.phone': '+34 645 31 63 09',
  'hero.github': 'GitHub',
  'hero.cv': 'Download CV',
  'hero.cv.es': 'CV en español',
  'hero.cv.en': 'CV in English',

  // --- About ---
  'about.title': 'About Me',
  'about': '<strong>Artificial Intelligence and Big Data</strong> specialist with a previous career in <strong>Quality Assurance</strong>. I combine testing discipline with predictive modeling and data management skills to develop scalable, error-free AI solutions. Currently working as a <strong>Full Stack Developer</strong> at Fundación COMPUTAEX, modernizing web applications with Python and React. With over a year of QA experience in the banking sector at Viewnext.',
  'about.lang.es': 'Spanish',
  'about.lang.es.level': 'Native',
  'about.lang.en': 'English',
  'about.lang.en.level': 'Full professional proficiency',

  // --- Experience ---
  'exp.title': 'Experience',
  'exp.scroll_hint': 'Scroll',
  'exp.badge.current': 'Current',
  'exp.badge.internship': 'Internship',
  'exp.growing': 'Continuously growing',

  // --- Education ---
  'edu.title': 'Education',
  'edu.1.name': 'Cross-Platform Application Development',
  'edu.1.date': '2025 - 2026',
  'edu.2.name': 'AI and Big Data Specialization',
  'edu.2.date': '2024 - 2025',
  'edu.3.name': 'Web Application Development',
  'edu.3.date': '2022 - 2024',

  // --- Skills ---
  'skills.title': 'Technical Skills',
  'skills.ai': 'AI & Data Science',
  'skills.dev': 'Full Stack & Mobile Development',
  'skills.cloud': 'Cloud & DevOps',
  'skills.qa': 'QA & Testing',

  // --- Projects ---
  'projects.title': 'Featured Projects',
  'projects.error': 'Error loading projects.',
  'projects.none': 'No projects available at this time.',
  'projects.code': 'Code',
  'projects.demo': 'Demo',
  'projects.scan': 'Scan me',
  'projects.featured_label': 'Featured selection',

  // --- Footer ---
  'footer.role': 'Web Developer · AI & Big Data',

  // --- Contact ---
  'contact.title': 'Contact',
  'contact.subtitle': 'Have a project in mind? Let\'s talk.',
  'contact.location': 'Cáceres, Spain',
  'contact.name': 'Name',
  'contact.email': 'Email',
  'contact.message': 'Message',
  'contact.name.required': 'Name is required.',
  'contact.email.required': 'Email is required.',
  'contact.email.invalid': 'Invalid email format.',
  'contact.message.required': 'Message is required.',
  'contact.message.min': 'Message must be at least 20 characters long.',
  'contact.name.max': 'Name cannot exceed 100 characters.',
  'contact.empty': 'All fields are required.',
  'contact.send': 'Send Message',
  'contact.success': 'Message sent successfully. I will contact you soon.',
  'contact.error': 'There was an error sending the message. Please try again later.',

  // --- Login ---
  'login.back': 'Portfolio',
  'login.role': 'Full Stack Developer',
  'login.tagline': 'Building digital experiences with precision and creativity.',
  'login.session': 'Active session',
  'login.session.hint': 'You are already logged into the portfolio.',
  'login.go': 'Go to portfolio',
  'login.logout': 'Log out',
  'login.welcome': 'Welcome back',
  'login.subtitle': 'Enter your credentials to access',
  'login.email': 'Email address',
  'login.password': 'Password',
  'login.email.required': 'Email is required.',
  'login.email.invalid': 'Invalid email format.',
  'login.password.required': 'Password is required.',
  'login.password.min': 'Minimum 6 characters.',
  'login.submit': 'Log in',
  'login.loading': 'Verifying...',
  'login.no.account': 'Don\'t have an account?',
  'login.create': 'Create account',
  'login.show.password': 'Show password',
  'login.hide.password': 'Hide password',
  'login.error': 'Invalid credentials or server error.',

  // --- Register ---
  'register.tagline': 'Join and access exclusive content from my professional portfolio.',
  'register.session.hint': 'You are already logged in. No need to create a new account.',
  'register.title': 'Create account',
  'register.subtitle': 'Fill in the fields to sign up',
  'register.confirm': 'Confirm password',
  'register.confirm.placeholder': 'Repeat password',
  'register.mismatch': 'Passwords do not match.',
  'register.submit': 'Create account',
  'register.loading': 'Registering...',
  'register.has.account': 'Already have an account?',
  'register.login': 'Log in',
  'register.password.placeholder': 'Min. 6 characters',
  'register.error': 'Registration error. The email might already be in use.',

  // --- Admin ---
  'admin.brand.title': 'Admin',
  'admin.brand.sub': 'Portfolio JMVS',
  'admin.role.administrator': 'Administrator',
  'admin.role.editor': 'Editor',
  'admin.loading': 'Loading data…',

  // Sidebar sections
  'admin.section.content': 'Content',
  'admin.section.data': 'Data',
  'admin.section.system': 'System',

  // Tabs
  'admin.tab.dashboard': 'Dashboard',
  'admin.tab.projects': 'Projects',
  'admin.tab.experience': 'Experience',
  'admin.tab.visitors': 'Visits',
  'admin.tab.logins': 'Logins',
  'admin.tab.messages': 'Messages',
  'admin.tab.users': 'Users',
  'admin.tab.profile': 'Profile',

  // Profile
  'admin.profile.title': 'Profile',
  'admin.profile.sub': 'Update the photo and texts shown on the main page.',
  'admin.profile.photo.title': 'Profile photo',
  'admin.profile.photo.sub': 'Upload a square image. JPG, PNG or WEBP, max 5 MB.',
  'admin.profile.photo.current': 'Current',
  'admin.profile.photo.preview': 'New',
  'admin.profile.photo.select': 'Choose image',
  'admin.profile.photo.change': 'Change image',
  'admin.profile.photo.upload': 'Save',
  'admin.profile.photo.saving': 'Uploading…',
  'admin.profile.photo.saved': 'Photo updated',
  'admin.profile.photo.error': 'Could not upload the photo',
  'admin.profile.photo.invalid': 'Pick a JPG, PNG or WEBP image under 5 MB.',
  'admin.profile.texts.title': 'Page texts',
  'admin.profile.texts.sub': 'Main page texts in the active language. Use Edit to update both languages.',
  'admin.profile.texts.edit': 'Edit texts',
  'admin.profile.texts.edit.title': 'Edit page texts',
  'admin.profile.texts.save': 'Save texts',
  'admin.profile.texts.saving': 'Saving…',
  'admin.profile.texts.saved': 'Texts updated',
  'admin.profile.texts.error': 'Could not save the texts',
  'admin.profile.lang.es': 'Spanish',
  'admin.profile.lang.en': 'English',
  'admin.profile.field.hero.tagline': 'Principal headline',
  'admin.profile.field.about': 'About me',
  'admin.profile.field.footer.role': 'Footer role',
  'admin.profile.chatbot.title': 'Chatbot prompt',
  'admin.profile.chatbot.sub': 'Instructions Nanas receives before every conversation. Defines its tone, profile knowledge, and reply style.',
  'admin.profile.chatbot.placeholder': 'Write the instructions for the chatbot…',
  'admin.profile.chatbot.save': 'Save prompt',
  'admin.profile.chatbot.saving': 'Saving…',
  'admin.profile.chatbot.saved': 'Prompt updated',
  'admin.profile.chatbot.error': 'Could not save the prompt',
  'admin.profile.chatbot.empty': 'The prompt cannot be empty',
  'admin.profile.chatbot.reset': 'Reset to default',

  // Dashboard
  'admin.dashboard.title': 'Dashboard',
  'admin.dashboard.sub': 'General overview of portfolio activity.',
  'admin.stat.visits': 'Total visits',
  'admin.stat.visits.foot': '{n} unique',
  'admin.stat.logins': 'Logins',
  'admin.stat.logins.foot': 'accumulated',
  'admin.stat.messages': 'Messages',
  'admin.stat.messages.foot': 'in inbox',
  'admin.stat.users': 'Users',
  'admin.stat.users.foot': 'registered',
  'admin.stat.projects': 'Projects',
  'admin.stat.projects.foot': 'published',
  'admin.stat.chatbot': 'Chatbot',
  'admin.stat.chatbot.foot': '{n} conversations',
  'admin.chart.activity.title': 'Activity — last 14 days',
  'admin.chart.logins14.title': 'Logins — last 14 days',
  'admin.chart.tokens.title': 'Tokens spent — history',

  // Users
  'admin.users.title': 'Users',
  'admin.users.sub': 'Manage registered users.',
  'admin.users.col.id': 'ID',
  'admin.users.col.email': 'Email',
  'admin.users.col.role': 'Role',
  'admin.users.col.created': 'Created',
  'admin.users.col.actions': 'Actions',
  'admin.users.empty': 'No users.',
  'admin.users.edit.title': 'Edit user',
  'admin.users.field.email': 'Email',
  'admin.users.field.role': 'Role',

  // Projects
  'admin.projects.title': 'Projects',
  'admin.projects.sub.full': 'Create, edit and delete portfolio projects.',
  'admin.projects.sub.editor': 'Create and edit portfolio projects.',
  'admin.projects.new': '+ New project',
  'admin.projects.col.id': 'ID',
  'admin.projects.col.title': 'Title',
  'admin.projects.col.date': 'Date',
  'admin.projects.col.tags': 'Tags',
  'admin.projects.col.featured': 'Featured',
  'admin.projects.col.actions': 'Actions',
  'admin.projects.empty': 'No projects.',
  'admin.projects.yes': 'Yes',
  'admin.projects.no': 'No',
  'admin.projects.edit.title': 'Edit project',
  'admin.projects.create.title': 'Create project',
  'admin.projects.field.title': 'Title',
  'admin.projects.field.desc': 'Description',
  'admin.projects.field.date': 'Date',
  'admin.projects.field.tags': 'Tags',
  'admin.projects.field.repo': 'Repository',
  'admin.projects.field.demo': 'Demo',
  'admin.projects.field.image': 'Image URL',
  'admin.projects.field.featured': 'Featured',

  // Experience
  'admin.experience.title': 'Experience',
  'admin.experience.sub': 'Professional experience shown in the CV.',
  'admin.experience.new': '+ New experience',
  'admin.experience.col.id': 'ID',
  'admin.experience.col.role': 'Role',
  'admin.experience.col.company': 'Company',
  'admin.experience.col.start': 'Start',
  'admin.experience.col.end': 'End',
  'admin.experience.col.actions': 'Actions',
  'admin.experience.empty': 'No experiences.',
  'admin.experience.current': 'Present',
  'admin.experience.edit.title': 'Edit experience',
  'admin.experience.create.title': 'Create experience',
  'admin.experience.field.start': 'Start',
  'admin.experience.field.end': 'End (empty = present)',
  'admin.experience.field.company': 'Company',
  'admin.experience.field.role': 'Role',
  'admin.experience.field.contract': 'Contract type',
  'admin.experience.field.location': 'Location',
  'admin.experience.field.desc': 'Description',
  'admin.experience.field.tags': 'Tags',

  // Visitors
  'admin.visitors.title': 'Visits',
  'admin.visitors.sub': '{total} visits recorded — {unique} unique.',
  'admin.visitors.col.date': 'Date',
  'admin.visitors.col.uuid': 'UUID',
  'admin.visitors.col.ip': 'IP',
  'admin.visitors.col.browser': 'Browser',
  'admin.visitors.col.logged': 'Logged in',
  'admin.visitors.empty': 'No visits recorded.',

  // Logins
  'admin.logins.title': 'Logins',
  'admin.logins.sub': '{n} sessions started.',
  'admin.logins.col.date': 'Date',
  'admin.logins.col.email': 'Email',
  'admin.logins.col.ip': 'IP',
  'admin.logins.col.browser': 'Browser',
  'admin.logins.col.lang': 'Language',
  'admin.logins.col.resolution': 'Resolution',
  'admin.logins.col.zone': 'Zone',
  'admin.logins.empty': 'No logins recorded.',

  // Messages
  'admin.messages.title': 'Inbox',
  'admin.messages.sub': '{n} messages received · {p} pending',
  'admin.messages.empty': 'The inbox is empty.',
  'admin.messages.empty.filtered': 'No messages match the current filters.',
  'admin.messages.search.placeholder': 'Search by name, email or content…',
  'admin.messages.filter.label': 'Status',
  'admin.messages.filter.all': 'All',
  'admin.messages.filter.pending': 'Pending',
  'admin.messages.filter.answered': 'Answered',
  'admin.messages.sort.label': 'Sort',
  'admin.messages.sort.newest': 'Newest first',
  'admin.messages.sort.oldest': 'Oldest first',
  'admin.messages.status.answered': 'Answered',
  'admin.messages.status.pending': 'Pending',

  // Modal actions
  'admin.action.save': 'Save',
  'admin.action.cancel': 'Cancel',
  'admin.action.edit': 'Edit',
  'admin.action.delete': 'Delete',
  'admin.action.close': 'Close',
  'admin.action.menu': 'Open menu',
  'admin.mobile.sort.label': 'Sort by',
  'admin.mobile.sort.dir': 'Toggle direction',

  // Confirmations
  'admin.confirm.user.title': 'Delete user',
  'admin.confirm.user.msg': 'Are you sure you want to delete the user "{name}"? This action cannot be undone.',
  'admin.confirm.project.title': 'Delete project',
  'admin.confirm.project.msg': 'Are you sure you want to delete the project "{name}"? This action cannot be undone.',
  'admin.confirm.experience.title': 'Delete experience',
  'admin.confirm.experience.msg': 'Are you sure you want to delete the experience "{name}"? This action cannot be undone.',
  'admin.confirm.message.title': 'Delete message',
  'admin.confirm.message.msg': 'Are you sure you want to delete the message from "{name}"? This action cannot be undone.',

  // Errors / alerts
  'admin.error.role': 'Could not update the role',
  'admin.error.self.delete': 'You cannot delete your own account',
  'admin.error.user.update': 'Could not update the user',
  'admin.error.user.delete': 'Could not delete the user',
  'admin.error.project.save': 'Error saving project',
  'admin.error.project.create': 'Error creating project',
  'admin.error.project.delete': 'Error deleting project',
  'admin.error.experience.save': 'Error saving experience',
  'admin.error.experience.create': 'Error creating experience',
  'admin.error.experience.delete': 'Error deleting experience',
  'admin.error.message.delete': 'Error deleting message',
  'admin.error.message.update': 'Could not update the message',

  // Admin Chatbot
  'admin.tab.chatbot': 'Chatbot',
  'admin.chatbot.title': 'Chatbot Conversations',
  'admin.chatbot.sub': '{n} messages in {c} conversations',
  'admin.chatbot.search.placeholder': 'Search by email or content…',
  'admin.chatbot.msgs': 'msgs',
  'admin.chatbot.role.user': 'User',
  'admin.chatbot.role.assistant': 'Nanas',
  'admin.chatbot.empty': 'No chatbot conversations.',
  'admin.chatbot.empty.filtered': 'No conversations match the search.',
  'admin.chatbot.confirm.msg.title': 'Delete message',
  'admin.chatbot.confirm.msg.body': 'Are you sure you want to delete this chatbot message? This action cannot be undone.',
  'admin.chatbot.confirm.convo.title': 'Delete conversation',
  'admin.chatbot.confirm.convo.body': 'Are you sure you want to delete this entire conversation? This action cannot be undone.',
  'admin.error.chatbot.delete': 'Error deleting chatbot message',

  // --- Chatbot ---
  'chatbot.title': 'Nanas — AI Assistant',
  'chatbot.welcome': 'Hi! I\'m Nanas, the virtual assistant for José Miguel\'s portfolio. Ask me anything.',
  'chatbot.placeholder': 'Type a message...',
  'chatbot.send': 'Send',
  'chatbot.clear': 'Clear chat',
  'chatbot.unavailable': 'The assistant is temporarily unavailable. Please try again tomorrow.',
  'chatbot.error': 'Error sending the message. Please try again.',
};
