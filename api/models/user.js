'use strict';

const mongoose = require('mongoose');
const mongoosePaginate = require("mongoose-paginate-v2");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: String,
    surname: String,
    nick: { type: String, unique: true },
    email: { type: String, unique: true, lowercase: true, trim: true },
    password: String,
    role: { type: String, default: 'ROLE_USER' },
    image: String,
    lastActive: { type: Date, default: null },
}, {
    timestamps: true // opcional: agrega createdAt y updatedAt automáticamente
});

UserSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('User', UserSchema);
