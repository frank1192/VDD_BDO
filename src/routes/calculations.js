const express = require('express');
const router = express.Router();
const Calculation = require('../models/calculation');
const User = require('../models/user');
const { requireAuth, requireLeader } = require('../middleware/auth');

router.use(requireAuth);

// View own calculation result
router.get('/', (req, res) => {
  const userId = req.session.user.id;
  const userRole = req.session.user.role;
  
  if (userRole === 'admin') {
    return res.redirect('/calculations/all');
  }
  
  // Calculate fresh result
  const result = Calculation.calculateForUser(userId);
  
  res.render('pages/calculations/detail', { 
    user: req.session.user, 
    result,
    isOwnCalculation: true
  });
});

// View all calculations (admin only)
router.get('/all', (req, res) => {
  if (req.session.user.role !== 'admin') {
    req.session.flash = { error: 'No tiene permisos para ver esta página' };
    return res.redirect('/calculations');
  }
  
  const users = User.getAll().filter(u => u.role !== 'admin');
  const results = [];
  
  for (const user of users) {
    const result = Calculation.calculateForUser(user.id);
    results.push({
      user,
      result
    });
  }
  
  res.render('pages/calculations/all', { results });
});

// Recalculate for a specific user
router.post('/recalculate/:userId', (req, res) => {
  const userId = req.params.userId;
  const currentUser = req.session.user;
  
  // Only admin or the user themselves can recalculate
  if (currentUser.role !== 'admin' && currentUser.id !== parseInt(userId)) {
    req.session.flash = { error: 'No tiene permisos para realizar esta acción' };
    return res.redirect('/calculations');
  }
  
  try {
    Calculation.calculateForUser(userId);
    req.session.flash = { success: 'Cálculo actualizado exitosamente' };
  } catch (error) {
    req.session.flash = { error: 'Error al recalcular: ' + error.message };
  }
  
  res.redirect(currentUser.role === 'admin' ? '/calculations/all' : '/calculations');
});

// View team progress (leader/coordinator)
router.get('/progress', requireLeader, (req, res) => {
  const userId = req.session.user.id;
  const progress = Calculation.getTeamProgress(userId);
  
  res.render('pages/calculations/progress', { progress });
});

// View specific user calculation (for coordinators viewing team)
router.get('/user/:userId', (req, res) => {
  const currentUser = req.session.user;
  const targetUserId = parseInt(req.params.userId);
  
  // Check permissions: admin, or leader/coordinator viewing team member
  if (currentUser.role !== 'admin') {
    const teamMembers = User.getTeamMembers(currentUser.id);
    const isTeamMember = teamMembers.some(m => m.id === targetUserId);
    
    if (!isTeamMember && currentUser.id !== targetUserId) {
      req.session.flash = { error: 'No tiene permisos para ver este usuario' };
      return res.redirect('/calculations');
    }
  }
  
  const targetUser = User.getById(targetUserId);
  if (!targetUser) {
    req.session.flash = { error: 'Usuario no encontrado' };
    return res.redirect('/calculations');
  }
  
  const result = Calculation.calculateForUser(targetUserId);
  
  res.render('pages/calculations/detail', { 
    user: targetUser, 
    result,
    isOwnCalculation: false
  });
});

module.exports = router;
