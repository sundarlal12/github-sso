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







// GitLab callback
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
    if (!access_token) {
      console.error('GitLab: no access_token', tokenResp.data);
      return res.status(500).json({ error: 1, msg: 'No access token from GitLab', details: tokenResp.data });
    }

    // Save token in session (separate key so we don't touch GitHub)
    req.session.gitlabToken = access_token;
    console.log('GitLab: access token saved to session');

    // Try to fetch user info (username/email) — best-effort
    let username = null;
    let email = null;
    try {
      const userResp = await axios.get('https://gitlab.com/api/v4/user', {
        headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/json' },
        timeout: 10000
      });
      username = userResp.data && (userResp.data.username || userResp.data.name || userResp.data.login);
      // GitLab sometimes exposes email on /user depending on privacy scope/settings
      email = userResp.data && userResp.data.email;
      console.log('GitLab user fetch:', { username, email });
    } catch (userErr) {
      console.error('GitLab: failed to fetch /user:', userErr.response?.status, userErr.response?.data || userErr.message);
      // continue — it's non-fatal
    }

    // Call your storeToken endpoint like GitHub did (use GitLab env vars)
    try {
      const storeResp = await axios.post('https://sastcode-token.onrender.com/storeToken', {
        code,
        client_id: process.env.GITLAB_CLIENT_ID,
        client_secret: process.env.GITLAB_CLIENT_SECRET,
        user_name: username || 'unknown',
        email: email || 'unknown@example.com',
        client_access_token: access_token,
        git_secret: process.env.GIT_SECRET || 'placeholder',
        provider: 'gitlab'
      }, { timeout: 10000 });

      console.log('GitLab storeToken response status=', storeResp.status);
      console.log('GitLab storeToken response data=', storeResp.data);
    } catch (storeErr) {
      console.error('GitLab storeToken failed:', storeErr.response?.status, storeErr.response?.data || storeErr.message);
      // non-fatal; continue
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/?provider=gitlab&token=${encodeURIComponent(access_token)}`);

  } catch (err) {
    console.error('GitLab callback error:', {
      message: err.message,
      responseStatus: err.response?.status,
      responseData: err.response?.data
    });
    return res.status(500).json({ error: 1, msg: 'GitLab OAuth failed', details: err.response?.data || err.message });
  }
});


// Helper to build headers for GitLab
const gitlabHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json'
});




app.get('/api/gitlab/user', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || req.session.gitlabToken;
  if (!token) {
    return res.status(401).json({ error: 1, msg: 'GitLab access token missing' });
  }

  try {
    const response = await axios.get('https://gitlab.com/api/v4/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });

    const user = response.data;
    res.json({
      error: 0,
      msg: 'success',
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      profileUrl: user.web_url,
      data: user
    });
  } catch (err) {
    console.error('GitLab user fetch error:', err.response?.status, err.response?.data || err.message);
    res.status(500).json({
      error: 1,
      msg: 'Failed to fetch GitLab user',
      details: err.response?.data || err.message
    });
  }
});





// GET projects (membership)
app.get('/api/gitlab/repos', async (req, res) => {
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



/*
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


*/

// BRANCHES
app.get('/api/gitlab/branches/:namespace/:repo', async (req, res) => {
  const { namespace, repo } = req.params;
  const token = req.headers.authorization?.split(' ')[1] || req.session.gitlabToken;
  if (!token) return res.status(401).json({ error: 1, msg: 'GitLab access token missing' });

  const projectPath = encodeURIComponent(`${namespace}/${repo}`);
  try {
    const resp = await axios.get(`https://gitlab.com/api/v4/projects/${projectPath}/repository/branches`, { headers: gitlabHeaders(token) });
    const branches = Array.isArray(resp.data) ? resp.data.map(b => b.name) : [];
    res.json({ error: 0, msg: 'success', branches });
  } catch (err) {
    res.status(500).json({ error: 1, msg: 'Failed to fetch GitLab branches', details: err.response?.data || err.message });
  }
});

// FILES (tree)
app.get('/api/gitlab/files/:namespace/:repo/:branch', async (req, res) => {
  const { namespace, repo, branch } = req.params;
  const token = req.headers.authorization?.split(' ')[1] || req.session.gitlabToken;
  if (!token) return res.status(401).json({ error: 1, msg: 'GitLab access token missing' });

  const projectPath = encodeURIComponent(`${namespace}/${repo}`);
  try {
    const resp = await axios.get(
      `https://gitlab.com/api/v4/projects/${projectPath}/repository/tree?ref=${encodeURIComponent(branch)}&recursive=true&per_page=200`,
      { headers: gitlabHeaders(token) }
    );
    // normalize like GitHub: return raw array of files
    res.json(resp.data);
  } catch (err) {
    res.status(500).json({ error: 1, msg: 'Failed to fetch GitLab files', details: err.response?.data || err.message });
  }
});

