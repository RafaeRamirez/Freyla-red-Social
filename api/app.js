'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();

// Ensure upload directories exist at startup.
['users', 'publications', 'stickers'].forEach(folder => {
  const uploadPath = path.join(__dirname, 'uploads', folder);
  fs.mkdirSync(uploadPath, { recursive: true });
});

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
const friend_request_routes = require('./routes/friendRequest');
const publication_routes = require('./routes/publication');
const message_routes = require('./routes/message');
const sticker_routes = require('./routes/sticker');
const notification_routes = require('./routes/notification');
const preference_routes = require('./routes/preference');
const personalization_routes = require('./routes/personalization');

app.use('/api', user_routes);
app.use('/api', follow_routes);
app.use('/api', friend_request_routes);
app.use('/api', publication_routes);
app.use('/api', message_routes); 
app.use('/api', sticker_routes);
app.use('/api', notification_routes);
app.use('/api', preference_routes);
app.use('/api', personalization_routes);

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
