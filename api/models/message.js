'use strict'

var mongoose = require('mongoose');
const { schema, create } = require('./user');
var Schema = mongoose.Schema;

var MessageSchema =  schema ({
     text: String,
     viewed: String,
     created_at: String,
     emitter:  {type: Schema.ObjectId, ref: 'User'},
     receiver: {type: Schema.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('Message', MessageSchema);