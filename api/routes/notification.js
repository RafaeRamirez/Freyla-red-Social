'use strict';

const express = require('express');
const NotificationController = require('../controllers/notification');
const md_auth = require('../middlewares/authenticated');

const api = express.Router();

api.get('/notifications', md_auth.ensureAuth, NotificationController.getNotifications);
api.put('/notifications/seen', md_auth.ensureAuth, NotificationController.setNotificationsSeen);

module.exports = api;
