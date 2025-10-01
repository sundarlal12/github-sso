const express = require('express');
const router = express.Router();
const { bitbucketLogin, bitbucketCallback } = require('../controllers/bitbucketAuthController');

router.get('/bitbucket/login', bitbucketLogin);
router.get('/bitbucket/callback', bitbucketCallback);

module.exports = router;
