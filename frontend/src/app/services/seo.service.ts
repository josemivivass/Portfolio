import { Injectable, inject, DOCUMENT } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { TranslationService, Lang } from './translation.service';

const BASE_URL = 'https://josemivivass.com';

// Rutas que no deben indexarse (también bloqueadas en robots.txt).
const NOINDEX_PREFIXES = ['/login', '/register', '/admin'];

const PAGE_TITLE = 'José Miguel Vivas Sánchez';

interface SeoMeta {
  title: string;
  description: string;
  ogTitle: string;
}

// Metadatos de la home (ruta por defecto). El title se mantiene como el nombre (marca).
const HOME: Record<Lang, SeoMeta> = {
  es: {
    title: PAGE_TITLE,
    description:
      'Portfolio de José Miguel Vivas Sánchez, desarrollador full-stack especializado ' +
      'en Inteligencia Artificial y Big Data. Proyectos, experiencia y formación.',
    ogTitle: 'José Miguel Vivas Sánchez — Desarrollador Full-Stack & IA'
  },
  en: {
    title: PAGE_TITLE,
    description:
      'Portfolio of José Miguel Vivas Sánchez, full-stack developer specialized ' +
      'in Artificial Intelligence and Big Data. Projects, experience and education.',
    ogTitle: 'José Miguel Vivas Sánchez — Full-Stack & AI Developer'
  }
};

// Overrides de metadatos por ruta indexable.
const ROUTES: Record<string, Record<Lang, SeoMeta>> = {
  '/contacto': {
    es: {
      title: 'Contacto — ' + PAGE_TITLE,
      description:
        'Ponte en contacto con José Miguel Vivas Sánchez para proyectos, ' +
        'colaboraciones u oportunidades laborales.',
      ogTitle: 'Contacto — ' + PAGE_TITLE
    },
    en: {
      title: 'Contact — ' + PAGE_TITLE,
      description:
        'Get in touch with José Miguel Vivas Sánchez about projects, ' +
        'collaborations or job opportunities.',
      ogTitle: 'Contact — ' + PAGE_TITLE
    }
  }
};

const OG_LOCALE: Record<Lang, string> = { es: 'es_ES', en: 'en_US' };

@Injectable({ providedIn: 'root' })
export class SeoService {
  private meta = inject(Meta);
  private title = inject(Title);
  private i18n = inject(TranslationService);
  private document = inject(DOCUMENT);
  private router = inject(Router);

  private lang: Lang = 'es';
  private path = '/';

  // Se llama una vez al arrancar (lado navegador).
  init(): void {
    this.path = this.cleanPath(this.router.url);
    this.i18n.lang$.subscribe((lang) => { this.lang = lang; this.render(); });
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => { this.path = this.cleanPath(e.urlAfterRedirects); this.render(); });
  }

  // Aplica title y meta combinando ruta + idioma activos.
  private render(): void {
    const m = ROUTES[this.path]?.[this.lang] ?? HOME[this.lang] ?? HOME.es;
    const canonical = BASE_URL + this.path;
    const noindex = NOINDEX_PREFIXES.some((p) => this.path === p || this.path.startsWith(p + '/'));

    this.document.documentElement.lang = this.lang;
    this.title.setTitle(m.title);
    this.meta.updateTag({ name: 'description', content: m.description });
    this.meta.updateTag({ name: 'robots', content: noindex ? 'noindex, nofollow' : 'index, follow' });

    this.meta.updateTag({ property: 'og:title', content: m.ogTitle });
    this.meta.updateTag({ property: 'og:description', content: m.description });
    this.meta.updateTag({ property: 'og:image:alt', content: m.ogTitle });
    this.meta.updateTag({ property: 'og:locale', content: OG_LOCALE[this.lang] });
    this.meta.updateTag({ property: 'og:locale:alternate', content: this.lang === 'es' ? 'en_US' : 'es_ES' });
    this.meta.updateTag({ property: 'og:url', content: canonical });

    this.meta.updateTag({ name: 'twitter:title', content: m.ogTitle });
    this.meta.updateTag({ name: 'twitter:description', content: m.description });

    this.setCanonical(canonical);
  }

  private cleanPath(url: string): string {
    return url.split('?')[0].split('#')[0] || '/';
  }

  private setCanonical(href: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}
