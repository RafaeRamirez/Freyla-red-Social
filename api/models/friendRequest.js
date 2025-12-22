'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FriendRequestSchema = new Schema(
  {
    requester: { type: Schema.ObjectId, ref: 'User', required: true },
    recipient: { type: Schema.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('FriendRequest', FriendRequestSchema);
