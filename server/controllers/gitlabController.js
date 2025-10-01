// controllers/gitlabController.js
const axios = require('axios');
const GITLAB_API = 'https://gitlab.com/api/v4';

const getHeaders = (token) => ({
  'Authorization': `Bearer ${token}`,
  'Accept': 'application/json',
});

exports.getProjects = async (req, res) => {
  try {
    const token = req.session.token || req.query.token;
    const resp = await axios.get(`${GITLAB_API}/projects?membership=true&simple=true&per_page=100`, {
      headers: getHeaders(token),
    });
    res.json(resp.data);
  } catch (err) {
    console.error('getProjects', err.response?.data || err.message);
    res.status(500).json({ error: 'Error fetching projects' });
  }
};

exports.getBranches = async (req, res) => {
  try {
    const { namespace, repo } = req.params; // or accept projectId
    const token = req.session.token || req.query.token;
    // GitLab project path needs to be URL-encoded (namespace%2Frepo)
    const projectPath = encodeURIComponent(`${namespace}/${repo}`);
    const resp = await axios.get(`${GITLAB_API}/projects/${projectPath}/repository/branches`, {
      headers: getHeaders(token),
    });
    res.json(resp.data);
  } catch (err) {
    console.error('getBranches', err.response?.data || err.message);
    res.status(500).json({ error: 'Error fetching branches' });
  }
};

exports.getRepoTree = async (req, res) => {
  try {
    const { namespace, repo, branch } = req.params;
    const token = req.session.token || req.query.token;
    const projectPath = encodeURIComponent(`${namespace}/${repo}`);
    const resp = await axios.get(
      `${GITLAB_API}/projects/${projectPath}/repository/tree?ref=${encodeURIComponent(branch)}&recursive=true&per_page=100`,
      { headers: getHeaders(token) }
    );
    res.json(resp.data);
  } catch (err) {
    console.error('getRepoTree', err.response?.data || err.message);
    res.status(500).json({ error: 'Error fetching repository tree' });
  }
};

exports.getFileContent = async (req, res) => {
  try {
    const { namespace, repo, branch } = req.params;
    const filePath = req.params[0]; // wildcard route
    const token = req.session.token || req.query.token;
    const projectPath = encodeURIComponent(`${namespace}/${repo}`);

    // GitLab raw file endpoint:
    const url = `${GITLAB_API}/projects/${projectPath}/repository/files/${encodeURIComponent(filePath)}/raw?ref=${encodeURIComponent(branch)}`;
    const resp = await axios.get(url, { headers: getHeaders(token), responseType: 'arraybuffer' });

    // return raw content and content-type
    res.set('Content-Type', resp.headers['content-type'] || 'application/octet-stream');
    res.send(resp.data);
  } catch (err) {
    console.error('getFileContent', err.response?.data || err.message);
    res.status(500).json({ error: 'Error fetching file content' });
  }
};
