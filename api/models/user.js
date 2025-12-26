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
    cover: String,
    lastActive: { type: Date, default: null },
    preferences: {
        tags: [{ value: String, score: Number }],
        keywords: [{ value: String, score: Number }],
        authors: [{ value: String, score: Number }],
        contentTypes: [{ value: String, score: Number }],
        updated_at: { type: Number, default: null },
    },
}, {
    timestamps: true // opcional: agrega createdAt y updatedAt automáticamente
});

UserSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('User', UserSchema);
