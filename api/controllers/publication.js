'use strict'

const path = require('path');
const fs = require('fs');
const moment = require('moment');
const mongoosePaginate = require('mongoose-pagination'); // 👈 esta es la del curso
const Publication = require('../models/publication');
const User = require('../models/user');
const Follow = require('../models/follow');
// const service = require('../services/index');

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


// ========================
// SUBIR IMAGEN DE PUBLICACIÓN
// ========================
async function uploadImage(req, res) {
  const publicationId = req.params.id;

  if (!req.file) {
    return res.status(400).send({ message: "No se ha subido ninguna imagen" });
  }

  const file_path = req.file.path;
  const file_name = path.basename(file_path);
  const file_ext = path.extname(file_path).toLowerCase().replace(".", "");
  const allowedExtensions = ["png", "jpg", "jpeg", "gif"];

  try {
    // Comprobar que la publicación existe
    const publication = await Publication.findById(publicationId);

    if (!publication) {
      return removeFilesOfUploads(res, file_path, "La publicación no existe");
    }

    // Solo el dueño de la publicación puede actualizar la imagen
    if (publication.user.toString() !== req.user.sub) {
      return removeFilesOfUploads(
        res,
        file_path,
        "No tienes permiso para actualizar esta publicación"
      );
    }

    // Validar extensión
    if (!allowedExtensions.includes(file_ext)) {
      return removeFilesOfUploads(res, file_path, "Extensión no válida");
    }

    // Actualizar campo file de la publicación
    const publicationUpdated = await Publication.findByIdAndUpdate(
      publicationId,
      { file: file_name },
      { new: true }
    ).populate("user");

    if (!publicationUpdated) {
      return res
        .status(404)
        .send({ message: "No se ha podido actualizar la publicación" });
    }

    return res.status(200).send({ publication: publicationUpdated });
  } catch (error) {
    return res.status(500).send({
      message: "Error en el servidor al subir la imagen de la publicación.",
      error: error.message,
    });
  }
}

// ========================
// MOSTRAR IMAGEN DE PUBLICACIÓN
// ========================
function getImageFile(req, res) {
  const imageFile = req.params.imageFile;
  const pathFile = "./uploads/publications/" + imageFile;

  fs.exists(pathFile, (exists) => {
    if (exists) {
      return res.sendFile(path.resolve(pathFile));
    } else {
      return res
        .status(404)
        .send({ message: "No existe la imagen de la publicación..." });
    }
  });
}

module.exports = {
  probando,
  savePublication,
  getPublications,
  getPublication,
  deletePublication,
  uploadImage,
  getImageFile
};
