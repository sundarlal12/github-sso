// server.js
const express = require('express');
// import axios from 'axios';
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const cors = require('cors');
require('dotenv').config();

const app = express();
const axios = require('axios');



const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000','http://localhost:5174','http://localhost:5001','https://github-sso.onrender.com'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed from this origin'));
    }
  },
  credentials: true
}));


// app.use(session({ secret: 'github-oauth', resave: false, saveUninitialized: true }));

app.set('trust proxy', 1); // Trust Render's proxy
app.use(session({
  secret: 'github-oauth',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: true,       // Only send cookie over HTTPS
    sameSite: 'none'    // Allow cross-site cookies (needed for OAuth redirect)
  }
}));

app.use(passport.initialize());
app.use(passport.session());

const githubRoutes = require('./routes/githubRoutes');
app.use('/api/github', githubRoutes);

// GitHub Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://github-sso.onrender.com/auth/github/callback"
  },
  (accessToken, refreshToken, profile, done) => {
    profile.token = accessToken;
    return done(null, profile);
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Auth routes
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email','repo', 'read:user'] }));


// app.get('/auth/github/callback',
//   passport.authenticate('github', { failureRedirect: '/' }),
//   (req, res) => {
//     // send token to frontend (temp logic)
//     res.redirect(`http://localhost:3000/?token=${req.user.token}`);
//   }
// );



app.get('/api/github/repos', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer token

  if (!token) {
    return res.status(401).json( { error: 1, msg: 'access token missing' } );
  }

  try {
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json'
      }
    });

    const filteredRepos = response.data.map(repo => ({
      error: 0,
      msg: 'success',
      id: repo.id,
      node_id: repo.node_id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      owner: {
        login: repo.owner.login,
        id: repo.owner.id,
        node_id: repo.owner.node_id,
        type: repo.owner.type,
        user_view_type: repo.owner.user_view_type,
        site_admin: repo.owner.site_admin
      },
      html_url: repo.html_url,
      description: repo.description,
      fork: repo.fork,
      url: repo.url,
      created_at: repo.created_at,
      updated_at: repo.updated_at,
      pushed_at: repo.pushed_at,
      clone_url: repo.clone_url,
      svn_url: repo.svn_url,
      size: repo.size,
      stargazers_count: repo.stargazers_count,
      watchers_count: repo.watchers_count,
      language: repo.language,
      disabled: repo.disabled,
      open_issues_count: repo.open_issues_count,
      visibility: repo.visibility,
      default_branch: repo.default_branch,
      permissions: repo.permissions
    }));

    res.json(filteredRepos);

  } catch (error) {
    console.error('GitHub API error:', error.response?.status, error.response?.data);
    res.status(500).json({
      error: 1,
      msg: 'failed to fetch GitHub user',
      details: error.response?.data || error.message
    });
  }
});




app.get('/api/github/user', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]; // Expecting "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 1, msg: 'access token missing' });
  }

  try {
    // Get authenticated user info from GitHub
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json'
      }
    });

    const {
      id,
      node_id,
      name: displayName,
      login: username,
      html_url: profileUrl
    } = response.data;

    res.json({
      error: 0,
      msg: 'success',
      id,
      nodeId: node_id,
      displayName,
      username,
      profileUrl,
      data: response.data
    });
  } catch (error) {
    console.error('GitHub user fetch error:', error.response?.status, error.response?.data);
    res.status(500).json({
      error: 1,
      msg: 'failed to fetch GitHub user',
      details: error.response?.data || error.message
    });
  }
});





