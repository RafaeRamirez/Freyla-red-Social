'use strict';

const express = require('express');
const StickerController = require('../controllers/sticker');
const md_auth = require('../middlewares/authenticated');
const multipart = require('connect-multiparty');
const path = require('path');

const api = express.Router();
const uploadDir = path.join(__dirname, '..', 'uploads', 'stickers');
const md_upload = multipart({ uploadDir });

api.get('/stickers', md_auth.ensureAuth, StickerController.getStickers);
api.post('/stickers', [md_auth.ensureAuth, md_upload], StickerController.createSticker);
api.get('/get-sticker/:imageFile', StickerController.getStickerFile);

module.exports = api;
