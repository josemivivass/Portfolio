import { Pipe, PipeTransform, Inject, PLATFORM_ID } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { isPlatformBrowser } from '@angular/common';
import DOMPurify from 'dompurify';

// Sanea HTML con DOMPurify y lo marca como confiable para pintarlo con [innerHTML].
@Pipe({ name: 'safeHtml', standalone: true })
export class SafeHtmlPipe implements PipeTransform {
  constructor(
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  transform(value: string | null | undefined): SafeHtml | string {
    const html = value ?? '';
    if (!isPlatformBrowser(this.platformId)) {
      // SSR: sin DOM para DOMPurify; devuelve la cadena y Angular la sanea.
      return html;
    }
    return this.sanitizer.bypassSecurityTrustHtml(DOMPurify.sanitize(html));
  }
}
