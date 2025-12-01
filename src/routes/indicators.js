const express = require('express');
const router = express.Router();
const Indicator = require('../models/indicator');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth);

// List all indicators
router.get('/', requireAdmin, (req, res) => {
  const indicators = Indicator.getAll();
  res.render('pages/indicators/list', { indicators });
});

// Create indicator form
router.get('/new', requireAdmin, (req, res) => {
  res.render('pages/indicators/form', { indicator: null, isEdit: false });
});

// Create indicator
router.post('/', requireAdmin, (req, res) => {
  const { name, description, roles } = req.body;
  
  // Validation
  if (!name || !roles || roles.length === 0) {
    req.session.flash = { error: 'Nombre y al menos un rol son requeridos' };
    return res.redirect('/indicators/new');
  }

  try {
    Indicator.create({ name, description, roles });
    req.session.flash = { success: 'Indicador creado exitosamente' };
    res.redirect('/indicators');
  } catch (error) {
    req.session.flash = { error: 'Error al crear el indicador: ' + error.message };
    res.redirect('/indicators/new');
  }
});

// Edit indicator form
router.get('/:id/edit', requireAdmin, (req, res) => {
  const indicator = Indicator.getById(req.params.id);
  if (!indicator) {
    req.session.flash = { error: 'Indicador no encontrado' };
    return res.redirect('/indicators');
  }
  indicator.rolesArray = Indicator.getRolesArray(indicator);
  res.render('pages/indicators/form', { indicator, isEdit: true });
});

// Update indicator
router.post('/:id', requireAdmin, (req, res) => {
  const { name, description, roles } = req.body;
  const indicatorId = req.params.id;
  
  // Validation
  if (!name || !roles || roles.length === 0) {
    req.session.flash = { error: 'Nombre y al menos un rol son requeridos' };
    return res.redirect(`/indicators/${indicatorId}/edit`);
  }

  try {
    Indicator.update(indicatorId, { name, description, roles });
    req.session.flash = { success: 'Indicador actualizado exitosamente' };
    res.redirect('/indicators');
  } catch (error) {
    req.session.flash = { error: 'Error al actualizar el indicador: ' + error.message };
    res.redirect(`/indicators/${indicatorId}/edit`);
  }
});

// Delete indicator
router.post('/:id/delete', requireAdmin, (req, res) => {
  try {
    Indicator.delete(req.params.id);
    req.session.flash = { success: 'Indicador eliminado exitosamente' };
  } catch (error) {
    req.session.flash = { error: 'Error al eliminar el indicador: ' + error.message };
  }
  res.redirect('/indicators');
});

module.exports = router;
