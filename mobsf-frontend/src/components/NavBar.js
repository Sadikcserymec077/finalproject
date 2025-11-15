import React, { useContext } from 'react';
import { Navbar, Container, Nav, Badge, Button } from 'react-bootstrap';
import { useTheme } from '../ThemeContext';

export default function NavBar({ onNavigate, user, onLogout }) {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <Navbar 
      expand="md" 
      className="mb-4 shadow-lg" 
      style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderBottom: '3px solid rgba(255,255,255,0.25)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)'
      }}
      variant="dark"
    >
      <Container fluid>
        <Navbar.Brand 
          href="#" 
          className="d-flex align-items-center" 
          style={{ 
            fontWeight: 800, 
            fontSize: '1.5rem',
            letterSpacing: '-0.5px',
            transition: 'transform 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ marginRight: 12, fontSize: '1.8rem', animation: 'float 3s ease-in-out infinite' }}>🛡️</span>
          <span>Static Analysis Framework</span>
          <Badge 
            bg="warning" 
            text="dark" 
            className="ms-2" 
            style={{ 
              fontSize: '0.65rem',
              padding: '4px 8px',
              borderRadius: '12px',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            v2.0
          </Badge>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" style={{ border: '2px solid rgba(255,255,255,0.3)' }} />
        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto">
            <Nav.Link 
              href="#dashboard" 
              className="text-white" 
              style={{ 
                fontWeight: 600,
                fontSize: '1rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                margin: '0 4px',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('dashboard'); }}
            >
              📊 Dashboard
            </Nav.Link>
            <Nav.Link 
              href="#reports" 
              className="text-white" 
              style={{ 
                fontWeight: 600,
                fontSize: '1rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                margin: '0 4px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('reports'); }}
            >
              📁 Reports
            </Nav.Link>
            <Nav.Link 
              href="#settings" 
              className="text-white" 
              style={{ 
                fontWeight: 600,
                fontSize: '1rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                margin: '0 4px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('settings'); }}
            >
              ⚙️ Settings
            </Nav.Link>
          </Nav>
          <Nav>
            <div className="d-flex align-items-center me-3">
              <Badge 
                bg="success"
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
              >
                ✓ MobSF
              </Badge>
            </div>
            {user && (
              <div className="d-flex align-items-center me-3">
                <Badge 
                  bg="info"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  👤 {user.username}
                </Badge>
              </div>
            )}
            <Button 
              variant="outline-light" 
              size="sm" 
              onClick={toggleTheme}
              className="d-flex align-items-center me-2"
              style={{
                borderWidth: '2px',
                borderRadius: '20px',
                padding: '6px 16px',
                fontWeight: 600,
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)'
              }}
            >
              <span style={{ fontSize: '1.2rem', marginRight: '6px' }}>
                {theme === 'light' ? '🌙' : '☀️'}
              </span>
              <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
            </Button>
            {user && onLogout && (
              <Button 
                variant="outline-light" 
                size="sm" 
                onClick={onLogout}
                style={{
                  borderWidth: '2px',
                  borderRadius: '20px',
                  padding: '6px 16px',
                  fontWeight: 600
                }}
              >
                🚪 Logout
              </Button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
