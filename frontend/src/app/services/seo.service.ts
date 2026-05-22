import { Injectable, inject, DOCUMENT } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { TranslationService, Lang } from './translation.service';

// Metadatos SEO que dependen del idioma. El <title> de la página es fijo
// (solo el nombre) y no se localiza, por eso no forma parte de esta estructura.
interface SeoMeta {
  description: string;
  ogTitle: string;
  ogLocale: string;
}

// Título de la página: siempre el nombre, sin sufijos ni en ES ni en EN.
const PAGE_TITLE = 'José Miguel Vivas Sánchez';

const SEO: Record<Lang, SeoMeta> = {
  es: {
    description:
      'Portfolio de José Miguel Vivas Sánchez, desarrollador full-stack especializado ' +
      'en Inteligencia Artificial y Big Data. Proyectos, experiencia y formación.',
    ogTitle: 'José Miguel Vivas Sánchez — Desarrollador Full-Stack & IA',
    ogLocale: 'es_ES'
  },
  en: {
    description:
      'Portfolio of José Miguel Vivas Sánchez, full-stack developer specialized ' +
      'in Artificial Intelligence and Big Data. Projects, experience and education.',
    ogTitle: 'José Miguel Vivas Sánchez — Full-Stack & AI Developer',
    ogLocale: 'en_US'
  }
};

/**
 * Mantiene las meta tags (description, Open Graph, Twitter) y el atributo
 * `lang` del <html> sincronizados con el idioma activo del TranslationService.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private meta = inject(Meta);
  private title = inject(Title);
  private i18n = inject(TranslationService);
  private document = inject(DOCUMENT);

  // Se llama una vez al arrancar (lado navegador). El <title> queda fijo y, a
  // partir de ahí, las meta tags se reaplican con cada cambio de idioma.
  init(): void {
    this.title.setTitle(PAGE_TITLE);
    this.i18n.lang$.subscribe((lang) => this.apply(lang));
  }

  private apply(lang: Lang): void {
    const m = SEO[lang] ?? SEO.es;
    const altLocale = lang === 'es' ? 'en_US' : 'es_ES';

    this.document.documentElement.lang = lang;

    this.meta.updateTag({ name: 'description', content: m.description });

    this.meta.updateTag({ property: 'og:title', content: m.ogTitle });
    this.meta.updateTag({ property: 'og:description', content: m.description });
    this.meta.updateTag({ property: 'og:image:alt', content: m.ogTitle });
    this.meta.updateTag({ property: 'og:locale', content: m.ogLocale });
    this.meta.updateTag({ property: 'og:locale:alternate', content: altLocale });

    this.meta.updateTag({ name: 'twitter:title', content: m.ogTitle });
    this.meta.updateTag({ name: 'twitter:description', content: m.description });
  }
}
