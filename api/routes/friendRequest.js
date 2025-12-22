'use strict';

const express = require('express');
const FriendRequestController = require('../controllers/friendRequest');
const md_auth = require('../middlewares/authenticated');

const api = express.Router();

api.post('/friend-request/:id?', md_auth.ensureAuth, FriendRequestController.sendRequest);
api.get('/friend-requests/sent', md_auth.ensureAuth, FriendRequestController.getSentRequests);
api.get('/friend-requests/received', md_auth.ensureAuth, FriendRequestController.getReceivedRequests);
api.put('/friend-request/:id/accept', md_auth.ensureAuth, FriendRequestController.acceptRequest);
api.delete('/friend-request/:id/reject', md_auth.ensureAuth, FriendRequestController.rejectRequest);
api.delete('/friend-request/:id/cancel', md_auth.ensureAuth, FriendRequestController.cancelRequest);
api.get('/friends', md_auth.ensureAuth, FriendRequestController.getFriends);

module.exports = api;
