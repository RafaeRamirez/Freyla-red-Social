'use strict';

const path = require('path');
const fs = require('fs');
const moment = require('moment');
const Sticker = require('../models/sticker');

function removeFilesOfUploads(res, filePath, message) {
  fs.unlink(filePath, () => {
    return res.status(400).send({ message });
  });
}

async function createSticker(req, res) {
  const params = req.body || {};
  const fileData = req.file || (req.files && (req.files.image || req.files.file));
  const resolvedFile = Array.isArray(fileData) ? fileData[0] : fileData;

  if (!resolvedFile) {
    return res.status(400).send({ message: 'No se ha subido ningun archivo' });
  }

  const filePath = resolvedFile.path;
  const fileName = path.basename(filePath);
  const fileExt = path.extname(filePath).toLowerCase().replace('.', '');
  const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

  if (!allowedExtensions.includes(fileExt)) {
    return removeFilesOfUploads(res, filePath, 'Extension no valida');
  }

  const name = typeof params.name === 'string' ? params.name.trim() : '';

  try {
    const sticker = new Sticker({
      name: name || fileName,
      file: fileName,
      created_at: moment().unix(),
      user: req.user.sub,
      scope: 'user',
    });

    const stored = await sticker.save();
    return res.status(201).send({ sticker: stored });
  } catch (err) {
    return res.status(500).send({
      message: 'Error al guardar el sticker',
      error: err.message,
    });
  }
}

async function getStickers(req, res) {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 40)));
  const scope = (req.query.scope || 'all').toString();

  const query = {};
  if (scope === 'system') {
    query.scope = 'system';
  } else if (scope === 'user') {
    query.scope = 'user';
  } else if (scope === 'mine') {
    query.user = req.user.sub;
  }

  try {
    const result = await Sticker.paginate(query, {
      page,
      limit,
      sort: '-created_at',
    });

    return res.status(200).send({
      total_items: result.totalDocs,
      pages: result.totalPages,
      page: result.page,
      stickers: result.docs,
    });
  } catch (err) {
    return res.status(500).send({
      message: 'Error al devolver stickers',
      error: err.message,
    });
  }
}

function getStickerFile(req, res) {
  const imageFile = req.params.imageFile;
  const pathFile = './uploads/stickers/' + imageFile;

  fs.exists(pathFile, (exists) => {
    if (exists) {
      return res.sendFile(path.resolve(pathFile));
    }
    return res.status(404).send({ message: 'No existe el sticker' });
  });
}

module.exports = {
  createSticker,
  getStickers,
  getStickerFile,
};
