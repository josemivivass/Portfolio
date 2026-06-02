const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  slugifyProjectTitle,
  IMG_EXT_RE,
  resolveLocalImagePath,
  PROJECT_IMG_URL_PREFIX,
  PROJECTS_DIR,
} = require('./project-images');

describe('slugifyProjectTitle', () => {
  test('convierte el título a PascalCase sin espacios', () => {
    assert.equal(slugifyProjectTitle('mi proyecto web'), 'MiProyectoWeb');
  });

  test('quita acentos y caracteres especiales', () => {
    assert.equal(slugifyProjectTitle('Generación de Imágenes'), 'GeneracionDeImagenes');
    assert.equal(slugifyProjectTitle('App #1 (beta)!'), 'App1Beta');
  });

  test('recorta espacios alrededor', () => {
    assert.equal(slugifyProjectTitle('  Hola  Mundo  '), 'HolaMundo');
  });

  test('devuelve "Proyecto" si está vacío o no es string', () => {
    assert.equal(slugifyProjectTitle(''), 'Proyecto');
    assert.equal(slugifyProjectTitle('   '), 'Proyecto');
    assert.equal(slugifyProjectTitle('!!!'), 'Proyecto');
    assert.equal(slugifyProjectTitle(null), 'Proyecto');
    assert.equal(slugifyProjectTitle(123), 'Proyecto');
  });
});

describe('IMG_EXT_RE', () => {
  test('reconoce extensiones de imagen válidas', () => {
    for (const f of ['a.jpg', 'b.JPEG', 'c.png', 'd.webp', 'e.gif']) {
      assert.ok(IMG_EXT_RE.test(f), `${f} debería ser válida`);
    }
  });

  test('rechaza otras extensiones', () => {
    for (const f of ['a.txt', 'b.pdf', 'c.svg', 'd']) {
      assert.equal(IMG_EXT_RE.test(f), false, `${f} no debería ser válida`);
    }
  });
});

describe('resolveLocalImagePath', () => {
  test('resuelve una imagen con carpeta de proyecto', () => {
    const url = `${PROJECT_IMG_URL_PREFIX}6/foto.png`;
    assert.equal(resolveLocalImagePath(url), path.join(PROJECTS_DIR, '6', 'foto.png'));
  });

  test('resuelve una imagen sin carpeta', () => {
    const url = `${PROJECT_IMG_URL_PREFIX}foto.png`;
    assert.equal(resolveLocalImagePath(url), path.join(PROJECTS_DIR, 'foto.png'));
  });

  test('devuelve null si la url no tiene el prefijo esperado', () => {
    assert.equal(resolveLocalImagePath('/otra/ruta/foto.png'), null);
    assert.equal(resolveLocalImagePath('https://externo.com/foto.png'), null);
  });

  test('devuelve null si no es string', () => {
    assert.equal(resolveLocalImagePath(null), null);
    assert.equal(resolveLocalImagePath(undefined), null);
    assert.equal(resolveLocalImagePath(123), null);
  });

  test('devuelve null ante más de dos segmentos (traversal típico)', () => {
    assert.equal(resolveLocalImagePath(`${PROJECT_IMG_URL_PREFIX}6/../../etc/passwd`), null);
  });
});
