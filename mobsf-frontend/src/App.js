// src/App.js (relevant parts)
import React, { useState } from 'react';
import { ThemeProvider } from './ThemeContext';
import NavBar from './components/NavBar';
import UploadCard from './components/UploadCard';
import ScansCard from './components/ScansCard';
import ReportPanel from './components/ReportPanel';
import Login from './components/Login';
import NotificationsSettings from './components/NotificationsSettings';
import { Card } from 'react-bootstrap';
import './App.css';

function App() {
  const [selected, setSelected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentView, setCurrentView] = useState('dashboard');
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);

  const handleUploaded = (data) => {
    // data = { hash }
    setSelected({ hash: data.hash });
    setAnalysisComplete(true); // Show report section after upload
    // bump refreshKey to signal ScansCard to reload
    setRefreshKey(k => k + 1);
  };

  const handleNavigation = (view) => {
    setCurrentView(view);
    // Reset analysis complete when navigating away from dashboard
    if (view !== 'dashboard') {
      setAnalysisComplete(false);
    }
    // Reset selected when navigating to reports to show the list
    if (view === 'reports') {
      setSelected(null);
    }
  };

  const handleNewAnalysis = () => {
    setSelected(null);
    setAnalysisComplete(false);
  };

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };


  // Check if login is required for current view
  const requiresAuth = currentView === 'settings' && (currentView.includes('scheduled') || currentView.includes('notifications'));

  return (
    <ThemeProvider>
      <div className="app-container">
        <NavBar onNavigate={handleNavigation} user={user} onLogout={handleLogout} />
        <div className="container-fluid px-md-4">
          {currentView === 'dashboard' && (
            <div className="row g-3">
              {!analysisComplete ? (
                // Show only upload card initially
                <div className="col-12 col-md-8 col-lg-6 mx-auto">
                  <UploadCard onUploaded={handleUploaded} />
                </div>
              ) : (
                // Show only report panel after analysis
                <div className="col-12">
                  <ReportPanel hash={selected?.hash} onNewAnalysis={handleNewAnalysis} />
                </div>
              )}
            </div>
          )}
          
          {currentView === 'reports' && (
            <div className="row">
              <div className="col-12">
                <div className="mb-4 d-flex justify-content-between align-items-center">
                  <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.8rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '2rem', marginRight: '12px' }}>📁</span>
                      All Reports
                  </h3>
                    <p className="text-muted">
                      Browse and access all your previous analysis reports
                    </p>
                  </div>
                </div>
                {!selected ? (
                  <ScansCard 
                    onSelect={(s) => { 
                      const hash = s.MD5 || s.hash || s.md5;
                      setSelected({ hash }); 
                    }} 
                    refreshKey={refreshKey} 
                  />
                ) : (
                  <div>
                    <ReportPanel 
                      hash={selected?.hash} 
                      onNewAnalysis={() => {
                        setSelected(null);
                      }} 
                    />
                    <div className="mt-3 text-center">
                      <button
                        onClick={() => setSelected(null)}
                        className="btn btn-outline-secondary"
                        style={{
                          borderRadius: '10px',
                          padding: '0.5rem 1.5rem',
                          fontWeight: 600
                        }}
                      >
                        ← Back to Reports List
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          
          {currentView === 'settings' && (
            <div className="row">
              <div className="col-12 col-md-10 col-lg-8 mx-auto">
                {!user ? (
                  <Login onLogin={handleLogin} />
                ) : (
                  <>
                    <Card className="shadow-lg p-4 mb-4" style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                  <div className="mb-4">
                    <h3 style={{ fontWeight: 700, fontSize: '1.8rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '2rem', marginRight: '12px' }}>⚙️</span>
                      Settings
                    </h3>
                    <p className="text-muted" style={{ fontSize: '1rem' }}>Configuration and preferences</p>
                  </div>
                  
                  <hr style={{ borderColor: 'var(--border-color)', margin: '2rem 0' }} />
                  
                  <div className="mb-4">
                    <h5 style={{ fontWeight: 700, marginBottom: '1rem', color: '#667eea' }}>
                      🔧 MobSF Configuration
                    </h5>
                    <div className="p-3" style={{ 
                      background: 'var(--bg-secondary)', 
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div className="mb-2">
                        <strong>Backend URL:</strong>
                        <code className="ms-2" style={{ 
                          padding: '4px 8px',
                          background: 'rgba(102, 126, 234, 0.1)',
                          borderRadius: '6px',
                          fontSize: '0.9rem'
                        }}>
                          http://localhost:4000
                        </code>
                      </div>
                      <div>
                        <strong>MobSF Server:</strong>
                        <code className="ms-2" style={{ 
                          padding: '4px 8px',
                          background: 'rgba(102, 126, 234, 0.1)',
                          borderRadius: '6px',
                          fontSize: '0.9rem'
                        }}>
                          http://localhost:8000
                        </code>
                      </div>
                    </div>
                  </div>
                  
                  <hr style={{ borderColor: 'var(--border-color)', margin: '2rem 0' }} />
                  
                  <div>
                    <h5 style={{ fontWeight: 700, marginBottom: '1rem', color: '#667eea' }}>
                      🛠️ Available Tools
                    </h5>
                    <div className="d-flex flex-column gap-3">
                      <div className="p-3 d-flex align-items-center" style={{ 
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                        borderRadius: '12px',
                        border: '1px solid rgba(102, 126, 234, 0.2)'
                      }}>
                        <span style={{ fontSize: '1.5rem', marginRight: '12px' }}>✅</span>
                        <div>
                          <strong>MobSF</strong> - Mobile Security Framework
                          <div className="small text-muted">Core analysis engine for mobile app security</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                    <NotificationsSettings />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
