// Saneo y normalización de campos de proyecto antes de guardarlos en la BD.

const ALLOWED_TYPES = ['web', 'android', 'ai', 'other'];
const ALLOWED_STATUS = ['production', 'development', 'archived'];

const normType = (v) => (ALLOWED_TYPES.includes(v) ? v : 'web');

const normStatus = (v) => (ALLOWED_STATUS.includes(v) ? v : null);

const normNotebookUrl = (v) => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t || !/^https?:\/\//i.test(t)) return null;
  return t.slice(0, 500);
};

// Quita &nbsp; / U+00A0 y los style inline que mete Quill.
const normRichText = (v) => {
  if (typeof v !== 'string') return v;
  return v
    .replace(/&nbsp;/g, ' ')
    .replace(/ /g, ' ')
    .replace(/\s*style\s*=\s*("[^"]*"|'[^']*')/gi, '');
};

module.exports = {
  ALLOWED_TYPES,
  ALLOWED_STATUS,
  normType,
  normStatus,
  normNotebookUrl,
  normRichText,
};
