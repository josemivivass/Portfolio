// Mapa-mundo de visitas: choropleth de países + puntos de ciudad.
// Carga TopoJSON de /public, lo proyecta con Natural Earth y agrega por país/ciudad.
// Lee visitorLogs() del state y reacciona automáticamente a sus cambios.

import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { AdminStateService } from '../../../../../services/admin-state.service';
import { Lang } from '../../../../../services/translation.service';
import { NUMERIC_TO_ALPHA2, countryName } from '../../../../../utils/iso-country';

interface CountryFeature {
  id: string;
  alpha2: string;
  fallbackName: string;
  d: string;
}

interface CityPoint {
  city: string;
  country_code: string;
  count: number;
  x: number;
  y: number;
  r: number;
}

interface CountryStat {
  alpha2: string;
  name: string;
  count: number;
}

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.component.html',
  styleUrl: './map.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapComponent implements OnInit {
  private http = inject(HttpClient);
  protected state = inject(AdminStateService);
  private destroyRef = inject(DestroyRef);

  readonly width = 960;
  readonly height = 480;

  private readonly projection = geoNaturalEarth1()
    .fitSize([this.width, this.height], { type: 'Sphere' } as any);
  private readonly pathGen = geoPath(this.projection);

  countries = signal<CountryFeature[]>([]);
  showCities = signal(true);
  lang = signal<Lang>(this.state.i18n.lang);
  hovered = signal<{ alpha2: string; name: string; visits: number; x: number; y: number } | null>(null);

  visitsByCountry = computed(() => {
    const map = new Map<string, number>();
    for (const v of this.state.visitorLogs()) {
      const code = (v as any).country_code as string | null;
      if (code) map.set(code, (map.get(code) || 0) + 1);
    }
    return map;
  });

  topCountries = computed<CountryStat[]>(() => {
    const visits = this.visitsByCountry();
    const lang = this.lang();
    const fallback = new Map(this.countries().map(c => [c.alpha2, c.fallbackName]));
    const stats: CountryStat[] = [];
    for (const [a2, n] of visits.entries()) {
      stats.push({ alpha2: a2, name: countryName(a2, lang) || fallback.get(a2) || a2, count: n });
    }
    return stats.sort((a, b) => b.count - a.count).slice(0, 10);
  });

  cities = computed<CityPoint[]>(() => {
    const groups = new Map<string, { city: string; cc: string; lat: number; lng: number; n: number }>();
    for (const v of this.state.visitorLogs()) {
      const city = (v as any).city as string | null;
      const lat = (v as any).latitude as number | null;
      const lng = (v as any).longitude as number | null;
      const cc = (v as any).country_code as string | null;
      if (!city || lat == null || lng == null) continue;
      const key = `${cc || '??'}|${city}`;
      const existing = groups.get(key);
      if (existing) existing.n++;
      else groups.set(key, { city, cc: cc || '', lat: Number(lat), lng: Number(lng), n: 1 });
    }
    const max = Math.max(1, ...[...groups.values()].map(g => g.n));
    const points: CityPoint[] = [];
    for (const g of groups.values()) {
      const xy = this.projection([g.lng, g.lat]);
      if (!xy) continue;
      points.push({
        city: g.city,
        country_code: g.cc,
        count: g.n,
        x: xy[0],
        y: xy[1],
        r: 3 + 8 * Math.sqrt(g.n / max)
      });
    }
    // Ordena de mayor a menor radio para que los pequeños queden encima de los grandes.
    return points.sort((a, b) => b.r - a.r);
  });

  totalCountries = computed(() => this.visitsByCountry().size);
  totalCities = computed(() => this.cities().length);

  ngOnInit(): void {
    this.state.i18n.lang$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(l => this.lang.set(l));

    this.http.get<any>('/world-110m.json').subscribe({
      next: (topo) => {
        const geojson: any = feature(topo, topo.objects.countries);
        const features: CountryFeature[] = geojson.features.map((f: any, i: number) => ({
          id: f.id != null ? String(f.id) : `noid-${f?.properties?.name || i}`,
          alpha2: f.id != null ? (NUMERIC_TO_ALPHA2[String(f.id).padStart(3, '0')] || '') : '',
          fallbackName: f?.properties?.name || String(f.id ?? i),
          d: this.pathGen(f) || ''
        }));
        this.countries.set(features);
      },
      error: (err) => console.error('[map] No se pudo cargar el mapa', err)
    });
  }

  fillFor(alpha2: string): string {
    if (!alpha2) return 'var(--surface)';
    const count = this.visitsByCountry().get(alpha2) || 0;
    if (count === 0) return 'var(--surface)';
    const max = Math.max(...this.visitsByCountry().values(), 1);
    const intensity = Math.log(count + 1) / Math.log(max + 1);
    const opacity = (0.18 + 0.82 * intensity).toFixed(2);
    return `rgba(0, 123, 255, ${opacity})`;
  }

  displayName(c: CountryFeature): string {
    return countryName(c.alpha2, this.lang()) || c.fallbackName;
  }

  onCountryEnter(evt: MouseEvent, c: CountryFeature): void {
    const visits = this.visitsByCountry().get(c.alpha2) || 0;
    const svg = (evt.currentTarget as SVGElement).ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    this.hovered.set({
      alpha2: c.alpha2,
      name: this.displayName(c),
      visits,
      x: ((evt.clientX - rect.left) / rect.width) * 100,
      y: ((evt.clientY - rect.top) / rect.height) * 100
    });
  }

  onCountryLeave(): void {
    this.hovered.set(null);
  }

  toggleCities(): void {
    this.showCities.update(v => !v);
  }
}
