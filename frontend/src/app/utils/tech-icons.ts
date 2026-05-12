// Resuelve un tag de stack (ej. "Angular", "Power BI", "OpenAI API") a
// la URL de un SVG que se pinta junto al texto del chip en proyectos,
// experiencia, home (skills) y el perfil admin.

const COLOR = '007bff';
const si  = (slug: string) => `https://cdn.simpleicons.org/${slug}/${COLOR}`;
const iff = (icon: string) => `https://api.iconify.design/${icon}.svg?color=%23${COLOR}`;

const TECH_ICON_MAP: Record<string, string> = {
  'angular':            si('angular'),
  'typescript':         si('typescript'),
  'javascript':         si('javascript'),
  'js':                 si('javascript'),
  'node.js':            si('nodedotjs'),
  'nodejs':             si('nodedotjs'),
  'node':               si('nodedotjs'),
  'react':              si('react'),
  'react.js':           si('react'),
  'vue':                si('vuedotjs'),
  'next.js':            si('nextdotjs'),
  'nextjs':             si('nextdotjs'),
  'html':               si('html5'),
  'html5':              si('html5'),
  'css':                si('css'),
  'css3':               si('css'),
  'html5/css3':         si('html5'),
  'sass':               si('sass'),
  'tailwind':           si('tailwindcss'),
  'tailwindcss':        si('tailwindcss'),
  'bootstrap':          si('bootstrap'),
  'python':             si('python'),
  'java':               si('openjdk'),
  'kotlin':             si('kotlin'),
  'android':            si('android'),
  'flutter':            si('flutter'),
  'dart':               si('dart'),

  'mysql':              si('mysql'),
  'sql':                si('mysql'),
  'postgres':           si('postgresql'),
  'postgresql':         si('postgresql'),
  'mongodb':            si('mongodb'),
  'redis':              si('redis'),

  'aws':                iff('mdi:aws'),
  'docker':             si('docker'),
  'gcp':                iff('mdi:google-cloud'),
  'azure':              iff('mdi:microsoft-azure'),
  'firebase':           si('firebase'),
  'github':             si('github'),
  'git':                si('git'),
  'gitlab':             si('gitlab'),
  'linux':              si('linux'),

  'express':            si('express'),
  'express.js':         si('express'),
  'django':             si('django'),
  'flask':              si('flask'),
  'fastapi':            si('fastapi'),
  'spring':             si('spring'),
  'laravel':            si('laravel'),
  'php':                si('php'),

  'tensorflow':         si('tensorflow'),
  'pytorch':            si('pytorch'),
  'scikit-learn':       si('scikitlearn'),
  'pandas':             si('pandas'),
  'numpy':              si('numpy'),
  'openai':             iff('simple-icons:openai'),
  'openai api':         iff('simple-icons:openai'),
  'langchain':          si('langchain'),
  'llms':               iff('carbon:machine-learning-model'),
  'rags':               iff('carbon:document-tasks'),
  'llamaindex':         iff('lucide:bot-message-square'),
  'machine learning':   iff('carbon:machine-learning-model'),
  'power bi':           iff('simple-icons:powerbi'),
  'groq cloud':         iff('lucide:zap'),
  'groq':               iff('lucide:zap'),

  'jmeter':             si('apachejmeter'),
  'loadrunner':         iff('carbon:test-tool'),
  'postman':            si('postman'),
  'soapui':             iff('carbon:api-1'),
  'alm':                iff('carbon:task-tools'),
  'grafana':            si('grafana'),
  'influxdb':           si('influxdb'),
  'rest apis':          si('openapiinitiative'),

  'figma':              si('figma'),
  'three.js':           si('threedotjs'),
  'gsap':               si('greensock'),
};

export function techIcon(rawTag: string): string {
  if (!rawTag) return '';
  return TECH_ICON_MAP[rawTag.trim().toLowerCase()] ?? '';
}

export function hideIconOnError(event: Event): void {
  (event.target as HTMLImageElement).style.display = 'none';
}
