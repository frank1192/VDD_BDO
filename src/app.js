const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const db = require('./models/database');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Trust proxy for production environments
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Session configuration
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: isProduction, // Only use secure cookies in production with HTTPS
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// CSRF Token generation and validation
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

// CSRF middleware
app.use((req, res, next) => {
  // Generate token if not exists
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }
  
  // Make token available to views
  res.locals.csrfToken = req.session.csrfToken;
  
  // Skip validation for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Validate token for state-changing requests
  const tokenFromBody = req.body._csrf;
  const tokenFromSession = req.session.csrfToken;
  
  if (!tokenFromBody || tokenFromBody !== tokenFromSession) {
    req.session.flash = { error: 'Token de seguridad inválido. Por favor, intente de nuevo.' };
    return res.redirect('back');
  }
  
  // Regenerate token after successful validation
  req.session.csrfToken = generateCsrfToken();
  res.locals.csrfToken = req.session.csrfToken;
  
  next();
});

// Make user session available to all views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.flash = req.session.flash || {};
  delete req.session.flash;
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const indicatorRoutes = require('./routes/indicators');
const notesRoutes = require('./routes/notes');
const calculationRoutes = require('./routes/calculations');
const exportRoutes = require('./routes/export');

app.use('/', authRoutes);
app.use('/users', userRoutes);
app.use('/indicators', indicatorRoutes);
app.use('/notes', notesRoutes);
app.use('/calculations', calculationRoutes);
app.use('/export', exportRoutes);

// Home route
app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.redirect('/dashboard');
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  const user = req.session.user;
  const UserModel = require('./models/user');
  const IndicatorModel = require('./models/indicator');
  const NoteModel = require('./models/note');
  
  let dashboardData = {};
  
  if (user.role === 'admin') {
    dashboardData = {
      totalUsers: UserModel.getAll().length,
      totalIndicators: IndicatorModel.getAll().length,
      pendingNotes: NoteModel.getPendingCount()
    };
  } else {
    const userIndicators = IndicatorModel.getByRole(user.role);
    const userNotes = NoteModel.getByUserId(user.id);
    dashboardData = {
      assignedIndicators: userIndicators.length,
      completedNotes: userNotes.filter(n => n.value !== null).length,
      pendingNotes: userNotes.filter(n => n.value === null).length
    };
  }
  
  res.render('pages/dashboard', { user, dashboardData });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('pages/error', { message: 'Error interno del servidor' });
});

module.exports = app;
