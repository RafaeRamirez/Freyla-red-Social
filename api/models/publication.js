'use strict';

var mongoose = require('mongoose');
const { create } = require('./user');
var Schema = mongoose.Schema;

var PublicationShema = Schema({
        text: String,
        file: String,
        create_at: String,
        user: { type: Schema.ObjectId, ref: 'User'}


});

module.exports = mongoose.model('Publication',PublicationShema);