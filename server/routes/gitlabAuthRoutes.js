const express = require('express');
const router = express.Router();
const { gitlabLogin, gitlabCallback } = require('../controllers/gitlabAuthController');

router.get('/gitlab/login', gitlabLogin);
router.get('/gitlab/callback', gitlabCallback);

module.exports = router;
