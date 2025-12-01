const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const User = require('../models/user');

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Demasiados intentos de inicio de sesión. Por favor, intente de nuevo en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    req.session.flash = { error: 'Demasiados intentos de inicio de sesión. Por favor, intente de nuevo en 15 minutos.' };
    return res.redirect('/login');
  }
});

router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('pages/login');
});

router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    req.session.flash = { error: 'Usuario y contraseña son requeridos' };
    return res.redirect('/login');
  }

  const user = User.authenticate(username, password);
  
  if (user) {
    // Regenerate session to prevent session fixation
    const userData = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    };
    req.session.regenerate((err) => {
      if (err) {
        req.session.flash = { error: 'Error al iniciar sesión' };
        return res.redirect('/login');
      }
      req.session.user = userData;
      req.session.flash = { success: `Bienvenido, ${user.name}` };
      return res.redirect('/dashboard');
    });
  } else {
    req.session.flash = { error: 'Usuario o contraseña incorrectos' };
    return res.redirect('/login');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
