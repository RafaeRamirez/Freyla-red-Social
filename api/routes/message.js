'use strict';

const express = require('express');
const MessageController = require('../controllers/message');
const md_auth = require('../middlewares/authenticated');
const api = express.Router();

api.get('/probando-msg', md_auth.ensureAuth, MessageController.probando);
api.get('/probando-md', md_auth.ensureAuth, MessageController.probando);


module.exports = api;
