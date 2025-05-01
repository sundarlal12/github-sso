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


app.use(session({ secret: 'github-oauth', resave: false, saveUninitialized: true }));

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
  } catch (error) {
    console.error('Error fetching repos:', error.message);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

app.get('/api/github/user', (req, res) => {
  if (req.isAuthenticated()) {
    const { username, displayName, photos, profileUrl, _json } = req.user;
    res.json({
      username,
      displayName,
      avatar: photos?.[0]?.value,
      profileUrl,
      email: _json?.email,
    });
  } else {
    res.status(401).json({ error: 'User not authenticated' });
  }
});


app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  (req, res) => {
    req.session.token = req.user.token; // Save access token in session
    res.redirect(`http://localhost:5173/?token=${req.user.token}`);
  }
);


app.listen(5001, () => console.log('Server running on http://localhost:5001'));
