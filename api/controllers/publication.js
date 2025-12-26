'use strict'

const path = require('path');
const fs = require('fs');
const moment = require('moment');
const mongoosePaginate = require('mongoose-pagination'); // 馃憟 esta es la del curso
const Publication = require('../models/publication');
const User = require('../models/user');
const Follow = require('../models/follow');
const Notification = require('../models/notification');
// const service = require('../services/index');

function removeFilesOfUploads(res, filePath, message) {
  fs.unlink(filePath, () => {
    return res.status(400).send({ message });
  });
}

function probando(req, res) {
  return res.status(200).send({
    message: 'Hola desde el controlador de publicaciones'
  });
}

// --------------------------------------------------
// Guardar publicaci贸n
// --------------------------------------------------
async function savePublication(req, res) {
  const params = req.body;

  const text = typeof params.text === 'string' ? params.text.trim() : '';
  const hasFile = params.hasFile === true || params.hasFile === 'true';

  if (!text && !hasFile) {
    return res.status(400).send({ message: "Debes enviar un texto o un archivo." });
  }

  const publication = new Publication({
    text,
    file: null,
    user: req.user.sub,
    created_at: moment().unix(),
    reactions: [],
    comments: [],
  });

  try {
    const publicationStored = await publication.save();
    return res.status(201).send({ publication: publicationStored });
  } catch (err) {
    return res.status(500).send({
      message: "Error al guardar la publicaci贸n",
      error: err.message
    });
  }
}

// --------------------------------------------------
// Obtener publicaciones de usuarios que sigo (timeline)
// --------------------------------------------------
async function getPublications(req, res) {
  const page = Number(req.params.page || 1);
  const itemsPerPage = 4;

  try {
    const follows = await Follow.find({ user: req.user.sub }).populate('followed').exec();

    if (!follows || !follows.length) {
      return res.status(404).send({ message: 'No estas siguiendo a nadie aun' });
    }

    const follows_clean = follows.map((follow) => follow.followed);
    follows_clean.push(req.user.sub);

    const result = await Publication.paginate(
      { user: { $in: follows_clean } },
      {
        page,
        limit: itemsPerPage,
        sort: '-created_at',
        populate: [
          { path: 'user', select: 'name surname nick image' },
          { path: 'shared_from', populate: { path: 'user', select: 'name surname nick image' } },
          { path: 'reactions.user', select: 'name surname nick image' },
          { path: 'comments.user', select: 'name surname nick image' },
        ],
      }
    );

    if (!result || !result.docs || !result.docs.length) {
      return res.status(404).send({ message: 'No hay publicaciones' });
    }

    return res.status(200).send({
      total_items: result.totalDocs,
      pages: result.totalPages,
      page: result.page,
      publications: result.docs,
    });
  } catch (err) {
    return res.status(500).send({
      message: 'Error al devolver publicaciones',
      error: err.message,
    });
  }
}

// --------------------------------------------------
// Obtener una sola publicacion por ID
// --------------------------------------------------
async function getPublication(req, res) {
  const publicationId = req.params.id;

  try {
    const publication = await Publication.findById(publicationId)
      .populate('user', 'name surname nick image')
      .populate('shared_from', 'text created_at file')
      .populate('shared_from.user', 'name surname nick image')
      .populate('reactions.user', 'name surname nick image')
      .populate('comments.user', 'name surname nick image')
      .exec();

    if (!publication) {
      return res.status(404).send({ message: 'No existe la publicacion' });
    }

    return res.status(200).send({ publication });
  } catch (err) {
    return res.status(500).send({ message: 'Error al devolver la publicacion' });
  }
}
// --------------------------------------------------
// Actualizar publicacion (solo si es del usuario logueado)
// --------------------------------------------------
async function updatePublication(req, res) {
  const publicationId = req.params.id;
  const params = req.body || {};

  const hasText = Object.prototype.hasOwnProperty.call(params, 'text');
  const text = typeof params.text === 'string' ? params.text.trim() : '';
  const removeFile = params.removeFile === true || params.removeFile === 'true';

  if (!hasText && !removeFile) {
    return res.status(400).send({ message: 'Debes enviar un texto o indicar quitar archivo' });
  }

  const updateData = {};
  if (hasText) {
    updateData.text = text;
  }
  if (removeFile) {
    updateData.file = null;
  }

  try {
    const publicationUpdated = await Publication.findOneAndUpdate(
      { _id: publicationId, user: req.user.sub },
      updateData,
      { new: true }
    ).populate('user');

    if (!publicationUpdated) {
      return res.status(404).send({ message: 'No puedes editar esta publicacion o no existe' });
    }

    return res.status(200).send({ publication: publicationUpdated });
  } catch (err) {
    return res.status(500).send({
      message: 'Error al actualizar la publicacion',
      error: err.message,
    });
  }
}

