const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const TOKEN_MAX_AGE = 24 * 60 * 60 * 1000; // 24 h, igual que la expiración del JWT

function authCookieOptions(req) {
  return {
    httpOnly: true,
    secure: req.secure,
    sameSite: 'lax',
    path: '/'
  };
}

exports.register = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await pool.query(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [email, passwordHash]
    );

    res.status(201).json({ message: 'Usuario registrado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor al registrar usuario' });
  }
};

exports.login = async (req, res) => {
  const { email, password, deviceInfo } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    if (deviceInfo) {
      await pool.query(
        `INSERT INTO login_logs 
        (user_id, ip_address, user_agent, language, screen_resolution, time_zone) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          ipAddress,
          deviceInfo.userAgent,
          deviceInfo.language,
          deviceInfo.screenResolution,
          deviceInfo.timeZone
        ]
      );
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, { ...authCookieOptions(req), maxAge: TOKEN_MAX_AGE });
    res.status(200).json({ role: user.role, email: user.email, message: 'Login exitoso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor durante el login' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token', authCookieOptions(req));
  res.status(200).json({ message: 'Sesión cerrada' });
};