'use strict';

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

const FollowSchema = new Schema({
  user: { type: Schema.ObjectId, ref: 'User', required: true },
  followed: { type: Schema.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true // Para saber cuándo se creó o actualizó
});

// Agregamos el plugin para paginación
FollowSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Follow', FollowSchema);
