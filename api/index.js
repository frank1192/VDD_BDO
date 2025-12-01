const db = require('../src/models/database');

let appInstance = null;

module.exports = async (req, res) => {
  // Initialize database on first request
  if (!appInstance) {
    await db.initializeAsync();
    appInstance = require('../src/app');
  }
  
  return appInstance(req, res);
};