// --------------------------------------------------
// Compartir una publicacion
// --------------------------------------------------
async function sharePublication(req, res) {
  const publicationId = req.params.id;
  const { text } = req.body;

  try {
    const original = await Publication.findById(publicationId).exec();
    if (!original) {
      return res.status(404).send({ message: 'No existe la publicacion' });
    }

    const shared = new Publication({
      text: typeof text === 'string' ? text : '',
      file: null,
      user: req.user.sub,
      created_at: moment().unix(),
      shared_from: original._id,
      reactions: [],
      comments: [],
    });

    const stored = await shared.save();
    await stored.populate('user', 'name surname nick image');
    await stored.populate('shared_from', 'text created_at file');
    await stored.populate('shared_from.user', 'name surname nick image');

    return res.status(201).send({ publication: stored });
  } catch (err) {
    return res.status(500).send({
      message: 'Error al compartir la publicacion',
      error: err.message,
    });
  }
}

// --------------------------------------------------
// Borrar publicaci贸n (solo si es del usuario logueado)
// --------------------------------------------------
// --------------------------------------------------
// Reaccionar a una publicacion (emoji o sticker)
// --------------------------------------------------
async function addReaction(req, res) {
  const publicationId = req.params.id;
  const { type, value } = req.body;

  if (!type || !value) {
    return res.status(400).send({ message: 'Debes enviar tipo y valor de reaccion' });
  }

  if (!['emoji', 'sticker'].includes(type)) {
    return res.status(400).send({ message: 'Tipo de reaccion no valido' });
  }

  try {
    const publication = await Publication.findById(publicationId).exec();
    if (!publication) {
      return res.status(404).send({ message: 'No existe la publicaci屈n' });
    }

    if (!publication.reactions) {
      publication.reactions = [];
    }

    const userId = req.user.sub;
    const existing = publication.reactions.find(
      (reaction) => reaction.user && reaction.user.toString() === userId
    );

    if (existing) {
      existing.type = type;
      existing.value = value;
      existing.created_at = moment().unix();
    } else {
      publication.reactions.push({
        user: userId,
        type,
        value,
        created_at: moment().unix(),
      });
    }

    await publication.save();
    await publication.populate('reactions.user', 'name surname nick image');

    if (publication.user && publication.user.toString() !== userId) {
      await Notification.create({
        user: publication.user,
        actor: userId,
        type: 'reaction',
        publication: publication._id,
        created_at: moment().unix(),
        seen: false,
      });
    }

    return res.status(200).send({ reactions: publication.reactions });return res.status(200).send({ reactions: publication.reactions });
  } catch (err) {
    return res.status(500).send({
      message: 'Error al guardar la reaccion',
      error: err.message,
    });
  }
}

// --------------------------------------------------
// Eliminar reaccion del usuario logueado
// --------------------------------------------------
async function removeReaction(req, res) {
  const publicationId = req.params.id;
  const userId = req.user.sub;

  try {
    const publication = await Publication.findById(publicationId).exec();
    if (!publication) {
      return res.status(404).send({ message: 'No existe la publicaci屈n' });
    }

    if (!publication.reactions) {
      publication.reactions = [];
    }

    publication.reactions = publication.reactions.filter(
      (reaction) => reaction.user && reaction.user.toString() !== userId
    );

    await publication.save();
    await publication.populate('reactions.user', 'name surname nick image');

    return res.status(200).send({ reactions: publication.reactions });
  } catch (err) {
    return res.status(500).send({
      message: 'Error al eliminar la reaccion',
      error: err.message,
    });
  }
}

// --------------------------------------------------
// Comentar una publicacion
// --------------------------------------------------
async function addComment(req, res) {
  const publicationId = req.params.id;
  const { text } = req.body;
  const userId = req.user.sub;

  if (!text) {
    return res.status(400).send({ message: 'Debes enviar un comentario' });
  }

  try {
    const publication = await Publication.findById(publicationId).exec();
    if (!publication) {
      return res.status(404).send({ message: 'No existe la publicaci屈n' });
    }

    if (!publication.comments) {
      publication.comments = [];
    }

    const newComment = {
      user: req.user.sub,
      text,
      created_at: moment().unix(),
    };

    publication.comments.push(newComment);
    await publication.save();
    await publication.populate('comments.user', 'name surname nick image');

    if (publication.user && publication.user.toString() !== userId) {
      await Notification.create({
        user: publication.user,
        actor: userId,
        type: 'comment',
        publication: publication._id,
        content: newComment.text,
        created_at: moment().unix(),
        seen: false,
      });
    }

    return res.status(200).send({ comments: publication.comments });return res.status(200).send({ comments: publication.comments });
  } catch (err) {
    return res.status(500).send({
      message: 'Error al guardar el comentario',
      error: err.message,
    });
  }
}

