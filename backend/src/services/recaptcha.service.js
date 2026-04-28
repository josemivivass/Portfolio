const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

async function verifyRecaptcha(token, remoteIp) {
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) {
    console.error('Falta RECAPTCHA_SECRET en el .env');
    return false;
  }
  if (!token) return false;

  try {
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);
    if (remoteIp) params.append('remoteip', remoteIp);

    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = await response.json();
    return Boolean(data && data.success);
  } catch (error) {
    console.error('Error verificando reCAPTCHA:', error);
    return false;
  }
}

module.exports = { verifyRecaptcha };
