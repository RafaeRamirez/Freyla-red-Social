'use strict';

const express = require('express');
const bodyParser = require('body-parser');

const app = express();

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');
  next();
});

// Rutas
const user_routes = require('./routes/user');
const follow_routes = require('./routes/follow');

app.use('/api', user_routes);
app.use('/api', follow_routes);

// Listar todas las rutas registradas al arrancar
function listarRutas() {
  console.log('📌 Rutas registradas:');
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      console.log(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach(r => {
        if (r.route) {
          console.log(`${Object.keys(r.route.methods).join(', ').toUpperCase()} ${r.route.path}`);
        }
      });
    }
  });
}
app.listarRutas = listarRutas;

module.exports = app;
