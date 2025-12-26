'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserPreferenceSchema = new Schema(
  {
    user: { type: Schema.ObjectId, ref: 'User', index: true },
    type: {
      type: String,
      enum: ['author', 'tag', 'keyword', 'content_type'],
      index: true,
    },
    value: { type: String, index: true },
    score: { type: Number, default: 0 },
    updated_at: { type: Number, default: null },
  },
  { timestamps: true }
);

UserPreferenceSchema.index({ user: 1, type: 1, value: 1 }, { unique: true });

module.exports = mongoose.model('UserPreference', UserPreferenceSchema);
