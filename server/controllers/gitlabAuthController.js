// controllers/gitlabAuthController.js
const axios = require('axios');

exports.gitlabLogin = (req, res) => {
  const redirectURL = `https://gitlab.com/oauth/authorize?client_id=${process.env.GITLAB_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.GITLAB_REDIRECT_URI)}&response_type=code&scope=read_user+read_api`;
  res.redirect(redirectURL);
};

exports.gitlabCallback = async (req, res) => {
  const code = req.query.code;
  try {
    const tokenResp = await axios.post(
      `https://gitlab.com/oauth/token`,
      new URLSearchParams({
        client_id: process.env.GITLAB_CLIENT_ID,
        client_secret: process.env.GITLAB_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GITLAB_REDIRECT_URI,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const access_token = tokenResp.data.access_token;
    // store in session
    req.session.token = access_token;
    // redirect to frontend with token if you want (or keep server-side)
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5174'}/dashboard?provider=gitlab`);
  } catch (error) {
    console.error('GitLab token exchange error:', error.response?.data || error.message);
    res.status(500).json({ error: 'GitLab token exchange failed' });
  }
};
