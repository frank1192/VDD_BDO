const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('pages/login');
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    req.session.flash = { error: 'Usuario y contraseña son requeridos' };
    return res.redirect('/login');
  }

  const user = User.authenticate(username, password);
  
  if (user) {
    req.session.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    };
    req.session.flash = { success: `Bienvenido, ${user.name}` };
    return res.redirect('/dashboard');
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
