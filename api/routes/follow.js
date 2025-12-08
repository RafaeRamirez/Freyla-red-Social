    'use strict';

    const express = require('express');
    const FollowController = require('../controllers/follow');
    const md_auth = require('../middlewares/authenticated');
    const api = express.Router();

    api.post('/follow/:id?', md_auth.ensureAuth, FollowController.saveFollow);
    api.delete('/follow/:id', md_auth.ensureAuth, FollowController.deleteFollow);
    api.get('/following/:id?/:page?', md_auth.ensureAuth, FollowController.getFollowingUsers);
    api.get('/followed/:id?/:page?', md_auth.ensureAuth, FollowController.getFollowedUsers);
    api.get('/my-follows', md_auth.ensureAuth, FollowController.getMyFollows);
    api.get('/followers', md_auth.ensureAuth, FollowController.getYouFollowMe);



    module.exports = api;
