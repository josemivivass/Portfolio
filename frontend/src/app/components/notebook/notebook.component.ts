import {
  Component, Input, OnChanges, ChangeDetectorRef, ChangeDetectionStrategy,
  ViewEncapsulation, Inject, PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { parseNotebookUrl, rawUrl } from '../../utils/notebook';
import { renderNotebook, NbDoc } from '../../utils/notebook-render';
import { TranslationService } from '../../services/translation.service';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';

/**
 * Renderiza un notebook .ipynb de GitHub directamente en el DOM (markdown,
 * código y salidas), sin nbviewer ni iframes. Pensado para embeberse en la
 * tarjeta de proyecto.
 */
@Component({
  selector: 'app-notebook',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './notebook.component.html',
  styleUrls: ['./notebook.component.css'],
})
export class NotebookComponent implements OnChanges {
  @Input() url: string | null = null;

  doc: NbDoc | null = null;
  loading = false;
  failed = false;

  private loadedUrl: string | null = null;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    public i18n: TranslationService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnChanges(): void {
    // El notebook se descarga y pinta solo en el navegador (no en SSR).
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.url === this.loadedUrl) return;
    this.loadedUrl = this.url;
    this.load();
  }

  private load(): void {
    const ref = parseNotebookUrl(this.url);
    if (!ref) {
      this.doc = null;
      this.failed = true;
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }
    this.doc = null;
    this.failed = false;
    this.loading = true;
    this.cdr.markForCheck();

    this.http.get(rawUrl(ref), { responseType: 'text' }).subscribe({
      next: (text) => {
        try {
          const doc = renderNotebook(JSON.parse(text));
          this.doc = doc;
          this.failed = doc.cells.length === 0;
        } catch {
          this.doc = null;
          this.failed = true;
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.doc = null;
        this.failed = true;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
