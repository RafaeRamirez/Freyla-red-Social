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

module.exports = {
    probando
};