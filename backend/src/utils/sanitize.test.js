const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { normType, normStatus, normNotebookUrl, normRichText } = require('./sanitize');

describe('normType', () => {
  test('acepta los tipos válidos', () => {
    assert.equal(normType('web'), 'web');
    assert.equal(normType('android'), 'android');
    assert.equal(normType('ai'), 'ai');
    assert.equal(normType('other'), 'other');
  });

  test('cae en "web" ante valores inválidos', () => {
    assert.equal(normType('desktop'), 'web');
    assert.equal(normType(''), 'web');
    assert.equal(normType(undefined), 'web');
    assert.equal(normType(null), 'web');
  });
});

describe('normStatus', () => {
  test('acepta los estados válidos', () => {
    assert.equal(normStatus('production'), 'production');
    assert.equal(normStatus('development'), 'development');
    assert.equal(normStatus('archived'), 'archived');
  });

  test('devuelve null ante valores inválidos', () => {
    assert.equal(normStatus('online'), null);
    assert.equal(normStatus(''), null);
    assert.equal(normStatus(undefined), null);
  });
});

describe('normNotebookUrl', () => {
  test('acepta URLs http(s) y las recorta', () => {
    assert.equal(
      normNotebookUrl('  https://github.com/u/r/blob/main/x.ipynb  '),
      'https://github.com/u/r/blob/main/x.ipynb'
    );
    assert.equal(normNotebookUrl('http://example.com'), 'http://example.com');
  });

  test('limita la longitud a 500 caracteres', () => {
    const long = 'https://example.com/' + 'a'.repeat(600);
    assert.equal(normNotebookUrl(long).length, 500);
  });

  test('devuelve null si no es http(s) o no es string', () => {
    assert.equal(normNotebookUrl('ftp://x/y'), null);
    assert.equal(normNotebookUrl('no-es-url'), null);
    assert.equal(normNotebookUrl(''), null);
    assert.equal(normNotebookUrl(null), null);
    assert.equal(normNotebookUrl(42), null);
  });
});

describe('normRichText', () => {
  test('reemplaza &nbsp; y U+00A0 por espacios', () => {
    assert.equal(normRichText('Hola&nbsp;mundo'), 'Hola mundo');
    assert.equal(normRichText('Hola mundo'), 'Hola mundo');
  });

  test('elimina atributos style inline (comillas dobles y simples)', () => {
    assert.equal(normRichText('<p style="color:red">x</p>'), '<p>x</p>');
    assert.equal(normRichText("<span style='font-weight:bold'>y</span>"), '<span>y</span>');
  });

  test('conserva el resto del marcado', () => {
    assert.equal(normRichText('<strong>A</strong> <em>B</em>'), '<strong>A</strong> <em>B</em>');
  });

  test('devuelve el valor tal cual si no es string', () => {
    assert.equal(normRichText(null), null);
    assert.equal(normRichText(undefined), undefined);
  });
});
