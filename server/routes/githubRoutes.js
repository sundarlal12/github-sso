const express = require('express');
const router = express.Router();
const axios = require('axios');

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (req.session.token) return next();
  res.status(401).json({ error: 'Not authenticated' });
};

const getHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github.v3+json'
});

// Get user repos
router.get('/repos', ensureAuthenticated, async (req, res) => {
  console.log("Hit /repos route");
  try {
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: getHeaders(req.session.token)
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Get branches for a repo
router.get('/branches/:owner/:repo', ensureAuthenticated, async (req, res) => {
  const { owner, repo } = req.params;
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/branches`,
      { headers: getHeaders(req.session.token) }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// Get file tree
router.get('/files/:owner/:repo/:branch', ensureAuthenticated, async (req, res) => {
  const { owner, repo, branch } = req.params;
  try {
    const branchData = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`,
      { headers: getHeaders(req.session.token) }
    );

    const sha = branchData.data.commit.commit.tree.sha;

    const tree = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`,
      { headers: getHeaders(req.session.token) }
    );

    res.json(tree.data.tree);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch file tree' });
  }
});

// Get specific file content
router.get('/content/:owner/:repo/:branch/*', ensureAuthenticated, async (req, res) => {
  const { owner, repo, branch } = req.params;
  const filePath = req.params[0];

  try {
    const file = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
      { headers: getHeaders(req.session.token) }
    );

    res.json(file.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch file content' });
  }
});


router.get('/', ensureAuthenticated, async (req, res) => {
  
    res.json("{'msg':'ok'}");
 
});

module.exports = router;
