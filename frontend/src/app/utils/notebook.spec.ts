import { describe, it, expect } from 'vitest';
import {
  parseNotebookUrl,
  isNotebookUrl,
  colabUrl,
  rawUrl,
  nbviewerUrl,
  notebookName,
  repoUrlFromRef,
  NotebookRef,
} from './notebook';

const REF: NotebookRef = {
  owner: 'josemivivass',
  repo: 'MachineLearningPython',
  branch: 'main',
  path: 'GAN_Imagenes_JMVS.ipynb',
};

describe('parseNotebookUrl', () => {
  it('parsea una URL blob de github.com', () => {
    expect(parseNotebookUrl('https://github.com/josemivivass/MachineLearningPython/blob/main/GAN_Imagenes_JMVS.ipynb'))
      .toEqual(REF);
  });

  it('parsea una URL de colab', () => {
    expect(parseNotebookUrl('https://colab.research.google.com/github/josemivivass/MachineLearningPython/blob/main/GAN_Imagenes_JMVS.ipynb'))
      .toEqual(REF);
  });

  it('parsea una URL raw de githubusercontent', () => {
    expect(parseNotebookUrl('https://raw.githubusercontent.com/josemivivass/MachineLearningPython/main/GAN_Imagenes_JMVS.ipynb'))
      .toEqual(REF);
  });

  it('conserva rutas con subcarpetas', () => {
    const ref = parseNotebookUrl('https://github.com/o/r/blob/dev/notebooks/sub/file.ipynb');
    expect(ref?.path).toBe('notebooks/sub/file.ipynb');
    expect(ref?.branch).toBe('dev');
  });

  it('decodifica segmentos con espacios codificados', () => {
    const ref = parseNotebookUrl('https://github.com/o/r/blob/main/mi%20nota.ipynb');
    expect(ref?.path).toBe('mi nota.ipynb');
  });

  it('devuelve null para entradas vacías o no string', () => {
    expect(parseNotebookUrl(null)).toBeNull();
    expect(parseNotebookUrl(undefined)).toBeNull();
    expect(parseNotebookUrl('')).toBeNull();
  });

  it('devuelve null para URLs inválidas o no soportadas', () => {
    expect(parseNotebookUrl('no-es-una-url')).toBeNull();
    expect(parseNotebookUrl('https://github.com/owner/repo')).toBeNull();
    expect(parseNotebookUrl('https://example.com/a/b/blob/main/x.ipynb')).toBeNull();
  });
});

describe('isNotebookUrl', () => {
  it('true solo si la ruta termina en .ipynb', () => {
    expect(isNotebookUrl('https://github.com/o/r/blob/main/x.ipynb')).toBe(true);
    expect(isNotebookUrl('https://github.com/o/r/blob/main/README.md')).toBe(false);
    expect(isNotebookUrl(null)).toBe(false);
  });
});

describe('constructores de URL', () => {
  it('colabUrl', () => {
    expect(colabUrl(REF))
      .toBe('https://colab.research.google.com/github/josemivivass/MachineLearningPython/blob/main/GAN_Imagenes_JMVS.ipynb');
  });

  it('rawUrl', () => {
    expect(rawUrl(REF))
      .toBe('https://raw.githubusercontent.com/josemivivass/MachineLearningPython/main/GAN_Imagenes_JMVS.ipynb');
  });

  it('nbviewerUrl', () => {
    expect(nbviewerUrl(REF))
      .toBe('https://nbviewer.org/github/josemivivass/MachineLearningPython/blob/main/GAN_Imagenes_JMVS.ipynb');
  });

  it('repoUrlFromRef', () => {
    expect(repoUrlFromRef(REF)).toBe('https://github.com/josemivivass/MachineLearningPython');
  });

  it('codifica espacios en la ruta', () => {
    const ref: NotebookRef = { ...REF, path: 'mi carpeta/mi nota.ipynb' };
    expect(rawUrl(ref)).toContain('mi%20carpeta/mi%20nota.ipynb');
  });
});

describe('notebookName', () => {
  it('devuelve el nombre sin ruta ni extensión', () => {
    expect(notebookName(REF)).toBe('GAN_Imagenes_JMVS');
    expect(notebookName({ ...REF, path: 'a/b/Mi_Nota.ipynb' })).toBe('Mi_Nota');
  });
});
