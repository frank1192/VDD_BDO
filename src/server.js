const app = require('./app');
const db = require('./models/database');

const PORT = process.env.PORT || 3000;

// Initialize database
db.initialize();

app.listen(PORT, () => {
  console.log(`VDD BDO - Sistema de Valoración de Desempeño`);
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
