import { Pipe, PipeTransform } from '@angular/core';
import { cleanRichText } from '../utils/project-view';

// Normaliza espacios no separables y quita los style inline de Quill antes de pintar con [innerHTML].
@Pipe({ name: 'cleanHtml', standalone: true })
export class CleanHtmlPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return cleanRichText(value);
  }
}
