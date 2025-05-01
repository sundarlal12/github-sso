import React, { useState } from 'react';

function GithubDashboard() {
  const [repos, setRepos] = useState([]);
  const [branches, setBranches] = useState([]);
  const [files, setFiles] = useState([]);
  const [fileContent, setFileContent] = useState('');
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);

  const fetchRepos = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/github/repos', {
        credentials: 'include'
      });
      const data = await res.json();
      setRepos(data);
    } catch (err) {
      console.error('Error loading repos', err);
    }
  };

  const fetchBranches = async (owner, repo) => {
    const res = await fetch(`http://localhost:5001/api/github/branches/${owner}/${repo}`, {
      credentials: 'include'
    });
    const data = await res.json();
    setBranches(data);
    setSelectedRepo({ owner, repo });
  };

  const fetchFiles = async (owner, repo, branch) => {
    const res = await fetch(`http://localhost:5001/api/github/files/${owner}/${repo}/${branch}`, {
      credentials: 'include'
    });
    const data = await res.json();
    setFiles(data);
    setSelectedBranch(branch);
  };

  const fetchFileContent = async (owner, repo, branch, path) => {
    const res = await fetch(`http://localhost:5001/api/github/content/${owner}/${repo}/${branch}/${path}`, {
      credentials: 'include'
    });
    const data = await res.json();
    setFileContent(atob(data.content));
  };

  return (
    <div style={{ padding: '20px' }}>
      <button onClick={fetchRepos}>Load Repositories</button>

      {/* Repositories */}
      {repos.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Repo Name</th>
              <th>Owner</th>
              <th>Branches</th>
            </tr>
          </thead>
          <tbody>
            {repos.map((repo) => (
              <tr key={repo.id}>
                <td>{repo.name}</td>
                <td>{repo.owner.login}</td>
                <td>
                  <button onClick={() => fetchBranches(repo.owner.login, repo.name)}>View Branches</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Branches */}
      {branches.length > 0 && (
        <>
          <h3>Branches in {selectedRepo.repo}</h3>
          <table>
            <thead>
              <tr>
                <th>Branch</th>
                <th>Files</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.name}>
                  <td>{branch.name}</td>
                  <td>
                    <button onClick={() => fetchFiles(selectedRepo.owner, selectedRepo.repo, branch.name)}>
                      View Files
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Files */}
      {files.length > 0 && (
        <>
          <h3>Files in {selectedRepo.repo}/{selectedBranch}</h3>
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Type</th>
                <th>Content</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.path}>
                  <td>{file.path}</td>
                  <td>{file.type}</td>
                  <td>
                    {file.type === 'blob' && (
                      <button
                        onClick={() =>
                          fetchFileContent(selectedRepo.owner, selectedRepo.repo, selectedBranch, file.path)
                        }>
                        View Content
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* File Content */}
      {fileContent && (
        <div style={{ whiteSpace: 'pre-wrap', background: '#f0f0f0', padding: '15px', marginTop: '10px' }}>
          <h4>File Content</h4>
          <code>{fileContent}</code>
        </div>
      )}
    </div>
  );
}

export default GithubDashboard;
