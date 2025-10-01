// routes/gitlabRoutes.js
const express = require('express');
const router = express.Router();
const { gitlabLogin, gitlabCallback } = require('../controllers/gitlabAuthController');
const gitlabController = require('../controllers/gitlabController');

// OAuth endpoints
router.get('/gitlab/login', gitlabLogin);
router.get('/gitlab/callback', gitlabCallback);

// Middleware same pattern: ensureAuthenticated
const ensureAuthenticated = (req, res, next) => {
  if (req.session.token) return next();
  res.status(401).json({ error: 'Not authenticated' });
};

// API similar to GitHub routes
router.get('/gitlab/projects', ensureAuthenticated, gitlabController.getProjects);

// We'll use /gitlab/branches/:namespace/:repo
router.get('/gitlab/branches/:namespace/:repo', ensureAuthenticated, gitlabController.getBranches);

// file tree
router.get('/gitlab/files/:namespace/:repo/:branch', ensureAuthenticated, gitlabController.getRepoTree);

// file content wildcard — note express uses * as a param in your original style
router.get('/gitlab/content/:namespace/:repo/:branch/*', ensureAuthenticated, gitlabController.getFileContent);

module.exports = router;
