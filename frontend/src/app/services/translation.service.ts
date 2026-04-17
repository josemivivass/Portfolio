import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export type Lang = 'es' | 'en';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private langSubject!: BehaviorSubject<Lang>;
  lang$!: ReturnType<BehaviorSubject<Lang>['asObservable']>;

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

  t(key: string, params?: Record<string, string | number>): string {
    const dict = this.lang === 'es' ? ES : EN;
    let value = (dict as any)[key] ?? key;
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
  'hero.badge': 'Disponible para trabajar',
  'hero.title': 'Desarrollador Web · IA & Big Data',
  'hero.subtitle': 'Especialista en Inteligencia Artificial y Big Data con trayectoria en QA.',
  'hero.subtitle2': 'Combino la disciplina de pruebas con modelos predictivos y gestión de datos.',
  'hero.email': 'Email',
  'hero.phone': '+34 645 31 63 09',
  'hero.location': 'Cáceres, Extremadura, España · Presencial · Híbrido · Remoto',

  // --- About ---
  'about.title': 'Sobre Mí',
  'about.p1': 'Especialista en <strong>Inteligencia Artificial y Big Data</strong> con trayectoria previa en <strong>Quality Assurance</strong>. Combino la disciplina de pruebas con conocimientos en modelos predictivos y gestión de datos para desarrollar soluciones de IA escalables y libres de errores.',
  'about.p2': 'Actualmente trabajando como <strong>Desarrollador Full Stack</strong> en Fundación COMPUTAEX, modernizando aplicaciones web con Python y React. Con más de un año de experiencia en QA para el sector bancario en Viewnext.',
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
  'exp.1.role': 'Desarrollador Full Stack',
  'exp.1.date': 'Mar 2026 - Actualidad',
  'exp.1.company': 'Fundación COMPUTAEX · Contrato de prácticas · Cáceres',
  'exp.1.desc': 'Actualización y modernización de una aplicación web full-stack. Desarrollo y mantenimiento del backend con Python. Actualización y desarrollo del frontend con React en entorno Node.js.',
  'exp.2.role': 'Quality Engineering',
  'exp.2.date': 'Jul 2024 - Jul 2025',
  'exp.2.company': 'Viewnext · Jornada completa · Cáceres',
  'exp.2.desc': 'Pruebas para la app y API de bancos en el proyecto RSI. Ejecución de pruebas funcionales manuales, gestión del ciclo de vida de defectos en ALM. Validación de APIs REST y SOAP con SoapUI y Postman. Pruebas de carga con LoadRunner, JMeter, InfluxDB y Grafana.',
  'exp.3.role': 'Quality Engineering',
  'exp.3.date': 'Mar 2024 - Jun 2024',
  'exp.3.company': 'Viewnext · Contrato de prácticas · Cáceres',
  'exp.3.desc': 'Realización de pruebas de rendimiento para webs.',
  'exp.4.role': 'Camp Counselor',
  'exp.4.date': 'Jun 2022 - Ago 2022',
  'exp.4.company': 'Camp Hilltop · Hancock, Nueva York, EE.UU.',
  'exp.4.desc': 'Organización y supervisión de actividades para niños de 6 a 16 años, como equitación, senderismo y dinámicas grupales.',

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
  'contact.message.min': 'Mínimo 10 caracteres.',
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
  'admin.chart.visits.title': 'Visitas — últimos 14 días',
  'admin.chart.visits.pill': '{n} totales',
  'admin.chart.logins.title': 'Inicios de sesión — últimos 14 días',
  'admin.chart.logins.pill': '{n} totales',
  'admin.chart.activity.title': 'Actividad — últimos 14 días',
  'admin.chart.logins14.title': 'Logins — últimos 14 días',

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
  'admin.projects.field.title.es': 'Título (ES)',
  'admin.projects.field.title.en': 'Título (EN)',
  'admin.projects.field.desc.es': 'Descripción (ES)',
  'admin.projects.field.desc.en': 'Descripción (EN)',
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
  'admin.experience.field.role.es': 'Cargo (ES)',
  'admin.experience.field.role.en': 'Cargo (EN)',
  'admin.experience.field.contract.es': 'Tipo contrato (ES)',
  'admin.experience.field.contract.en': 'Tipo contrato (EN)',
  'admin.experience.field.location.es': 'Ubicación (ES)',
  'admin.experience.field.location.en': 'Ubicación (EN)',
  'admin.experience.field.desc.es': 'Descripción (ES)',
  'admin.experience.field.desc.en': 'Descripción (EN)',
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
  'hero.badge': 'Open to work',
  'hero.title': 'Web Developer · AI & Big Data',
  'hero.subtitle': 'AI and Big Data specialist with a background in QA.',
  'hero.subtitle2': 'I combine testing discipline with predictive models and data management.',
  'hero.email': 'Email',
  'hero.phone': '+34 645 31 63 09',
  'hero.location': 'Cáceres, Extremadura, Spain · On-site · Hybrid · Remote',

  // --- About ---
  'about.title': 'About Me',
  'about.p1': '<strong>Artificial Intelligence and Big Data</strong> specialist with a previous career in <strong>Quality Assurance</strong>. I combine testing discipline with predictive modeling and data management skills to develop scalable, error-free AI solutions.',
  'about.p2': 'Currently working as a <strong>Full Stack Developer</strong> at Fundación COMPUTAEX, modernizing web applications with Python and React. With over a year of QA experience in the banking sector at Viewnext.',
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
  'exp.1.role': 'Full Stack Developer',
  'exp.1.date': 'Mar 2026 - Present',
  'exp.1.company': 'Fundación COMPUTAEX · Internship · Cáceres',
  'exp.1.desc': 'Updating and modernizing a full-stack web application. Backend development and maintenance with Python. Frontend development with React in a Node.js environment.',
  'exp.2.role': 'Quality Engineering',
  'exp.2.date': 'Jul 2024 - Jul 2025',
  'exp.2.company': 'Viewnext · Full-time · Cáceres',
  'exp.2.desc': 'Testing banking apps and APIs in the RSI project. Manual functional testing, defect lifecycle management in ALM. REST and SOAP API validation with SoapUI and Postman. Load testing with LoadRunner, JMeter, InfluxDB and Grafana.',
  'exp.3.role': 'Quality Engineering',
  'exp.3.date': 'Mar 2024 - Jun 2024',
  'exp.3.company': 'Viewnext · Internship · Cáceres',
  'exp.3.desc': 'Performance testing for web applications.',
  'exp.4.role': 'Camp Counselor',
  'exp.4.date': 'Jun 2022 - Aug 2022',
  'exp.4.company': 'Camp Hilltop · Hancock, New York, USA',
  'exp.4.desc': 'Organizing and supervising activities for children aged 6-16, including horseback riding, hiking, and group dynamics.',

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
  'contact.message.min': 'Minimum 10 characters.',
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
  'admin.chart.visits.title': 'Visits — last 14 days',
  'admin.chart.visits.pill': '{n} total',
  'admin.chart.logins.title': 'Logins — last 14 days',
  'admin.chart.logins.pill': '{n} total',
  'admin.chart.activity.title': 'Activity — last 14 days',
  'admin.chart.logins14.title': 'Logins — last 14 days',

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
  'admin.projects.field.title.es': 'Title (ES)',
  'admin.projects.field.title.en': 'Title (EN)',
  'admin.projects.field.desc.es': 'Description (ES)',
  'admin.projects.field.desc.en': 'Description (EN)',
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
  'admin.experience.field.role.es': 'Role (ES)',
  'admin.experience.field.role.en': 'Role (EN)',
  'admin.experience.field.contract.es': 'Contract type (ES)',
  'admin.experience.field.contract.en': 'Contract type (EN)',
  'admin.experience.field.location.es': 'Location (ES)',
  'admin.experience.field.location.en': 'Location (EN)',
  'admin.experience.field.desc.es': 'Description (ES)',
  'admin.experience.field.desc.en': 'Description (EN)',
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
