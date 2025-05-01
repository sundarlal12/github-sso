// // src/pages/Login.jsx
// import React from 'react';

// const Login = () => {
//   const handleGitHubLogin = () => {
//     window.location.href = 'http://localhost:5000/auth/github';
//   };

//   return (
//     <div style={{ textAlign: 'center', marginTop: '100px' }}>
//       <button onClick={handleGitHubLogin} style={styles.btn}>
//         <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="GitHub" style={styles.icon} />
//         Sign in with GitHub
//       </button>
//     </div>
//   );
// };

// const styles = {
//   btn: {
//     display: 'flex',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: '12px',
//     fontSize: '18px',
//     padding: '12px 20px',
//     borderRadius: '8px',
//     border: '1px solid #ccc',
//     background: '#fff',
//     cursor: 'pointer',
//   },
//   icon: {
//     width: '24px',
//     height: '24px',
//   }
// };

// export default Login;




// import React, { useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';

// const Login = () => {
//   const navigate = useNavigate();

//   useEffect(() => {
//     const urlParams = new URLSearchParams(window.location.search);
//     const token = urlParams.get('token');
//     if (token) {
//       localStorage.setItem('github_token', token);
//       navigate('/dashboard');
//     }
//   }, [navigate]);

//   const handleLogin = () => {
//     window.location.href = 'http://localhost:5001/auth/github';
//   };

//   return (
//     <div>
//       <h2>GitHub OAuth</h2>
//       <button onClick={handleLogin}>Login with GitHub</button>
//     </div>
//   );
// };

// export default Login;






import React from 'react';
import './Login.css'; // Add CodeAnt-style styling

function Login() {
  return (
    <div className="login-container">
      <div className="login-left">
        <h2>CodeAnt AI</h2>
        <p>
          CodeAnt AI analyzed 1.5 million lines of code, documented 10,000 functions,
          and auto-fixed 1,200 issues...
        </p>
        <div className="testimonial">
          <img src="https://via.placeholder.com/50" alt="CTO" />
          <p><strong>Kashish Jajodia</strong><br />CTO at Draup Inc.</p>
        </div>
      </div>
      <div className="login-right">
        <h3>Sign In</h3>
        <a href="http://localhost:5001/auth/github">
          <button className="oauth-btn">Sign in with GitHub</button>
        </a>
        <a href="http://localhost:5001/auth/gitlab">
          <button className="oauth-btn">Sign in with GitLab</button>
        </a>
        {/* Add Bitbucket, Azure if needed */}
        <p className="privacy-text">By signing up you agree to the Privacy Policy.</p>
      </div>
    </div>
  );
}

export default Login;
