const express = require('express');
const router = express.Router();
const axios = require('axios');

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (req.session.token) return next();
  res.status(401).json({ error: 'Not authenticated' });
};

const getHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github.v3+json'
});

// Get user repos
// router.get('/repos', ensureAuthenticated, async (req, res) => {
//   console.log("Hit /repos route");
//   try {
//     const response = await axios.get('https://api.github.com/user/repos', {
//       headers: getHeaders(req.session.token)
//     });
//     res.json(response.data);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch repositories' });
//   }
// });


// router.get('/userinfo', ensureAuthenticated, async (req, res) => {
//   console.log("Hit /userinfo route");

//   try {
//     const headers = getHeaders(req.session.token);

//     // 1. Get basic user info
//     const userResponse = await axios.get('https://api.github.com/user', {
//       headers
//     });

//     const userData = userResponse.data;

//     // 2. Get primary email
//     const emailResponse = await axios.get('https://api.github.com/user/emails', {
//       headers
//     });

//     const primaryEmailObj = emailResponse.data.find(email => email.primary && email.verified);
//     const primaryEmail = primaryEmailObj ? primaryEmailObj.email : null;

//     // 3. Get user's organizations
//     const orgsResponse = await axios.get('https://api.github.com/user/orgs', {
//       headers
//     });

//     // 4. Optional: Add custom email field (e.g., notification_email) if you need it
//     const responsePayload = {
//       user_data: userData,
//       orgs: orgsResponse.data,
//       collaborator_orgs: [], // You can populate this with another call if needed
//       email: primaryEmail
//     };

//     res.json(responsePayload);

//   } catch (error) {
//     console.error("GitHub API error:", error.response?.data || error.message);
//     res.status(500).json({ error: 'Failed to fetch user info' });
//   }
// });


//  router.get('/api/user', ensureAuthenticated, async (req, res) => {
//   console.log("Hit /api/user route");

//   try {
//     const headers = getHeaders(req.session.token);

//     // 1. Get full user profile (includes plan, repo stats, etc.)
//     const userResponse = await axios.get('https://api.github.com/user', {
//       headers
//     });

//     const userData = userResponse.data;

//     // 2. Get primary email
//     const emailResponse = await axios.get('https://api.github.com/user/emails', {
//       headers
//     });
//     const primaryEmailObj = emailResponse.data.find(email => email.primary && email.verified);
//     const primaryEmail = primaryEmailObj ? primaryEmailObj.email : null;

//     // 3. Get organizations
//     const orgsResponse = await axios.get('https://api.github.com/user/orgs', {
//       headers
//     });

//     // ✅ Build final response structure
//     const responsePayload = {
//       user_data: {
//         login: userData.login,
//         id: userData.id,
//         node_id: userData.node_id,
//         avatar_url: userData.avatar_url,
//         gravatar_id: userData.gravatar_id,
//         url: userData.url,
//         html_url: userData.html_url,
//         followers_url: userData.followers_url,
//         following_url: userData.following_url,
//         gists_url: userData.gists_url,
//         starred_url: userData.starred_url,
//         subscriptions_url: userData.subscriptions_url,
//         organizations_url: userData.organizations_url,
//         repos_url: userData.repos_url,
//         events_url: userData.events_url,
//         received_events_url: userData.received_events_url,
//         type: userData.type,
//         user_view_type: "private", // custom, GitHub doesn't provide this
//         site_admin: userData.site_admin,
//         name: userData.name,
//         company: userData.company,
//         blog: userData.blog,
//         location: userData.location,
//         email: userData.email, // GitHub may return null here if private
//         hireable: userData.hireable,
//         bio: userData.bio,
//         twitter_username: userData.twitter_username,
//         notification_email: null, // Not available from GitHub API directly
//         public_repos: userData.public_repos,
//         public_gists: userData.public_gists,
//         followers: userData.followers,
//         following: userData.following,
//         created_at: userData.created_at,
//         updated_at: userData.updated_at,
//         private_gists: userData.private_gists,
//         total_private_repos: userData.total_private_repos,
//         owned_private_repos: userData.owned_private_repos,
//         disk_usage: userData.disk_usage,
//         collaborators: userData.collaborators,
//         two_factor_authentication: userData.two_factor_authentication,
//         plan: userData.plan
//       },
//       orgs: orgsResponse.data,
//       collaborator_orgs: [], // optional, for advanced use
//       email: primaryEmail
//     };

//     res.json(responsePayload);

//   } catch (error) {
//     console.error("GitHub API error:", error.response?.data || error.message);
//     res.status(500).json({ error: 'Failed to fetch user data' });
//   }
// });



// Get branches for a repo
router.get('/branches/:owner/:repo', ensureAuthenticated, async (req, res) => {
  const { owner, repo } = req.params;
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/branches`,
      { headers: getHeaders(req.session.token) }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// Get file tree
router.get('/files/:owner/:repo/:branch', ensureAuthenticated, async (req, res) => {
  const { owner, repo, branch } = req.params;
  try {
    const branchData = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`,
      { headers: getHeaders(req.session.token) }
    );

    const sha = branchData.data.commit.commit.tree.sha;

    const tree = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`,
      { headers: getHeaders(req.session.token) }
    );

    res.json(tree.data.tree);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch file tree' });
  }
});

// Get specific file content
router.get('/content/:owner/:repo/:branch/*', ensureAuthenticated, async (req, res) => {
  const { owner, repo, branch } = req.params;
  const filePath = req.params[0];

  try {
    const file = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
      { headers: getHeaders(req.session.token) }
    );

    res.json(file.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch file content' });
  }
});


router.get('/', ensureAuthenticated, async (req, res) => {
  
    res.json("{'msg':'ok'}");
 
});

module.exports = router;
