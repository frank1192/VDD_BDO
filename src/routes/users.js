const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Note = require('../models/note');
const UserIndicatorConfig = require('../models/userIndicatorConfig');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth);

// List all users
router.get('/', requireAdmin, (req, res) => {
  const users = User.getAllWithTeamInfo();
  const leaders = User.getLeaders();
  const coordinators = User.getCoordinators();
  res.render('pages/users/list', { users, leaders, coordinators });
});

// Create user form
router.get('/new', requireAdmin, (req, res) => {
  const leaders = User.getLeaders();
  const coordinators = User.getCoordinators();
  res.render('pages/users/form', { user: null, leaders, coordinators, isEdit: false });
});

// Create user
router.post('/', requireAdmin, (req, res) => {
  const { username, password, name, role, team_leader_id } = req.body;
  
  // Valid roles
  const validRoles = ['admin', 'analyst', 'coordinator', 'leader'];
  
  // Validation
  if (!username || !password || !name || !role) {
    req.session.flash = { error: 'Todos los campos son requeridos' };
    return res.redirect('/users/new');
  }

  // Validate role
  if (!validRoles.includes(role)) {
    req.session.flash = { error: 'Rol no válido' };
    return res.redirect('/users/new');
  }

  // Check if username exists
  const existingUser = User.getByUsername(username);
  if (existingUser) {
    req.session.flash = { error: 'El nombre de usuario ya existe' };
    return res.redirect('/users/new');
  }

  try {
    const userId = User.create({ username, password, name, role, team_leader_id });
    
    // Initialize notes and configs for the new user
    if (role !== 'admin') {
      Note.initializeUserNotes(userId, role);
      UserIndicatorConfig.initializeForUser(userId, role);
    }
    
    req.session.flash = { success: 'Usuario creado exitosamente' };
    res.redirect('/users');
  } catch (error) {
    req.session.flash = { error: 'Error al crear el usuario: ' + error.message };
    res.redirect('/users/new');
  }
});

// Edit user form
router.get('/:id/edit', requireAdmin, (req, res) => {
  const user = User.getById(req.params.id);
  if (!user) {
    req.session.flash = { error: 'Usuario no encontrado' };
    return res.redirect('/users');
  }
  const leaders = User.getLeaders();
  const coordinators = User.getCoordinators();
  res.render('pages/users/form', { user, leaders, coordinators, isEdit: true });
});

// Update user
router.post('/:id', requireAdmin, (req, res) => {
  const { username, password, name, role, team_leader_id } = req.body;
  const userId = req.params.id;
  
  // Valid roles
  const validRoles = ['admin', 'analyst', 'coordinator', 'leader'];
  
  // Validation
  if (!username || !name || !role) {
    req.session.flash = { error: 'Usuario, nombre y rol son requeridos' };
    return res.redirect(`/users/${userId}/edit`);
  }

  // Validate role
  if (!validRoles.includes(role)) {
    req.session.flash = { error: 'Rol no válido' };
    return res.redirect(`/users/${userId}/edit`);
  }

  try {
    User.update(userId, { username, name, role, team_leader_id });
    
    // Update password only if provided
    if (password && password.trim()) {
      User.updatePassword(userId, password);
    }
    
    req.session.flash = { success: 'Usuario actualizado exitosamente' };
    res.redirect('/users');
  } catch (error) {
    req.session.flash = { error: 'Error al actualizar el usuario: ' + error.message };
    res.redirect(`/users/${userId}/edit`);
  }
});

// Delete user
router.post('/:id/delete', requireAdmin, (req, res) => {
  try {
    User.delete(req.params.id);
    req.session.flash = { success: 'Usuario eliminado exitosamente' };
  } catch (error) {
    req.session.flash = { error: 'Error al eliminar el usuario: ' + error.message };
  }
  res.redirect('/users');
});

// Configure user percentages
router.get('/:id/config', requireAdmin, (req, res) => {
  const user = User.getById(req.params.id);
  if (!user) {
    req.session.flash = { error: 'Usuario no encontrado' };
    return res.redirect('/users');
  }
  
  const configs = UserIndicatorConfig.getByUserId(user.id);
  const totalPercentage = UserIndicatorConfig.getTotalPercentage(user.id);
  
  res.render('pages/users/config', { user, configs, totalPercentage });
});

// Update user percentages
router.post('/:id/config', requireAdmin, (req, res) => {
  const userId = req.params.id;
  const { indicators } = req.body;
  
  try {
    // indicators is an object: { indicatorId: { percentage, global_value } }
    for (const [indicatorId, config] of Object.entries(indicators || {})) {
      const percentage = parseFloat(config.percentage) || 0;
      const globalValue = config.global_value !== '' ? parseFloat(config.global_value) : null;
      
      // Validate percentage range
      if (percentage < 0 || percentage > 100) {
        req.session.flash = { error: 'Los porcentajes deben estar entre 0 y 100' };
        return res.redirect(`/users/${userId}/config`);
      }
      
      // Validate global value if provided
      if (globalValue !== null && (globalValue < 0 || globalValue > 100)) {
        req.session.flash = { error: 'Los valores globales deben estar entre 0 y 100' };
        return res.redirect(`/users/${userId}/config`);
      }
      
      UserIndicatorConfig.upsert(userId, indicatorId, { percentage, global_value: globalValue });
    }
    
    // Validate total percentage
    const totalPercentage = UserIndicatorConfig.getTotalPercentage(userId);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      req.session.flash = { warning: `Configuración guardada. Advertencia: Los porcentajes suman ${totalPercentage.toFixed(2)}% (deben sumar 100%)` };
    } else {
      req.session.flash = { success: 'Configuración guardada exitosamente' };
    }
    
    res.redirect(`/users/${userId}/config`);
  } catch (error) {
    req.session.flash = { error: 'Error al guardar la configuración: ' + error.message };
    res.redirect(`/users/${userId}/config`);
  }
});

module.exports = router;
