const axios = require('axios');

exports.githubLogin = (req, res) => {
  const redirectURL = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo`;
  res.redirect(redirectURL);
};

exports.githubCallback = async (req, res) => {
  const code = req.query.code;
  try {
    const response = await axios.post(
      `https://github.com/login/oauth/access_token`,
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: 'application/json' } }
    );

    const access_token = response.data.access_token;
    console.log(access_token,code);
    // You can save this in a DB/session/cookie as needed
  //  res.redirect(`http://localhost:5174/dashboard?token=${access_token}`);

  } catch (error) {
    res.status(500).json({ error: 'Token exchange failed' });
  }
};
