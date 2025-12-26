'use strict';

const express = require('express');
const PersonalizedController = require('../controllers/personalization');
const md_auth = require('../middlewares/authenticated');

const api = express.Router();

api.get('/publications-personalized/:page', md_auth.ensureAuth, PersonalizedController.getPersonalizedPublications);

module.exports = api;
