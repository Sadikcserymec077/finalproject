import React from 'react';
import { Navbar, Container, Nav, Badge } from 'react-bootstrap';

export default function NavBar({ onNavigate }) {
  return (
    <Navbar 
      expand="md" 
      className="mb-3 shadow-sm" 
      style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderBottom: '3px solid rgba(255,255,255,0.2)'
      }}
      variant="dark"
    >
      <Container fluid>
        <Navbar.Brand href="#" className="d-flex align-items-center" style={{ fontWeight: 700, fontSize: '1.4rem' }}>
          <span style={{ marginRight: 10, fontSize: '1.6rem' }}>🛡️</span>
          <span>Static Analysis Framework</span>
          <Badge bg="warning" text="dark" className="ms-2" style={{ fontSize: '0.6rem' }}>v2.0</Badge>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto">
            <Nav.Link 
              href="#dashboard" 
              className="text-white" 
              style={{ fontWeight: 500 }}
              onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('dashboard'); }}
            >
              📊 Dashboard
            </Nav.Link>
            <Nav.Link 
              href="#reports" 
              className="text-white" 
              style={{ fontWeight: 500 }}
              onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('reports'); }}
            >
              📁 Reports
            </Nav.Link>
            <Nav.Link 
              href="#settings" 
              className="text-white" 
              style={{ fontWeight: 500 }}
              onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('settings'); }}
            >
              ⚙️ Settings
            </Nav.Link>
          </Nav>
          <Nav>
            <div className="d-flex align-items-center me-3">
              <Badge bg="success" className="me-2">✓ MobSF</Badge>
              <Badge bg="success">✓ SonarQube</Badge>
            </div>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
