'use strict';


const Follow = require('../models/follow');

// Seguir a un usuario
async function saveFollow(req, res) {
  try {
    // Se puede recibir por params o por body
    const followed = req.params.id || req.body.followed;
    if (!followed) {
      return res.status(400).send({ message: 'El usuario a seguir es obligatorio' });
    }

    const userId = req.user.sub;

    // Verificar si ya lo sigue
    const existing = await Follow.findOne({ user: userId, followed });
    if (existing) {
      return res.status(400).send({ message: 'Ya sigues a este usuario' });
    }

    // Crear seguimiento
    const follow = new Follow({ user: userId, followed });
    const followStored = await follow.save();

    return res.status(200).send({ follow: followStored });
  } catch (err) {
    return res.status(500).send({ message: 'Error al guardar el seguimiento', error: err.message });
  }
}

// Dejar de seguir
async function deleteFollow(req, res) {
  try {
    const userId = req.user.sub;
    const followId = req.params.id;

    const followRemoved = await Follow.findOneAndDelete({ user: userId, followed: followId });

    if (!followRemoved) {
      return res.status(404).send({ message: 'No se encontró el seguimiento para eliminar' });
    }

    return res.status(200).send({ message: 'El follow se ha eliminado correctamente' });
  } catch (err) {
    return res.status(500).send({ message: 'Error al dejar de seguir', error: err.message });
  }
}

// Listar usuarios que sigo
async function getFollowingUsers(req, res) {
  try {
    let userId = req.params.id || req.user.sub;
    let page = parseInt(req.params.page) || 1;

    const itemsPerPage = 4;
    const options = {
      page,
      limit: itemsPerPage,
      populate: { path: 'followed', select: 'name username email' },
      sort: { _id: -1 }
    };

    // Verificar que paginate está habilitado en el modelo
    const result = await Follow.paginate({ user: userId }, options);

    return res.status(200).send({
      total: result.totalDocs,
      pages: result.totalPages,
      currentPage: result.page,
      follows: result.docs || []
    });
  } catch (err) {
    return res.status(500).send({ message: 'Error en el servidor', error: err.message });
  }
}

async function getFollowedUsers(req, res) {
  try {
    const userId = req.params.id || req.user.sub;
    let page = parseInt(req.params.page, 10);
    page = isNaN(page) || page < 1 ? 1 : page;

    const itemsPerPage = 4;
    const options = {
      page,
      limit: itemsPerPage,
      populate: {
        path: 'user',
        select: 'name username email'
      },
      sort: { _id: -1 }
    };

    const result = await Follow.paginate({ followed: userId }, options);

    if (!result || result.docs.length === 0) {
      return res.status(404).send({
        message: 'No te sigue ningún usuario.'
      });
    }

    return res.status(200).send({
      total: result.totalDocs,
      pages: result.totalPages,
      currentPage: result.page,
      followers: result.docs || []
    });
  } catch (err) {
    return res.status(500).send({
      message: 'Error en el servidor',
      error: err.message
    });
  }
}


// Devolver usuarios que YO sigo
async function getMyFollows(req, res) {
  try {
    const userId = req.user.sub;
    const follows = await Follow.find({ user: userId })
      .populate('followed', 'name username email')
      .exec();

    return res.status(200).send({ follows });
  } catch (err) {
    return res.status(500).send({ message: 'Error en el servidor', error: err.message });
  }
}

// Devolver usuarios que ME SIGUEN
async function getYouFollowMe(req, res) {
  try {
    const userId = req.user.sub;
    const follows = await Follow.find({ followed: userId })
      .populate('user', 'name username email')
      .exec();

    return res.status(200).send({ follows });
  } catch (err) {
    return res.status(500).send({ message: 'Error en el servidor', error: err.message });
  }
}


function getFollowedUsers(req, res) {
  const userId = req.user.sub;




}
module.exports = {
  saveFollow,
  deleteFollow,
  getFollowingUsers,
  getFollowedUsers,
  getMyFollows,
  getYouFollowMe
};
