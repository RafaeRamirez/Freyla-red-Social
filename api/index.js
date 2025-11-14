'use strict';

// Cargar variables de entorno desde .env
require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');

// Variables de configuración
const port = process.env.PORT || 3977;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/curso_Freyla';

// Configurar promesas
mongoose.Promise = global.Promise;

// Conectar a MongoDB
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Conexión a la base de datos establecida correctamente.');

  // Iniciar el servidor (sin mostrar el puerto si así lo deseas)
  app.listen(port, () => {
    console.log('🚀 Servidor iniciado correctamente.');
  });
})
.catch(err => {
  console.error('❌ No se pudo conectar a la base de datos.');
});
