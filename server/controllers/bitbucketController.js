// controllers/bitbucketController.js
const axios = require('axios');
const BB_API = 'https://api.bitbucket.org/2.0';

const getHeaders = (token) => ({
  'Authorization': `Bearer ${token}`,
  'Accept': 'application/json',
});

exports.getRepos = async (req, res) => {
  try {
    const token = req.session.token || req.query.token;
    // For Bitbucket, you usually list repos under the authenticated user's workspaces
    const resp = await axios.get(`${BB_API}/repositories?role=member`, {
      headers: getHeaders(token),
    });
    res.json(resp.data);
  } catch (err) {
    console.error('getRepos', err.response?.data || err.message);
    res.status(500).json({ error: 'Error fetching repos' });
  }
};

exports.getBranches = async (req, res) => {
  try {
    const { workspace, repo } = req.params; // workspace == owner
    const token = req.session.token || req.query.token;
    const resp = await axios.get(
      `${BB_API}/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/refs/branches`,
      { headers: getHeaders(token) }
    );
    res.json(resp.data);
  } catch (err) {
    console.error('getBranches', err.response?.data || err.message);
    res.status(500).json({ error: 'Error fetching branches' });
  }
};

exports.getRepoTree = async (req, res) => {
  try {
    const { workspace, repo, branch } = req.params;
    const token = req.session.token || req.query.token;
    // Bitbucket provides src endpoint listing. To list root tree:
    const resp = await axios.get(
      `${BB_API}/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/src/${encodeURIComponent(branch)}/`,
      { headers: getHeaders(token) }
    );
    // resp.data.values contains files/dirs
    res.json(resp.data);
  } catch (err) {
    console.error('getRepoTree', err.response?.data || err.message);
    res.status(500).json({ error: 'Error fetching repository tree' });
  }
};

exports.getFileContent = async (req, res) => {
  try {
    const { workspace, repo, branch } = req.params;
    const filePath = req.params[0];
    const token = req.session.token || req.query.token;

    const url = `${BB_API}/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/src/${encodeURIComponent(branch)}/${filePath}`;
    const resp = await axios.get(url, { headers: getHeaders(token), responseType: 'arraybuffer' });

    res.set('Content-Type', resp.headers['content-type'] || 'application/octet-stream');
    res.send(resp.data);
  } catch (err) {
    console.error('getFileContent', err.response?.data || err.message);
    res.status(500).json({ error: 'Error fetching file content' });
  }
};
