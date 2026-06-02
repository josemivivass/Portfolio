// Genera public/sitemap.xml con la fecha del build para no mantener el lastmod a mano.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE_URL = 'https://josemivivass.com';

const URLS = [
  { path: '/',         changefreq: 'monthly', priority: '1.0' },
  { path: '/contacto', changefreq: 'yearly',  priority: '0.5' },
];

const lastmod = new Date().toISOString().slice(0, 10);

const body = URLS.map(({ path, changefreq, priority }) =>
  `  <url>
    <loc>${BASE_URL}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

const outPath = fileURLToPath(new URL('../public/sitemap.xml', import.meta.url));
writeFileSync(outPath, xml, 'utf8');
console.log(`[sitemap] generado ${outPath} (lastmod ${lastmod})`);
