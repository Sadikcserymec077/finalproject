// src/App.js (relevant parts)
import React, { useState } from 'react';
import NavBar from './components/NavBar';
import UploadCard from './components/UploadCard';
import ScansCard from './components/ScansCard';
import ReportPanel from './components/ReportPanel';
import './App.css';

function App() {
  const [selected, setSelected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentView, setCurrentView] = useState('dashboard');

  const handleUploaded = (data) => {
    // data = { hash }
    setSelected({ hash: data.hash });
    // bump refreshKey to signal ScansCard to reload
    setRefreshKey(k => k + 1);
  };

  const handleNavigation = (view) => {
    setCurrentView(view);
  };

  return (
    <div className="app-container">
      <NavBar onNavigate={handleNavigation} />
      <div className="container-fluid px-md-4">
        {currentView === 'dashboard' && (
          <div className="row g-3">
            <div className="col-12 col-lg-4">
              <UploadCard onUploaded={handleUploaded} />
              <ScansCard onSelect={(s) => setSelected({ hash: s.MD5 || s.hash || s.md5 })} refreshKey={refreshKey} />
            </div>
            <div className="col-12 col-lg-8">
              <ReportPanel hash={selected?.hash} />
            </div>
          </div>
        )}
        
        {currentView === 'reports' && (
          <div className="row">
            <div className="col-12">
              <h3>📁 All Reports</h3>
              <ScansCard onSelect={(s) => { setSelected({ hash: s.MD5 || s.hash || s.md5 }); setCurrentView('dashboard'); }} refreshKey={refreshKey} />
            </div>
          </div>
        )}
        
        {currentView === 'settings' && (
          <div className="row">
            <div className="col-12 col-md-8 mx-auto">
              <div className="card shadow-sm p-4">
                <h3>⚙️ Settings</h3>
                <p className="text-muted">Configuration and preferences</p>
                <hr />
                <h5>MobSF Configuration</h5>
                <p>Backend URL: <code>http://localhost:4000</code></p>
                <p>MobSF Server: <code>http://localhost:8000</code></p>
                <hr />
                <h5>Available Tools</h5>
                <ul>
                  <li>✅ MobSF - Mobile Security Framework (Always active)</li>
                  <li>✅ SonarQube - Code Quality Analysis</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
