'use strict'

var express = require('express');
var PublicationController = require('../controllers/publication');
var ProfilePublicationController = require('../controllers/profilePublication');
var api = express.Router();
var md_auth = require('../middlewares/authenticated');

var multipart = require('connect-multiparty');
var md_upload = multipart({ uploadDir: './uploads/publications' });


api.get('/probando-pub', md_auth.ensureAuth, PublicationController.probando);
api.get('/publications/:page?', md_auth.ensureAuth, PublicationController.getPublications);
api.get('/publications-user/:id/:page?', md_auth.ensureAuth, ProfilePublicationController.getUserPublications);
api.post('/publication', md_auth.ensureAuth, PublicationController.savePublication);
api.get('/publication/:id', md_auth.ensureAuth, PublicationController.getPublication);
api.put('/publication/:id', md_auth.ensureAuth, PublicationController.updatePublication);
api.post('/publication/:id/share', md_auth.ensureAuth, PublicationController.sharePublication);
api.post('/publication/:id/reaction', md_auth.ensureAuth, PublicationController.addReaction);
api.delete('/publication/:id/reaction', md_auth.ensureAuth, PublicationController.removeReaction);
api.post('/publication/:id/comment', md_auth.ensureAuth, PublicationController.addComment);
api.delete('/publication/:id/comment/:commentId', md_auth.ensureAuth, PublicationController.deleteComment);
api.delete('/publication/:id', md_auth.ensureAuth, PublicationController.deletePublication);
api.post('/upload-image-pub/:id', [md_auth.ensureAuth, md_upload], PublicationController.uploadImage);
api.get('/get-image-pub/:imageFile', PublicationController.getImageFile);




module.exports = api;
