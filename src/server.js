const db = require('./models/database');

const PORT = process.env.PORT || 3000;

// Initialize database asynchronously, then start app
async function startServer() {
  await db.initializeAsync();
  
  // Require app after database is initialized
  const app = require('./app');
  
  app.listen(PORT, () => {
    console.log(`VDD BDO - Sistema de Valoración de Desempeño`);
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Error starting server:', err);
  process.exit(1);
});
