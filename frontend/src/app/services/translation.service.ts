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

  t(key: string): string {
    const dict = this.lang === 'es' ? ES : EN;
    return (dict as any)[key] ?? key;
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
};
