'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = Schema({
  user: { type: Schema.ObjectId, ref: 'User', required: true },
  actor: { type: Schema.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['follow', 'reaction', 'comment'], required: true },
  publication: { type: Schema.ObjectId, ref: 'Publication', default: null },
  content: { type: String, default: '' },
  created_at: { type: Number, required: true },
  seen: { type: Boolean, default: false },
});

module.exports = mongoose.model('Notification', NotificationSchema);
