const express = require('express');
const router = express.Router();
const Note = require('../models/note');
const Indicator = require('../models/indicator');
const UserIndicatorConfig = require('../models/userIndicatorConfig');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// View and edit own notes
router.get('/', (req, res) => {
  const userId = req.session.user.id;
  const userRole = req.session.user.role;
  
  // Admin doesn't have notes
  if (userRole === 'admin') {
    return res.redirect('/dashboard');
  }
  
  // Initialize notes if needed
  Note.initializeUserNotes(userId, userRole);
  UserIndicatorConfig.initializeForUser(userId, userRole);
  
  const notes = Note.getByUserId(userId);
  const totalPercentage = UserIndicatorConfig.getTotalPercentage(userId);
  
  res.render('pages/notes/list', { notes, totalPercentage });
});

// Update notes
router.post('/', (req, res) => {
  const userId = req.session.user.id;
  const { notes } = req.body;
  
  try {
    let hasErrors = false;
    const errors = [];
    
    for (const [indicatorId, value] of Object.entries(notes || {})) {
      const numValue = value !== '' ? parseFloat(value) : null;
      
      // Validate value range
      if (numValue !== null && (numValue < 0 || numValue > 100)) {
        hasErrors = true;
        errors.push(`El valor para el indicador debe estar entre 0 y 100`);
        continue;
      }
      
      Note.upsert(userId, indicatorId, numValue);
    }
    
    if (hasErrors) {
      req.session.flash = { error: errors.join('. ') };
    } else {
      req.session.flash = { success: 'Notas guardadas exitosamente' };
    }
    
    res.redirect('/notes');
  } catch (error) {
    req.session.flash = { error: 'Error al guardar las notas: ' + error.message };
    res.redirect('/notes');
  }
});

// Validate notes before save (API endpoint)
router.post('/validate', (req, res) => {
  const userId = req.session.user.id;
  const { notes } = req.body;
  
  const errors = [];
  const warnings = [];
  
  // Check each note value
  for (const [indicatorId, value] of Object.entries(notes || {})) {
    if (value === '' || value === null || value === undefined) {
      warnings.push(`Indicador ${indicatorId}: valor pendiente`);
      continue;
    }
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      errors.push(`Indicador ${indicatorId}: valor no válido`);
    } else if (numValue < 0 || numValue > 100) {
      errors.push(`Indicador ${indicatorId}: valor debe estar entre 0 y 100`);
    }
  }
  
  // Check percentage total
  const totalPercentage = UserIndicatorConfig.getTotalPercentage(userId);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    warnings.push(`Los porcentajes suman ${totalPercentage.toFixed(2)}% (deben sumar 100%)`);
  }
  
  res.json({
    valid: errors.length === 0,
    errors,
    warnings
  });
});

module.exports = router;
