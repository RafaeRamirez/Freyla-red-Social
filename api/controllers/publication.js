'use strict'

const path = require('path');
const fs = require('fs');
const moment = require('moment');
const mongoosePaginate = require('mongoose-pagination'); // 👈 esta es la del curso
const Publication = require('../models/publication');
const User = require('../models/user');
const Follow = require('../models/follow');
// const service = require('../services/index');

function removeUploadedFile(filePath) {
  fs.unlink(filePath, () => { /* noop */ });
}

function probando(req, res) {
  return res.status(200).send({
    message: 'Hola desde el controlador de publicaciones'
  });
}

// --------------------------------------------------
// Guardar publicación
// --------------------------------------------------
async function savePublication(req, res) {
  const params = req.body;

  if (!params.text) {
    return res.status(400).send({ message: "Debes enviar un texto!!" });
  }

  const publication = new Publication({
    text: params.text,
    file: null,
    user: req.user.sub,
    created_at: moment().unix(),
  });

  try {
    const publicationStored = await publication.save();
    return res.status(201).send({ publication: publicationStored });
  } catch (err) {
    return res.status(500).send({
      message: "Error al guardar la publicación",
      error: err.message
    });
  }
}

// --------------------------------------------------
// Obtener publicaciones de usuarios que sigo (timeline)
// --------------------------------------------------
function getPublications(req, res) {

  let page = 1;
  if (req.params.page) {
    page = req.params.page;
  }

  const itemsPerPage = 4;

  Follow.find({ user: req.user.sub })
    .populate('followed')
    .exec((err, follows) => {

      if (err) {
        return res.status(500).send({ message: 'Error al devolver el seguimiento' });
      }

      if (!follows) {
        return res.status(404).send({ message: 'No estás siguiendo a nadie aún' });
      }

      const follows_clean = [];

      follows.forEach((follow) => {
        follows_clean.push(follow.followed);
      });

      Publication.find({ user: { "$in": follows_clean } })
        .sort('-created_at')
        .populate('user')
        .paginate(page, itemsPerPage, (err, publications, total) => {

          if (err) {
            return res.status(500).send({ message: 'Error al devolver publicaciones' });
          }

          if (!publications) {
            return res.status(404).send({ message: 'No hay publicaciones' });
          }

          return res.status(200).send({
            total_items: total,
            pages: Math.ceil(total / itemsPerPage),
            page: page,
            publications
          });
        });

    });
}

// --------------------------------------------------
// Obtener una sola publicación por ID
// --------------------------------------------------
function getPublication(req, res) {
  const publicationId = req.params.id;

  Publication.findById(publicationId, (err, publication) => {
    if (err) {
      return res.status(500).send({ message: 'Error al devolver la publicación' });
    }

    if (!publication) {
      return res.status(404).send({ message: 'No existe la publicación' });
    }

    return res.status(200).send({ publication });
  });
}

// --------------------------------------------------
// Borrar publicación (solo si es del usuario logueado)
// --------------------------------------------------
async function deletePublication(req, res) {
  const publicationId = req.params.id;
  const userId = req.user.sub;   // usuario logueado

  try {
    // Solo borra si la publicación pertenece al usuario
    const publicationRemoved = await Publication.findOneAndDelete({
      _id: publicationId,
      user: userId
    });

    if (!publicationRemoved) {
      return res.status(404).send({
        message: 'No puedes borrar esta publicación o no existe'
      });
    }

    return res.status(200).send({
      message: 'Publicación eliminada correctamente',
      publication: publicationRemoved
    });

  } catch (err) {
    return res.status(500).send({
      message: 'Error al borrar la publicación',
      error: err.message
    });
  }
}

// --------------------------------------------------
// Subir imagen para una publicaciИn
// --------------------------------------------------
async function uploadImage(req, res) {
  const publicationId = req.params.id;

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send({ message: 'No se ha subido ninguna imagen' });
  }

  // connect-multiparty puede devolver {image: file} o {image: [files]}
  const uploadedFiles = Object.values(req.files).flatMap((file) => Array.isArray(file) ? file : [file]);
  const firstFile = uploadedFiles.find(f => f && f.path);

  if (!firstFile) {
    return res.status(400).send({ message: 'No se encontrИ archivo vКlido (usa el campo "image")' });
  }

  const file_path = firstFile.path;
  const file_name = path.basename(file_path);
  const file_ext = path.extname(file_name).toLowerCase().replace('.', '');
  const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif'];

  if (!allowedExtensions.includes(file_ext)) {
    removeUploadedFile(file_path);
    return res.status(400).send({ message: 'ExtensiИn no vКlida' });
  }

  try {
    const publicationUpdated = await Publication.findOneAndUpdate(
      { _id: publicationId, user: req.user.sub },
      { file: file_name },
      { new: true }
    );

    if (!publicationUpdated) {
      removeUploadedFile(file_path);
      return res.status(404).send({ message: 'No puedes subir imagen a esta publicaciИn' });
    }

    return res.status(200).send({ publication: publicationUpdated });
  } catch (err) {
    removeUploadedFile(file_path);
    return res.status(500).send({
      message: 'Error al subir la imagen de la publicaciИn',
      error: err.message
    });
  }
}

// --------------------------------------------------
// Devolver imagen de una publicaciИn
// --------------------------------------------------
function getImageFile(req, res) {
  const imageFile = req.params.imageFile;
  const pathFile = path.resolve(`./uploads/publications/${imageFile}`);

  fs.access(pathFile, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).send({ message: 'No existe la imagen...' });
    }

    return res.sendFile(pathFile);
  });
}

module.exports = {
  probando,
  savePublication,
  getPublications,
  getPublication,
  deletePublication,
  uploadImage,
  getImageFile,
};
