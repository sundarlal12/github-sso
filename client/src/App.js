// import React, { useEffect } from 'react';
// import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
// import GithubDashboard from './pages/GithubDashboard';

// function Home() {
//   const navigate = useNavigate();

//   useEffect(() => {
//     const urlParams = new URLSearchParams(window.location.search);
//     const token = urlParams.get('token');
//     if (token) {
//       localStorage.setItem('github_token', token);
//       navigate('/dashboard');
//     }
//   }, [navigate]);

//   return (
//     <div style={{ textAlign: 'center', marginTop: '10%' }}>
//       <h1>Welcome to VAPTlab</h1>
//       <a href="http://localhost:5001/auth/github">
//         <button style={{ fontSize: '20px', padding: '10px 20px' }}>Sign in with GitHub</button>
//       </a>
//     </div>
//   );
// }

// function App() {
//   return (
//     <Router>
//       <Routes>
//         <Route path="/" element={<Home />} />
//         <Route path="/dashboard" element={<GithubDashboard />} />
//       </Routes>
//     </Router>
//   );
// }

// export default App;


import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import GithubDashboard from './pages/GithubDashboard';

function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      localStorage.setItem('github_token', token);
      navigate('/dashboard');
    }
  }, [navigate]);

  return (
    <div style={{ textAlign: 'center', marginTop: '10%' }}>
      <h1>Welcome to VAPTlab</h1>
      <a href="http://localhost:5001/auth/github">
        <button style={{ fontSize: '20px', padding: '10px 20px' }}>Sign in with GitHub</button>
      </a>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<GithubDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
