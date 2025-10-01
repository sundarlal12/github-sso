// routes/bitbucketRoutes.js
const express = require('express');
const router = express.Router();
const { bitbucketLogin, bitbucketCallback } = require('../controllers/bitbucketAuthController');
const bitbucketController = require('../controllers/bitbucketController');

router.get('/bitbucket/login', bitbucketLogin);
router.get('/bitbucket/callback', bitbucketCallback);

const ensureAuthenticated = (req, res, next) => {
  if (req.session.token) return next();
  res.status(401).json({ error: 'Not authenticated' });
};

// list repos
router.get('/bitbucket/repos', ensureAuthenticated, bitbucketController.getRepos);

// branches: /bitbucket/branches/:workspace/:repo
router.get('/bitbucket/branches/:workspace/:repo', ensureAuthenticated, bitbucketController.getBranches);

// list tree: /bitbucket/files/:workspace/:repo/:branch
router.get('/bitbucket/files/:workspace/:repo/:branch', ensureAuthenticated, bitbucketController.getRepoTree);

// file content: /bitbucket/content/:workspace/:repo/:branch/*
router.get('/bitbucket/content/:workspace/:repo/:branch/*', ensureAuthenticated, bitbucketController.getFileContent);

module.exports = router;