const qs = require('querystring');
/*
app.get('/auth/github/callback', async (req, res, next) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 1, msg: 'Authorization code missing' });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code
      },
      {
        headers: {
          Accept: 'application/json'
        }
      }
    );

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      return res.status(500).json({ error: 1, msg: 'Failed to obtain access token' });
    }

    // Optional: fetch user info to get username (for saving)
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/vnd.github+json'
      }
    });

    const username = userResponse.data.login;

    const emailResponse = await axios.get('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/vnd.github+json'
      }
    });

    const primaryEmailObj = emailResponse.data.find(e => e.primary) || emailResponse.data[0];
    const email = primaryEmailObj?.email || 'unknown@example.com';

    // Save the code and token to your DB via API
    await axios.post('https://sastcode-token.onrender.com/storeToken', {
      code,
      client_id: process.env.CLIENT_ID,
      client_secret: 'xxxx--xxx---xx',
      user_name: username,
      email:email,
      client_access_token: access_token,
      git_secret:  'xxx--xxx---xxx' // Adjust as needed
    });

    // Redirect to frontend with token
    res.redirect(`http://localhost:5173/?token=${access_token}`);
  } catch (err) {
    console.error('GitHub OAuth Callback Error:', err.response?.data || err.message);
    res.status(500).json({ error: 1, msg: 'GitHub OAuth failed', detailss: err.response });
  }
});

*/

// put this in server.js (replace your current callback handler)

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.get('/auth/github/callback', async (req, res) => {
  const { code } = req.query;
   console.log('### callback invoked, code=', code);

  if (!code) {
    console.error('Callback: missing code');
    return res.status(400).json({ error: 1, msg: 'Authorization code missing' });
  }

  // Helpful debug: log that we received the code
  console.log('Callback: received code:', code);

  try {
    // 1) Exchange code for access token
    const tokenResp = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code
      },
      { headers: { Accept: 'application/json' }, timeout: 10000 }
    );


     console.log('tokenResp.status=', tokenResp.status);
    console.log('tokenResp.data=', tokenResp.data);


    if (!tokenResp || !tokenResp.data) {
      console.error('Token exchange: no response body', tokenResp && tokenResp.status);
      return res.status(500).json({ error: 1, msg: 'Token exchange returned no data', raw: tokenResp && tokenResp.data });
    }

    const { access_token, error: tokenError, error_description } = tokenResp.data;

    if (tokenError || !access_token) {
      console.error('Token exchange error:', tokenResp.data);
      return res.status(500).json({ error: 1, msg: 'Failed to obtain access token', details: tokenResp.data });
    }

    console.log('Token exchange: success, access_token obtained');

    // 2) Fetch user (optional but useful)
    let username = null;
    let email = null;

    try {
      const userResp = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/vnd.github+json' },
        timeout: 10000
      });
      username = userResp.data && userResp.data.login;
      console.log('User fetch success, username=', username);
    } catch (userErr) {
      console.error('Error fetching /user:', userErr.response?.status, userErr.response?.data || userErr.message);
      // continue — you might still want to proceed even if user fetch fails
    }

    // 3) Fetch user emails (optional)
    try {
      const emailResp = await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/vnd.github+json' },
        timeout: 10000
      });

      if (Array.isArray(emailResp.data) && emailResp.data.length) {
        const primary = emailResp.data.find(e => e.primary) || emailResp.data[0];
        email = primary && primary.email;
      }
      console.log('Emails fetch success, email=', email);
    } catch (emailErr) {
      console.error('Error fetching /user/emails:', emailErr.response?.status, emailErr.response?.data || emailErr.message);
      // continue
    }

    // 4) Optionally store token in your DB/service
    try {
      const storeResp = await axios.post('https://sastcode-token.onrender.com/storeToken', {
        code,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET, // use env var here; DO NOT commit secrets to repo
        user_name: username || 'unknown',
        email: email || 'unknown@example.com',
        client_access_token: access_token,
        git_secret: process.env.GIT_SECRET || 'placeholder'
      }, { timeout: 10000 });

      console.log('storeToken response status:', storeResp.status);

      console.log('storeResp.status=', storeResp.status);
      console.log('storeResp.data=', storeResp.data);

    } catch (storeErr) {
      console.error('storeToken failed:', storeErr.response?.status, storeErr.response?.data || storeErr.message);
      // Don't necessarily fail the whole flow — depends on your needs.
      // If you want to fail, uncomment the next line:
      // return res.status(500).json({ error:1, msg:'storeToken failed', details: storeErr.response?.data || storeErr.message });
    }

    // 5) Final redirect back to frontend with token
    // For debugging you can temporarily send JSON instead of redirect:
    // return res.json({ ok: true, token: access_token, username, email });

  // return res.json({
  //     ok: true,
  //     tokenResp: tokenResp.data,
  //     user: userResp.data,
  //     storeResponse: storeResp ? storeResp.data : null
  //   });

    
    // const frontendUrl = 'http://localhost:5173'; // update as needed for production
    // const redirectUrl = `${frontendUrl}/?token=${encodeURIComponent(access_token)}`;
    // console.log('Redirecting user to:', redirectUrl);

    // return res.redirect(redirectUrl);
 const redirectUrl = `${FRONTEND_URL}/?token=${encodeURIComponent(access_token)}`;

    // WARNING: don't log redirectUrl in production (it contains the token). Safe to log in dev only.
    if (process.env.NODE_ENV !== 'production') {
      console.log('Redirecting to (DEV only):', redirectUrl);
    }

    return res.redirect(302, redirectUrl);
    

  } catch (err) {
    // Log everything useful
    console.error('GitHub OAuth Callback Error:', {
      message: err.message,
      stack: err.stack,
      responseStatus: err.response?.status,
      responseData: err.response?.data
    });
    // Give a clearer payload back for easier debugging:
    return res.status(500).json({ error: 1, msg: 'GitHub OAuth failed', details: err.response?.data || err.message });
  }
});



