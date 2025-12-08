'use strict'

const path = require('path');
const fs = require('fs');
const moment = require('moment');
const mongoosePaginate = require('mongoose-paginate-v2');
const Publication = require('../models/publication');
const User = require('../models/user');
const Follow = require('../models/follow');
// const service = require('../services/index');

function probando(req, res) {
    res.status(200).send({
        message: 'Hola desde el controlador de publicaciones'
    });
}

function savePublication(req, res) {
  const params = req.body;

  if (!params.text) {
    return res.status(200).send({ message: "Debes enviar un texto!!" });
  }

  const publication = new Publication();
  publication.text = params.text;
  publication.file = null;
  publication.user = req.user.sub;
  publication.created_at = moment().unix();

  publication.save((err, publicationStored) => {
    if (err) {
      return res.status(500).send({ message: 'Error al guardar la publicación' });
    }

    if (!publicationStored) {
      return res.status(404).send({ message: 'La publicación no se ha guardado' });
    }

    return res.status(200).send({ publication: publicationStored });
  });
}


module.exports = {
    probando,
    savePublication
};