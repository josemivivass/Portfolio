// Geolocalización offline a partir de una IP con geoip-lite (MaxMind GeoLite2).
// Filtra IPs locales/privadas y normaliza el prefijo IPv6 ::ffff:.
// Resuelve el nombre del país en español/inglés con Intl.DisplayNames.

const geoip = require('geoip-lite');

const nameES = new Intl.DisplayNames(['es'], { type: 'region' });
const nameEN = new Intl.DisplayNames(['en'], { type: 'region' });

function countryName(code, lang = 'es') {
  if (!code) return null;
  try {
    return (lang === 'en' ? nameEN : nameES).of(code) || null;
  } catch {
    return null;
  }
}

function normalizeIp(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let ip = raw.trim();
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip === '::1' || ip === '127.0.0.1' || ip === '0.0.0.0') return null;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return null;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return null;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return null;
  return ip;
}

function geoLookup(rawIp, lang = 'es') {
  const ip = normalizeIp(rawIp);
  if (!ip) return null;
  const r = geoip.lookup(ip);
  if (!r) return null;
  const code = r.country || null;
  return {
    country_code: code,
    country_name: countryName(code, lang),
    region: r.region || null,
    city: r.city || null,
    latitude: Array.isArray(r.ll) ? r.ll[0] : null,
    longitude: Array.isArray(r.ll) ? r.ll[1] : null
  };
}

module.exports = { geoLookup };