// CONTENT (raw file)
app.get('/api/gitlab/content/:namespace/:repo/:branch/*', async (req, res) => {
  const { namespace, repo, branch } = req.params;
  const filePath = req.params[0];
  const token = req.headers.authorization?.split(' ')[1] || req.session.gitlabToken;
  if (!token) return res.status(401).json({ error: 1, msg: 'GitLab access token missing' });

  const projectPath = encodeURIComponent(`${namespace}/${repo}`);
  const url = `https://gitlab.com/api/v4/projects/${projectPath}/repository/files/${encodeURIComponent(filePath)}/raw?ref=${encodeURIComponent(branch)}`;

  try {
    const resp = await axios.get(url, { headers: gitlabHeaders(token), responseType: 'arraybuffer' });
    res.set('Content-Type', resp.headers['content-type'] || 'application/octet-stream');
    res.send(resp.data); // raw like GitHub
  } catch (err) {
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




// Bitbucket callback
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
    if (!access_token) {
      console.error('Bitbucket: no access_token', tokenResp.data);
      return res.status(500).json({ error: 1, msg: 'No access token from Bitbucket', details: tokenResp.data });
    }

    req.session.bitbucketToken = access_token;
    console.log('Bitbucket: access token saved to session');

    // Best-effort: fetch username and email from Bitbucket
    let username = null;
    let email = null;
    try {
      // 1) basic user
      const userResp = await axios.get('https://api.bitbucket.org/2.0/user', {
        headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/json' },
        timeout: 10000
      });
      username = userResp.data && (userResp.data.username || userResp.data.display_name);
      // 2) fetch emails
      try {
        const emailResp = await axios.get('https://api.bitbucket.org/2.0/user/emails', {
          headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/json' },
          timeout: 10000
        });
        if (Array.isArray(emailResp.data.values) && emailResp.data.values.length) {
          const primary = emailResp.data.values.find(e => e.is_primary) || emailResp.data.values[0];
          email = primary && primary.email;
        }
      } catch (emailErr) {
        console.error('Bitbucket: failed to fetch /user/emails:', emailErr.response?.status, emailErr.response?.data || emailErr.message);
      }
      console.log('Bitbucket user fetch:', { username, email });
    } catch (userErr) {
      console.error('Bitbucket: failed to fetch /user:', userErr.response?.status, userErr.response?.data || userErr.message);
      // continue
    }

    // Call your storeToken endpoint
    try {
      const storeResp = await axios.post('https://sastcode-token.onrender.com/storeToken', {
        code,
        client_id: process.env.BITBUCKET_CLIENT_ID,
        client_secret: process.env.BITBUCKET_CLIENT_SECRET,
        user_name: username || 'unknown',
        email: email || 'unknown@example.com',
        client_access_token: access_token,
        git_secret: process.env.GIT_SECRET || 'placeholder',
        provider: 'bitbucket'
      }, { timeout: 10000 });

      console.log('Bitbucket storeToken response status=', storeResp.status);
      console.log('Bitbucket storeToken response data=', storeResp.data);
    } catch (storeErr) {
      console.error('Bitbucket storeToken failed:', storeErr.response?.status, storeErr.response?.data || storeErr.message);
      // non-fatal
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/?provider=bitbucket&token=${encodeURIComponent(access_token)}`);

  } catch (err) {
    console.error('Bitbucket callback error:', {
      message: err.message,
      responseStatus: err.response?.status,
      responseData: err.response?.data
    });
    return res.status(500).json({ error: 1, msg: 'Bitbucket OAuth failed', details: err.response?.data || err.message });
  }
});



// Bitbucket API helper
const bitbucketHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json'
});





app.get('/api/bitbucket/user', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || req.session.bitbucketToken;
  if (!token) {
    return res.status(401).json({ error: 1, msg: 'Bitbucket access token missing' });
  }

  try {
    const response = await axios.get('https://api.bitbucket.org/2.0/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });

    const user = response.data;

    // Fetch email too (separate endpoint)
    let email = null;
    try {
      const emailResp = await axios.get('https://api.bitbucket.org/2.0/user/emails', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      if (Array.isArray(emailResp.data.values) && emailResp.data.values.length) {
        const primary = emailResp.data.values.find(e => e.is_primary) || emailResp.data.values[0];
        email = primary && primary.email;
      }
    } catch (emailErr) {
      console.warn('Bitbucket email fetch failed', emailErr.response?.status);
    }

    res.json({
      error: 0,
      msg: 'success',
      uuid: user.uuid,
      username: user.username || user.nickname,
      displayName: user.display_name,
      account_id: user.account_id,
      profileUrl: user.links?.html?.href,
      avatar: user.links?.avatar?.href,
      email: email,
      data: user
    });
  } catch (err) {
    console.error('Bitbucket user fetch error:', err.response?.status, err.response?.data || err.message);
    res.status(500).json({
      error: 1,
      msg: 'Failed to fetch Bitbucket user',
      details: err.response?.data || err.message
    });
  }
});







// // List repos accessible to user (paginated)
// app.get('/api/bitbucket/repos', async (req, res) => {
//   const token = req.headers.authorization?.split(' ')[1] || req.session.bitbucketToken;
//   if (!token) return res.status(401).json({ error: 1, msg: 'Bitbucket access token missing' });

//   try {
//     const resp = await axios.get('https://api.bitbucket.org/2.0/repositories?role=member', { headers: bitbucketHeaders(token), timeout: 15000 });
//     res.json(resp.data);
//   } catch (err) {
//     console.error('Bitbucket repos error:', err.response?.status, err.response?.data || err.message);
//     res.status(500).json({ error: 1, msg: 'Failed to fetch Bitbucket repos', details: err.response?.data || err.message });
//   }
// });



app.get('/api/bitbucket/repos', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || req.session.bitbucketToken;
  if (!token) return res.status(401).json({ error: 1, msg: 'Bitbucket access token missing' });

  try {
    const resp = await axios.get('https://api.bitbucket.org/2.0/repositories?role=member', { headers: bitbucketHeaders(token) });
    const repos = resp.data.values.map(repo => ({
      error: 0,
      msg: 'success',
      id: 0,
      node_id: repo.uuid,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.is_private,
      owner: {
        login: repo.owner?.username || repo.workspace?.slug,
        id: 0,
        node_id: repo.owner?.uuid || repo.workspace?.uuid,
        type: 'User',
        site_admin: false
      },
      html_url: repo.links.html.href,
      description: repo.description,
      fork: repo.parent ? true : false,
      url: repo.links.self.href,
      created_at: repo.created_on,
      updated_at: repo.updated_on,
      pushed_at: repo.updated_on,
      clone_url: repo.links.clone?.[0]?.href,
      svn_url: repo.links.clone?.[1]?.href,
      size: repo.size || 0,
      stargazers_count: 0,
      watchers_count: 0,
      language: repo.language,
      disabled: false,
      open_issues_count: 0,
      visibility: repo.is_private ? 'private' : 'public',
      default_branch: repo.mainbranch?.name || 'master',
      permissions: {
        admin: true,
        maintain: false,
        push: true,
        triage: false,
        pull: true
      }
    }));
    res.json(repos);
  } catch (err) {
    res.status(500).json({ error: 1, msg: 'Failed to fetch Bitbucket repos', details: err.response?.data || err.message });
  }
});



// BRANCHES
app.get('/api/bitbucket/branches/:workspace/:repo', async (req, res) => {
  const { workspace, repo } = req.params;
  const token = req.headers.authorization?.split(' ')[1] || req.session.bitbucketToken;
  if (!token) return res.status(401).json({ error: 1, msg: 'Bitbucket access token missing' });

  try {
    const resp = await axios.get(
      `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/refs/branches`,
      { headers: bitbucketHeaders(token) }
    );
    const branches = (resp.data?.values || []).map(b => b.name);
    res.json({ error: 0, msg: 'success', branches });
  } catch (err) {
    res.status(500).json({ error: 1, msg: 'Failed to fetch Bitbucket branches', details: err.response?.data || err.message });
  }
});

// FILES (tree)
app.get('/api/bitbucket/files/:workspace/:repo/:branch', async (req, res) => {
  const { workspace, repo, branch } = req.params;
  const token = req.headers.authorization?.split(' ')[1] || req.session.bitbucketToken;
  if (!token) return res.status(401).json({ error: 1, msg: 'Bitbucket access token missing' });

  try {
    const resp = await axios.get(
      `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/src/${encodeURIComponent(branch)}/`,
      { headers: bitbucketHeaders(token) }
    );
    // normalize to match GitHub "tree" = raw array of files/dirs
    res.json(resp.data.values || []);
  } catch (err) {
    res.status(500).json({ error: 1, msg: 'Failed to fetch Bitbucket files', details: err.response?.data || err.message });
  }
});

// CONTENT (raw file)
app.get('/api/bitbucket/content/:workspace/:repo/:branch/*', async (req, res) => {
  const { workspace, repo, branch } = req.params;
  const filePath = req.params[0];
  const token = req.headers.authorization?.split(' ')[1] || req.session.bitbucketToken;
  if (!token) return res.status(401).json({ error: 1, msg: 'Bitbucket access token missing' });

  const url = `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/src/${encodeURIComponent(branch)}/${filePath}`;
  try {
    const resp = await axios.get(url, { headers: bitbucketHeaders(token), responseType: 'arraybuffer' });
    res.set('Content-Type', resp.headers['content-type'] || 'application/octet-stream');
    res.send(resp.data); // raw like GitHub
  } catch (err) {
    res.status(500).json({ error: 1, msg: 'Failed to fetch Bitbucket file content', details: err.response?.data || err.message });
  }
});


/*
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


*/



// --------------------------------------------------------------------------------------------

app.listen(5001, () => console.log('Server running on http://localhost:5001'));


//app.listen(5001, () => console.log('Server running on http://localhost:5001'));