// --------------------------------------------------
// Eliminar un comentario (solo del usuario logueado)
// --------------------------------------------------
async function deleteComment(req, res) {
  const publicationId = req.params.id;
  const commentId = req.params.commentId;
  const userId = req.user.sub;

  try {
    const publication = await Publication.findById(publicationId).exec();
    if (!publication) {
      return res.status(404).send({ message: 'No existe la publicaci屈n' });
    }

    if (!publication.comments) {
      publication.comments = [];
    }

    const comment = publication.comments.id(commentId);
    if (!comment) {
      return res.status(404).send({ message: 'No existe el comentario' });
    }

    if (comment.user.toString() !== userId) {
      return res.status(403).send({ message: 'No puedes eliminar este comentario' });
    }

    comment.deleteOne();
    await publication.save();
    await publication.populate('comments.user', 'name surname nick image');

    return res.status(200).send({ comments: publication.comments });
  } catch (err) {
    return res.status(500).send({
      message: 'Error al eliminar el comentario',
      error: err.message,
    });
  }
}
async function deletePublication(req, res) {
  const publicationId = req.params.id;
  const userId = req.user.sub;   // usuario logueado

  try {
    // Solo borra si la publicaci贸n pertenece al usuario
    const publicationRemoved = await Publication.findOneAndDelete({
      _id: publicationId,
      user: userId
    });

    if (!publicationRemoved) {
      return res.status(404).send({
        message: 'No puedes borrar esta publicaci贸n o no existe'
      });
    }

    return res.status(200).send({
      message: 'Publicaci贸n eliminada correctamente',
      publication: publicationRemoved
    });

  } catch (err) {
    return res.status(500).send({
      message: 'Error al borrar la publicaci贸n',
      error: err.message
    });
  }
}


// ========================
// SUBIR IMAGEN DE PUBLICACI脫N
// ========================
async function uploadImage(req, res) {
  const publicationId = req.params.id;
  const fileData = req.file || (req.files && (req.files.image || req.files.file));
  const resolvedFile = Array.isArray(fileData) ? fileData[0] : fileData;

  if (!resolvedFile) {
    return res.status(400).send({ message: "No se ha subido ningun archivo" });
  }

  const file_path = resolvedFile.path;
  const file_name = path.basename(file_path);
  const file_ext = path.extname(file_path).toLowerCase().replace(".", "");
  const allowedExtensions = ["png", "jpg", "jpeg", "gif", "webp", "mp4", "webm", "ogg", "mov", "m4v"];

  try {
    // Comprobar que la publicacion existe
    const publication = await Publication.findById(publicationId);

    if (!publication) {
      return removeFilesOfUploads(res, file_path, "La publicacion no existe");
    }

    // Solo el dueno de la publicacion puede actualizar el archivo
    if (publication.user.toString() !== req.user.sub) {
      return removeFilesOfUploads(
        res,
        file_path,
        "No tienes permiso para actualizar esta publicacion"
      );
    }

    // Validar extension
    if (!allowedExtensions.includes(file_ext)) {
      return removeFilesOfUploads(res, file_path, "Extension no valida");
    }

    // Actualizar campo file de la publicacion
    const publicationUpdated = await Publication.findByIdAndUpdate(
      publicationId,
      { file: file_name },
      { new: true }
    ).populate("user");

    if (!publicationUpdated) {
      return res
        .status(404)
        .send({ message: "No se ha podido actualizar la publicacion" });
    }

    return res.status(200).send({ publication: publicationUpdated });
  } catch (error) {
    return res.status(500).send({
      message: "Error en el servidor al subir el archivo de la publicacion.",
      error: error.message,
    });
  }
}

// ========================
// MOSTRAR IMAGEN DE PUBLICACI脫N
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
        .send({ message: "No existe la imagen de la publicaci贸n..." });
    }
  });
}

module.exports = {
  probando,
  savePublication,
  getPublications,
  getPublication,
  updatePublication,
  sharePublication,
  addReaction,
  removeReaction,
  addComment,
  deleteComment,
  deletePublication,
  uploadImage,
  getImageFile
};













