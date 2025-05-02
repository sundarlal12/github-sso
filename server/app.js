// server.js
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const cors = require('cors');
require('dotenv').config();

const app = express();
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


// app.use(session({
//   secret: 'github-oauth',
//   resave: false,
//   saveUninitialized: true,
//   cookie: {
//     secure: true,         // required for HTTPS
//     sameSite: 'none'      // allows cross-origin cookies
//   }
// }));

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
app.get('/auth/github', passport.authenticate('github', { scope: ['repo', 'read:user'] }));

// app.get('/auth/github/callback',
//   passport.authenticate('github', { failureRedirect: '/' }),
//   (req, res) => {
//     // send token to frontend (temp logic)
//     res.redirect(`http://localhost:3000/?token=${req.user.token}`);
//   }
// );


app.get('/api/github/repos', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]; // Expecting Bearer token
console.log(token);
  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  try {
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json'
      }
    });

    res.json(response.data);
  } 
  
  catch (error) {
    console.error('GitHub API error:', error.response?.status, error.response?.data);
    console.log('GitHub API error:', error.response?.status, error.response?.data);
    res.status(500).json({ error: 'Failed to fetch repositories', details: error.response?.data });
  }
  
});



app.get('/api/github/user', (req, res) => {
  if (req.isAuthenticated()) {

    const { username, displayName, photos, profileUrl,public_repos, _json } = req.user;
    console.log(req.user);
    res.json({
      username,
      displayName,
      avatar: photos?.[0]?.value,
      profileUrl,
      public_repos,
      email: _json?.email,
    });
  } else {
    res.status(401).json({ error: 'User not authenticated' });
  }
});





// app.get('/api/github/user', async (req, res) => {
//   const token = req.headers.authorization?.split(' ')[1];

//   if (!token) {
//     return res.status(401).json({ error: 'Access token missing' });
//   }

//   try {
//     // Fetch full user profile
//     const userRes = await axios.get('https://api.github.com/user', {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         Accept: 'application/vnd.github+json',
//         'User-Agent': 'YourAppName'
//       }
//     });

//     const userData = userRes.data;

//     // Fetch email separately (if email is private)
//     const emailRes = await axios.get('https://api.github.com/user/emails', {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         Accept: 'application/vnd.github+json',
//         'User-Agent': 'YourAppName'
//       }
//     });

//     const primaryEmail = emailRes.data.find(email => email.primary && email.verified);

//     // Return complete user object + verified email
//     res.json({
//       user_data: {
//         ...userData,
//         email: primaryEmail?.email || userData.email || null
//       }
//     });

//   } catch (error) {
//     console.error('GitHub user fetch error:', error.response?.data || error.message);
//     res.status(500).json({ error: 'Failed to fetch user data' });
//   }
// });


// const axios = require('axios');

// app.get('/api/github/user', async (req, res) => {
//   if (!req.isAuthenticated()) {
//     return res.status(401).json({ error: 'User not authenticated' });
//   }

//   const accessToken = req.user.token;

//   try {
//     // 1. Get full user data
//     const userResponse = await axios.get('https://api.github.com/user', {
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         'User-Agent': 'YourAppName',
//         Accept: 'application/vnd.github+json',
//       }
//     });

//     const user = userResponse.data;

//     // 2. Get primary email
//     const emailResponse = await axios.get('https://api.github.com/user/emails', {
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         'User-Agent': 'YourAppName',
//         Accept: 'application/vnd.github+json',
//       }
//     });

//     const primaryEmailObj = emailResponse.data.find(email => email.primary && email.verified);
//     const primaryEmail = primaryEmailObj ? primaryEmailObj.email : null;

//     // 3. Get organizations
//     const orgsResponse = await axios.get('https://api.github.com/user/orgs', {
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         'User-Agent': 'YourAppName',
//         Accept: 'application/vnd.github+json',
//       }
//     });

//     res.json({
//       user_data: {
//         login: user.login,
//         id: user.id,
//         node_id: user.node_id,
//         avatar_url: user.avatar_url,
//         gravatar_id: user.gravatar_id,
//         url: user.url,
//         html_url: user.html_url,
//         followers_url: user.followers_url,
//         following_url: user.following_url,
//         gists_url: user.gists_url,
//         starred_url: user.starred_url,
//         subscriptions_url: user.subscriptions_url,
//         organizations_url: user.organizations_url,
//         repos_url: user.repos_url,
//         events_url: user.events_url,
//         received_events_url: user.received_events_url,
//         type: user.type,
//         user_view_type: "private", // manually added
//         site_admin: user.site_admin,
//         name: user.name,
//         company: user.company,
//         blog: user.blog,
//         location: user.location,
//         email: user.email, // might still be null
//         hireable: user.hireable,
//         bio: user.bio,
//         twitter_username: user.twitter_username,
//         notification_email: null, // not provided by GitHub API
//         public_repos: user.public_repos,
//         public_gists: user.public_gists,
//         followers: user.followers,
//         following: user.following,
//         created_at: user.created_at,
//         updated_at: user.updated_at,
//         private_gists: user.private_gists,
//         total_private_repos: user.total_private_repos,
//         owned_private_repos: user.owned_private_repos,
//         disk_usage: user.disk_usage,
//         collaborators: user.collaborators,
//         two_factor_authentication: user.two_factor_authentication,
//         plan: user.plan
//       },
//       orgs: orgsResponse.data,
//       collaborator_orgs: [], // add logic here if needed
//       email: primaryEmail
//     });

//   } catch (error) {
//     console.error('GitHub API error:', error.response?.data || error.message);
//     res.status(500).json({ error: 'Failed to fetch full GitHub user data' });
//   }
// });



app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  (req, res) => {
    req.session.token = req.user.token; // Save access token in session
    res.redirect(`http://localhost:5173/?token=${req.user.token}`);
  }
);


app.listen(5001, () => console.log('Server running on http://localhost:5001'));