app.get('/api/github/branch/:owner/:repo', async (req, res) => {
  const { owner, repo } = req.params;
  const token = req.headers.authorization?.split(' ')[1]; // Expecting "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 1, msg: 'Access token missing' });
  }

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/branches`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json'
        }
      }
    );

   const branchNames = response.data.map(branch => branch.name);

    res.json({
      error: 0,
      msg: 'success',
      branches: branchNames
    });
  } catch (err) {
    console.error('GitHub Branch Fetch Error:', err.response?.data || err.message);
    res.status(500).json({
      error: 1,
      msg: 'Error fetching branches',
      details: err.response?.data || err.message
    });
  }
});







// ---------------------- GitLab section (added) ----------------------
// OAuth login: redirect to GitLab authorize
app.get('/auth/gitlab', (req, res) => {
  const redirectUri = process.env.GITLAB_REDIRECT_URI || 'https://github-sso.onrender.com/auth/gitlab/callback';
  const url = `https://gitlab.com/oauth/authorize?client_id=${process.env.GITLAB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=read_user+read_api`;
  res.redirect(url);
});

// OAuth callback: exchange code for token, store in session
app.get('/auth/gitlab/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).json({ error: 1, msg: 'Code missing' });

  try {
    const tokenResp = await axios.post(
      'https://gitlab.com/oauth/token',
      qs.stringify({
        client_id: process.env.GITLAB_CLIENT_ID,
        client_secret: process.env.GITLAB_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GITLAB_REDIRECT_URI
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
    );

    const access_token = tokenResp.data.access_token;
    if (!access_token) return res.status(500).json({ error: 1, msg: 'No access token from GitLab', details: tokenResp.data });

    req.session.gitlabToken = access_token;
    // optionally redirect to frontend; here we redirect similar to GitHub flow
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/?provider=gitlab`);
  } catch (err) {
    console.error('GitLab callback error:', err.response?.status, err.response?.data || err.message);
    return res.status(500).json({ error: 1, msg: 'GitLab OAuth failed', details: err.response?.data || err.message });
  }
});

// Helper to build headers for GitLab
const gitlabHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json'
});

// GET projects (membership)
app.get('/api/gitlab/projects', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || req.session.gitlabToken;
  if (!token) return res.status(401).json({ error: 1, msg: 'GitLab access token missing' });

  try {
    const resp = await axios.get('https://gitlab.com/api/v4/projects?membership=true&simple=true&per_page=100', { headers: gitlabHeaders(token), timeout: 15000 });
    res.json(resp.data);
  } catch (err) {
    console.error('GitLab projects error:', err.response?.status, err.response?.data || err.message);
    res.status(500).json({ error: 1, msg: 'Failed to fetch GitLab projects', details: err.response?.data || err.message });
  }
});

// GET branches for project identified by namespace/repo
app.get('/api/gitlab/branches/:namespace/:repo', async (req, res) => {
  const { namespace, repo } = req.params;
  const token = req.headers.authorization?.split(' ')[1] || req.session.gitlabToken;
  if (!token) return res.status(401).json({ error: 1, msg: 'GitLab access token missing' });

  const projectPath = encodeURIComponent(`${namespace}/${repo}`);
  try {
    const resp = await axios.get(`https://gitlab.com/api/v4/projects/${projectPath}/repository/branches`, { headers: gitlabHeaders(token), timeout: 15000 });
    const names = Array.isArray(resp.data) ? resp.data.map(b => b.name) : resp.data;
    res.json({ error: 0, msg: 'success', branches: names });
  } catch (err) {
    console.error('GitLab branches error:', err.response?.status, err.response?.data || err.message);
    res.status(500).json({ error: 1, msg: 'Failed to fetch GitLab branches', details: err.response?.data || err.message });
  }
});

// GET repo tree
app.get('/api/gitlab/files/:namespace/:repo/:branch', async (req, res) => {
  const { namespace, repo, branch } = req.params;
  const token = req.headers.authorization?.split(' ')[1] || req.session.gitlabToken;
  if (!token) return res.status(401).json({ error: 1, msg: 'GitLab access token missing' });

  const projectPath = encodeURIComponent(`${namespace}/${repo}`);
  try {
    const resp = await axios.get(`https://gitlab.com/api/v4/projects/${projectPath}/repository/tree?ref=${encodeURIComponent(branch)}&recursive=true&per_page=200`, { headers: gitlabHeaders(token), timeout: 20000 });
    res.json(resp.data);
  } catch (err) {
    console.error('GitLab tree error:', err.response?.status, err.response?.data || err.message);
    res.status(500).json({ error: 1, msg: 'Failed to fetch GitLab repository tree', details: err.response?.data || err.message });
  }
});

// GET file content (raw)
app.get('/api/gitlab/content/:namespace/:repo/:branch/*', async (req, res) => {
  const { namespace, repo, branch } = req.params;
  const filePath = req.params[0];
  const token = req.headers.authorization?.split(' ')[1] || req.session.gitlabToken;
  if (!token) return res.status(401).json({ error: 1, msg: 'GitLab access token missing' });

  const projectPath = encodeURIComponent(`${namespace}/${repo}`);
  const url = `https://gitlab.com/api/v4/projects/${projectPath}/repository/files/${encodeURIComponent(filePath)}/raw?ref=${encodeURIComponent(branch)}`;

  try {
    const resp = await axios.get(url, { headers: gitlabHeaders(token), responseType: 'arraybuffer', timeout: 20000 });
    res.set('Content-Type', resp.headers['content-type'] || 'application/octet-stream');
    res.send(resp.data);
  } catch (err) {
    console.error('GitLab file content error:', err.response?.status, err.response?.data || err.message);
    res.status(500).json({ error: 1, msg: 'Failed to fetch GitLab file content', details: err.response?.data || err.message });
  }
});

// ---------------------- Bitbucket section (added) ----------------------
// OAuth login
app.get('/auth/bitbucket', (req, res) => {
  // Bitbucket uses client_id in query for authorization code flow
  const url = `https://bitbucket.org/site/oauth2/authorize?client_id=${process.env.BITBUCKET_CLIENT_ID}&response_type=code`;
  res.redirect(url);
});

// OAuth callback: exchange code for token (Basic auth with client_id:client_secret)
app.get('/auth/bitbucket/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).json({ error: 1, msg: 'Code missing' });

  try {
    const tokenResp = await axios.post(
      'https://bitbucket.org/site/oauth2/access_token',
      qs.stringify({ grant_type: 'authorization_code', code }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        auth: {
          username: process.env.BITBUCKET_CLIENT_ID,
          password: process.env.BITBUCKET_CLIENT_SECRET
        },
        timeout: 10000
      }
    );

    const access_token = tokenResp.data.access_token;
    if (!access_token) return res.status(500).json({ error: 1, msg: 'No access token from Bitbucket', details: tokenResp.data });

    req.session.bitbucketToken = access_token;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/?provider=bitbucket`);
  } catch (err) {
    console.error('Bitbucket callback error:', err.response?.status, err.response?.data || err.message);
    return res.status(500).json({ error: 1, msg: 'Bitbucket OAuth failed', details: err.response?.data || err.message });
  }
});

// Bitbucket API helper
const bitbucketHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json'
});

// List repos accessible to user (paginated)
app.get('/api/bitbucket/repos', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || req.session.bitbucketToken;
  if (!token) return res.status(401).json({ error: 1, msg: 'Bitbucket access token missing' });

  try {
    const resp = await axios.get('https://api.bitbucket.org/2.0/repositories?role=member', { headers: bitbucketHeaders(token), timeout: 15000 });
    res.json(resp.data);
  } catch (err) {
    console.error('Bitbucket repos error:', err.response?.status, err.response?.data || err.message);
    res.status(500).json({ error: 1, msg: 'Failed to fetch Bitbucket repos', details: err.response?.data || err.message });
  }
});

// Get branches for repo: /api/bitbucket/branches/:workspace/:repo
app.get('/api/bitbucket/branches/:workspace/:repo', async (req, res) => {
  const { workspace, repo } = req.params;
  const token = req.headers.authorization?.split(' ')[1] || req.session.bitbucketToken;
  if (!token) return res.status(401).json({ error: 1, msg: 'Bitbucket access token missing' });

  try {
    const resp = await axios.get(`https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/refs/branches`, { headers: bitbucketHeaders(token), timeout: 15000 });
    // Bitbucket returns paginated results; values array contains branches
    const branches = (resp.data && resp.data.values) ? resp.data.values.map(b => b.name) : [];
    res.json({ error: 0, msg: 'success', branches });
  } catch (err) {
    console.error('Bitbucket branches error:', err.response?.status, err.response?.data || err.message);
    res.status(500).json({ error: 1, msg: 'Failed to fetch Bitbucket branches', details: err.response?.data || err.message });
  }
});

// Get file tree listing using src endpoint: /api/bitbucket/files/:workspace/:repo/:branch
app.get('/api/bitbucket/files/:workspace/:repo/:branch', async (req, res) => {
  const { workspace, repo, branch } = req.params;
  const token = req.headers.authorization?.split(' ')[1] || req.session.bitbucketToken;
  if (!token) return res.status(401).json({ error: 1, msg: 'Bitbucket access token missing' });

  try {
    const resp = await axios.get(`https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/src/${encodeURIComponent(branch)}/`, { headers: bitbucketHeaders(token), timeout: 15000 });
    res.json(resp.data); // contains values array with entries (files & directories)
  } catch (err) {
    console.error('Bitbucket tree error:', err.response?.status, err.response?.data || err.message);
    res.status(500).json({ error: 1, msg: 'Failed to fetch Bitbucket repo tree', details: err.response?.data || err.message });
  }
});

// Get file content: /api/bitbucket/content/:workspace/:repo/:branch/*
app.get('/api/bitbucket/content/:workspace/:repo/:branch/*', async (req, res) => {
  const { workspace, repo, branch } = req.params;
  const filePath = req.params[0];
  const token = req.headers.authorization?.split(' ')[1] || req.session.bitbucketToken;
  if (!token) return res.status(401).json({ error: 1, msg: 'Bitbucket access token missing' });

  try {
    const url = `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/src/${encodeURIComponent(branch)}/${filePath}`;
    const resp = await axios.get(url, { headers: bitbucketHeaders(token), responseType: 'arraybuffer', timeout: 20000 });
    res.set('Content-Type', resp.headers['content-type'] || 'application/octet-stream');
    res.send(resp.data);
  } catch (err) {
    console.error('Bitbucket file content error:', err.response?.status, err.response?.data || err.message);
    res.status(500).json({ error: 1, msg: 'Failed to fetch Bitbucket file content', details: err.response?.data || err.message });
  }
});

// --------------------------------------------------------------------------------------------

app.listen(5001, () => console.log('Server running on http://localhost:5001'));


//app.listen(5001, () => console.log('Server running on http://localhost:5001'));
