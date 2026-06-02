import { Pipe, PipeTransform } from '@angular/core';

// Normaliza espacios no separables y quita los style inline de Quill antes de pintar con [innerHTML].
@Pipe({ name: 'cleanHtml', standalone: true })
export class CleanHtmlPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return (value || '')
      .replace(/&nbsp;/g, ' ')
      .replace(/ /g, ' ')
      .replace(/\s*style\s*=\s*("[^"]*"|'[^']*')/gi, '');
  }
}
