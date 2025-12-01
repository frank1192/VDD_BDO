const express = require('express');
const router = express.Router();
const { stringify } = require('csv-stringify/sync');
const Calculation = require('../models/calculation');
const User = require('../models/user');
const Note = require('../models/note');
const { requireAuth, requireLeaderOrCoordinator } = require('../middleware/auth');

router.use(requireAuth);
router.use(requireLeaderOrCoordinator);

// Export results to CSV
router.get('/csv', (req, res) => {
  const currentUser = req.session.user;
  let users;
  
  if (currentUser.role === 'admin') {
    users = User.getAll().filter(u => u.role !== 'admin');
  } else {
    // Get team members for coordinator/leader
    users = User.getTeamMembers(currentUser.id);
    // Also include self
    users.push(User.getById(currentUser.id));
  }
  
  const records = [];
  
  for (const user of users) {
    const result = Calculation.calculateForUser(user.id);
    const notes = Note.getByUserId(user.id);
    
    const record = {
      'Usuario': user.name,
      'Rol': translateRole(user.role),
      'Nota Final': result.finalScore
    };
    
    // Add individual indicator scores
    for (const note of notes) {
      record[note.indicator_name] = note.value !== null ? note.value : 'N/A';
      record[`${note.indicator_name} (%)` ] = note.percentage || 0;
    }
    
    records.push(record);
  }
  
  if (records.length === 0) {
    req.session.flash = { error: 'No hay datos para exportar' };
    return res.redirect('/calculations');
  }
  
  const csv = stringify(records, { header: true });
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=valoracion_desempeno.csv');
  res.send('\uFEFF' + csv); // BOM for Excel compatibility
});

// Export detailed results
router.get('/csv/detailed', (req, res) => {
  const currentUser = req.session.user;
  let users;
  
  if (currentUser.role === 'admin') {
    users = User.getAll().filter(u => u.role !== 'admin');
  } else {
    users = User.getTeamMembers(currentUser.id);
    users.push(User.getById(currentUser.id));
  }
  
  const records = [];
  
  for (const user of users) {
    const result = Calculation.calculateForUser(user.id);
    
    if (result.details) {
      for (const detail of result.details) {
        records.push({
          'Usuario': user.name,
          'Rol': translateRole(user.role),
          'Indicador': detail.indicator_name,
          'Valor': detail.value,
          'Porcentaje': detail.percentage,
          'Valor Ponderado': detail.weighted_value.toFixed(2),
          'Usa Valor Global': detail.used_global ? 'Sí' : 'No'
        });
      }
    }
    
    // Add summary row
    records.push({
      'Usuario': user.name,
      'Rol': translateRole(user.role),
      'Indicador': '--- TOTAL ---',
      'Valor': '',
      'Porcentaje': result.totalPercentage || '',
      'Valor Ponderado': result.finalScore,
      'Usa Valor Global': ''
    });
  }
  
  const csv = stringify(records, { header: true });
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=valoracion_desempeno_detalle.csv');
  res.send('\uFEFF' + csv);
});

function translateRole(role) {
  const translations = {
    'admin': 'Administrador',
    'analyst': 'Analista',
    'coordinator': 'Coordinador',
    'leader': 'Líder'
  };
  return translations[role] || role;
}

module.exports = router;
