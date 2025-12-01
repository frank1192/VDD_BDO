function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.session.flash = { error: 'Debe iniciar sesión para acceder a esta página' };
    return res.redirect('/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    req.session.flash = { error: 'No tiene permisos para acceder a esta página' };
    return res.redirect('/dashboard');
  }
  next();
}

function requireLeaderOrCoordinator(req, res, next) {
  if (!req.session.user || !['leader', 'coordinator', 'admin'].includes(req.session.user.role)) {
    req.session.flash = { error: 'No tiene permisos para acceder a esta página' };
    return res.redirect('/dashboard');
  }
  next();
}

function requireLeader(req, res, next) {
  if (!req.session.user || !['leader', 'admin'].includes(req.session.user.role)) {
    req.session.flash = { error: 'No tiene permisos para acceder a esta página' };
    return res.redirect('/dashboard');
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireLeaderOrCoordinator,
  requireLeader
};
