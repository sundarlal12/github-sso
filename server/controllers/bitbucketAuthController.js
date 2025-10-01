// controllers/bitbucketAuthController.js
const axios = require('axios');

exports.bitbucketLogin = (req, res) => {
  const redirectURL = `https://bitbucket.org/site/oauth2/authorize?client_id=${process.env.BITBUCKET_CLIENT_ID}&response_type=code`;
  res.redirect(redirectURL);
};

exports.bitbucketCallback = async (req, res) => {
  const code = req.query.code;
  try {
    // Bitbucket requires Basic auth with client_id:client_secret when exchanging token
    const tokenResp = await axios.post(
      'https://bitbucket.org/site/oauth2/access_token',
      new URLSearchParams({ grant_type: 'authorization_code', code }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        auth: {
          username: process.env.BITBUCKET_CLIENT_ID,
          password: process.env.BITBUCKET_CLIENT_SECRET,
        },
      }
    );

    const access_token = tokenResp.data.access_token;
    req.session.token = access_token;
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5174'}/dashboard?provider=bitbucket`);
  } catch (err) {
    console.error('Bitbucket token exchange error', err.response?.data || err.message);
    res.status(500).json({ error: 'Bitbucket token exchange failed' });
  }
};
