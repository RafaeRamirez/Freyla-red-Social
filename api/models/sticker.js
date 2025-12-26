'use strict';

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

const StickerSchema = new Schema({
  name: { type: String, default: '' },
  file: { type: String, required: true },
  created_at: { type: String, default: '' },
  user: { type: Schema.ObjectId, ref: 'User' },
  scope: { type: String, enum: ['system', 'user'], default: 'user' },
});

StickerSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Sticker', StickerSchema);
