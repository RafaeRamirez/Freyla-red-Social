'use strict';

const mongoose = require('mongoose');
const Publication = require('../models/publication');

async function getUserPublications(req, res) {
  const page = Number(req.params.page || 1);
  const userId = req.params.id;
  const itemsPerPage = 4;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).send({ message: 'ID de usuario no valido' });
  }

  try {
    const result = await Publication.paginate(
      { user: userId },
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

module.exports = {
  getUserPublications,
};
