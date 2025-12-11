'use strict'


const moment = require('moment');
const mongoosePaginate = require('mongoose-pagination');

const User = require('../models/user');
const Follow = require('../models/follow');
const Publication = require('../models/publication');
const message = require('../models/message');


function probando(req, res) {
  return res.status(200).send({
    message: 'Hola desde el controlador de publicaciones'
  });
}

// ========================
// EXPORTAR TODAS LAS FUNCIONES
// ========================
module.exports = {
    probando
};