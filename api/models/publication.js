'use strict';

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

const PublicationShema = Schema({
  text: String,
  file: String,
  created_at: String,
  user: { type: Schema.ObjectId, ref: 'User' }
});

// Habilita paginación para poder listar publicaciones por páginas
PublicationShema.plugin(mongoosePaginate);

module.exports = mongoose.model('Publication', PublicationShema);
