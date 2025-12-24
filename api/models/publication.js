'use strict';

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

const ReactionSchema = Schema({
  user: { type: Schema.ObjectId, ref: 'User' },
  type: { type: String, enum: ['emoji', 'sticker'] },
  value: String,
  created_at: String,
});

const CommentSchema = Schema({
  user: { type: Schema.ObjectId, ref: 'User' },
  text: String,
  created_at: String,
});

const PublicationShema = Schema({
  text: String,
  file: String,
  created_at: String,
  user: { type: Schema.ObjectId, ref: 'User' },
  shared_from: { type: Schema.ObjectId, ref: 'Publication', default: null },
  reactions: { type: [ReactionSchema], default: [] },
  comments: { type: [CommentSchema], default: [] },
});

// Habilita paginación para poder listar publicaciones por páginas
PublicationShema.plugin(mongoosePaginate);

module.exports = mongoose.model('Publication', PublicationShema);
