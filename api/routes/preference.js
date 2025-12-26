'use strict';

const express = require('express');
const PreferenceController = require('../controllers/preference');
const md_auth = require('../middlewares/authenticated');

const api = express.Router();

api.post('/preferences/track', md_auth.ensureAuth, PreferenceController.trackPreference);

module.exports = api;
