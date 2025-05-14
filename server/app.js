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

// const githubRoutes = require('./routes/githubRoutes');
// app.use('/api/github', githubRoutes);

// app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
// app.use(session({ secret: 'github-oauth', resave: false, saveUninitialized: true }));
// app.use(passport.initialize());
// app.use(passport.session());

// Middleware first:


// app.use(cors({ origin: 'http://localhost:3000', credentials: true }));

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



//  app.get('/api/github/user', (req, res) => {
//   if (req.isAuthenticated()) 
//     {
//     const {
//       id,
//       nodeId,
//       displayName,
//       username,
//       profileUrl,
//       _json
//     } = req.user;

//     const data = _json;
//     res.json({
//       id,
//       nodeId,
//       displayName,
//       username,
//       profileUrl,
//       data
//     });
//   } else {
//     res.status(401).json({ error: 'User not authenticated' });
//   }
// });



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




// app.get('/auth/github/callback',
//   passport.authenticate('github', { failureRedirect: '/' }),
//   (req, res) => {
//     req.session.token = req.user.token; // Save access token in session
//     res.redirect(`http://localhost:5173/?token=${req.user.token}`);
//   }
// );



const qs = require('querystring');

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
      client_secret: process.env.CLIENT_SECRET,
      user_name: username,
      email:email,
      client_access_token: access_token,
      git_secret: process.env.GIT_SECRET || '3456789765' // Adjust as needed
    });

    // Redirect to frontend with token
    res.redirect(`http://localhost:5173/?token=${access_token}`);
  } catch (err) {
    console.error('GitHub OAuth Callback Error:', err.response?.data || err.message);
    res.status(500).json({ error: 1, msg: 'GitHub OAuth failed', details: err.message });
  }
});



app.listen(5001, () => console.log('Server running on http://localhost:5001'));
