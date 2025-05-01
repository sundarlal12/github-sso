const axios = require('axios');

const getHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github.v3+json',
});

exports.getRepos = async (req, res) => {
  try {
    const { token } = req.query;
    const result = await axios.get('https://api.github.com/user/repos', {
      headers: getHeaders(token),
    });
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching repos' });
  }
};

exports.getBranches = async (req, res) => {
  const { owner, repo } = req.params;
  const { token } = req.query;
  try {
    const result = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/branches`,
      { headers: getHeaders(token) }
    );
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching branches' });
  }
};

exports.getRepoFiles = async (req, res) => {
  const { owner, repo, branch } = req.params;
  const { token } = req.query;
  try {
    const branchMeta = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`,
      { headers: getHeaders(token) }
    );
    const treeSha = branchMeta.data.commit.commit.tree.sha;

    const treeData = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
      { headers: getHeaders(token) }
    );

    res.json(treeData.data.tree);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching files' });
  }
};

exports.getFileContent = async (req, res) => {
  const { owner, repo, branch } = req.params;
  const filePath = req.params[0];
  const { token } = req.query;

  try {
    const file = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
      { headers: getHeaders(token) }
    );
    res.json(file.data);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching file content' });
  }
};
