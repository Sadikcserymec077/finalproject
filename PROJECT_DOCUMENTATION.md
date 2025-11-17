# 📚 Complete Project Documentation
## Static Analysis Framework - From Scratch to Latest Changes

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Project Evolution](#project-evolution)
3. [Initial Setup](#initial-setup)
4. [Core Features Implementation](#core-features-implementation)
5. [Advanced Features Implementation](#advanced-features-implementation)
6. [Latest Changes & Removals](#latest-changes--removals)
7. [Technical Architecture](#technical-architecture)
8. [File Structure](#file-structure)
9. [API Endpoints](#api-endpoints)
10. [Configuration](#configuration)

---

## Project Overview

**Static Analysis Framework** is a comprehensive web-based security analysis platform for Android applications. It provides automated static analysis using MobSF (Mobile Security Framework) and SonarQube, with a modern React-based user interface and Node.js backend.

### Key Capabilities
- Upload and analyze Android APK files
- Generate comprehensive security reports
- Email notifications with PDF attachments
- Multi-user authentication
- Report management (tags, favorites, archiving)
- Security score calculation
- Report persistence and caching

---

## Project Evolution

### Phase 1: Initial Development (v1.0)
**Goal:** Create a basic web UI for MobSF

**Features Implemented:**
- Basic APK upload functionality
- MobSF integration via API proxy
- Simple report display
- PDF and JSON export
- Basic UI with React Bootstrap

**Technology Stack:**
- Frontend: React 19.2.0, React Bootstrap
- Backend: Node.js, Express.js
- External: MobSF (Docker)

### Phase 2: Enhanced Features (v2.0 - Early)
**Goal:** Add multi-tool analysis and unified reports

**Features Added:**
- SonarQube integration (simulated and real)
- Unified report generation (MobSF + SonarQube)
- Enhanced report visualization
- Multiple report views (MobSF Summary, Unified, Raw JSON)
- Recent scans persistence
- Security score calculation

### Phase 3: Advanced Features (v2.0 - Mid)
**Goal:** Add enterprise-level features

**Features Added:**
- Search and filter reports
- Report comparison functionality
- CSV export
- Report management (delete, archive, tags, favorites)
- Annotations system
- Analytics dashboard
- Dark/Light mode toggle

### Phase 4: Notifications & Auth (v2.0 - Recent)
**Goal:** Add communication and security features

**Features Added:**
- Email notifications (SMTP/SendGrid)
- PDF attachments in emails
- Multi-user authentication (JWT)
- Critical vulnerability alerts
- Report sharing via email
- Performance caching

### Phase 5: Cleanup & Optimization (v2.0 - Latest)
**Goal:** Streamline UI and remove unnecessary features

**Features Removed:**
- Analytics dashboard (from navbar)
- Report comparison
- Search filters
- Webhook notifications
- CSV export
- Scheduled scans
- Shareable links

**Features Retained:**
- Core APK analysis
- Email notifications with PDF attachments
- Report management (tags, favorites, archiving)
- Multi-user authentication
- Report persistence

---

## Initial Setup

### Project Structure Created

```
static-analysis-mobsf/
├── mobsf-frontend/          # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── api.js           # API client
│   │   └── App.js           # Main app component
│   └── package.json
│
├── mobsf-ui-backend/        # Node.js backend server
│   ├── server.js            # Main server file
│   ├── metadata.js          # Metadata storage
│   ├── notifications.js     # Email notifications
│   ├── auth.js              # Authentication
│   ├── cache.js             # Caching system
│   └── package.json
│
└── Root files
    ├── setup.bat            # Windows setup script
    ├── start.bat            # Windows start script
    ├── start.sh             # Linux/Mac start script
    └── README.md            # Documentation
```

### Dependencies Installed

**Backend:**
- `express` - Web framework
- `axios` - HTTP client
- `multer` - File upload handling
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variables
- `nodemailer` - Email notifications
- `@sendgrid/mail` - SendGrid email service
- `jsonwebtoken` - JWT authentication
- `bcryptjs` - Password hashing
- `uuid` - Unique ID generation

**Frontend:**
- `react` - UI framework
- `react-bootstrap` - UI components
- `axios` - HTTP client
- `recharts` - Data visualization
- `bootstrap-icons` - Icons

---

## Core Features Implementation

### 1. APK Upload & Analysis

**Backend (`server.js`):**
- `/api/upload` - Handles APK file upload
- `/api/scan` - Triggers MobSF analysis
- `/api/scan_logs` - Polls scan progress
- `/api/unified_report` - Generates unified report

**Frontend (`UploadCard.js`, `UploadForm.js`):**
- Drag-and-drop file upload
- Progress tracking
- Real-time scan status
- Automatic report loading

**Flow:**
1. User uploads APK → Backend saves to temp directory
2. Backend sends to MobSF API → MobSF analyzes APK
3. Backend polls scan status → Shows progress to user
4. Scan completes → Backend fetches report
5. Report saved locally → Frontend displays results

### 2. Report Display

**Components:**
- `HumanReport.js` - Human-readable MobSF summary
- `DetailedReport.js` - Unified multi-tool report
- `ReportPanel.js` - Main report container

**Features:**
- Security score visualization
- Severity-based findings grouping
- Interactive charts and graphs
- PDF and JSON export
- Report metadata display

### 3. Report Persistence

**Backend:**
- Saves JSON reports to `reports/json/`
- Saves PDF reports to `reports/pdf/`
- Generates unified reports (`{hash}_unified.json`)
- Calculates and stores security scores

**Frontend:**
- Loads reports from saved files
- Displays recent scans list
- Persists across page refreshes

---

## Advanced Features Implementation

### 1. Email Notifications

**Implementation (`notifications.js`):**
- SMTP support (Gmail, Outlook, custom)
- SendGrid API support
- HTML email templates
- PDF attachment support
- Automatic PDF generation if missing

**Features:**
- Scan completion notifications
- Critical vulnerability alerts
- Manual report sending
- Test email functionality
- Email deliverability optimizations

**Configuration:**
- Stored in `notifications-config.json`
- Supports both SMTP and SendGrid
- Password/API key masking in UI

### 2. Multi-User Authentication

**Implementation (`auth.js`):**
- JWT-based authentication
- Password hashing with bcrypt
- User registration and login
- Token verification
- Password change functionality

**Storage:**
- User accounts stored in SQLite (`mobsf-ui-backend/data/mobsf-ui.db`, `users` table)
- Tokens stored in localStorage (frontend)
- Secure password hashing

### 3. Report Management

**Metadata System (`metadata.js`):**
- Tags management
- Favorites toggle
- Archive/unarchive
- Annotations (notes, false positives)
- SQLite-backed storage (`report_metadata`, `report_tags`, `annotations`)

**UI Components:**
- `TagManager.js` - Tag management
- `AnnotationsPanel.js` - Notes and comments
- Enhanced `ScansCard.js` - Management actions

### 4. Security Score Calculation

**Algorithm:**
```javascript
// Weighted penalty system
const weightedPenalty = 
  (highCount * 10) + 
  (mediumCount * 5) + 
  (infoCount * 1) + 
  (dangerousPermsCount * 8);

const maxPenalty = Math.max(totalItems * 10, 1);
const score = Math.max(0, Math.round(100 - (weightedPenalty / maxPenalty) * 100));
```

**Display:**
- Color-coded badges (Green ≥70, Yellow 40-69, Red <40)
- Install recommendation messages
- Progress bars and visualizations

### 5. Performance Caching

**Implementation (`cache.js`):**
- In-memory cache with TTL
- Automatic expiration
- Cache statistics
- Manual cache clearing

**Cached Data:**
- Report JSON responses
- Analytics dashboard data
- Frequently accessed reports

---

## Latest Changes & Removals

### Removed Features (Latest Update)

1. **Analytics Dashboard**
   - Removed from navbar
   - Component still exists but not accessible
   - Analytics data still calculated but not displayed

2. **Report Comparison**
   - Removed comparison mode toggle
   - Removed `ReportComparison` component usage
   - Comparison API endpoint still exists

3. **Search Filters**
   - Removed `SearchFilterBar` component
   - Removed filter UI from reports view
   - Search API endpoint still functional

4. **Webhook Notifications**
   - Removed webhook section from settings
   - Email notifications retained
   - Webhook backend code still exists

5. **CSV Export**
   - Removed CSV export button
   - Removed `exportToCSV` function
   - CSV API endpoint still exists

6. **Scheduled Scans**
   - Removed scheduled scans feature
   - Removed `ScheduledScans` component
   - Scheduler backend code removed

7. **Shareable Links**
   - Removed shareable links feature
   - Removed `ShareableLinkManager` component
   - Shareable links backend code removed

### Current Active Features

✅ **Core Features:**
- APK upload and analysis
- Report display (MobSF Summary, Unified, Raw JSON)
- PDF and JSON export
- Report persistence

✅ **Management Features:**
- Report deletion (single/bulk)
- Archive/unarchive
- Tags management
- Favorites
- Annotations

✅ **Communication:**
- Email notifications (SMTP/SendGrid)
- PDF attachments in emails
- Test email functionality
- Manual report sending

✅ **Security:**
- Multi-user authentication
- JWT token-based access
- Password hashing
- Secure API endpoints

✅ **Performance:**
- Report caching
- Optimized API responses
- Local file storage

---

## Technical Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         React Frontend (Port 3000)               │  │
│  │  - UploadCard, ReportPanel, ScansCard            │  │
│  │  - HumanReport, DetailedReport                   │  │
│  │  - NotificationsSettings, Login                  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST API
┌────────────────────▼────────────────────────────────────┐
│         Node.js Backend (Port 4000)                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Express.js Server                               │  │
│  │  - API Routes                                    │  │
│  │  - File Upload Handling                          │  │
│  │  - Report Processing                             │  │
│  └────────────────────┬─────────────────────────────┘  │
│                       │                                 │
│  ┌────────────────────▼─────────────────────────────┐  │
│  │  Modules:                                        │  │
│  │  - notifications.js (Email)                      │  │
│  │  - auth.js (Authentication)                     │  │
│  │  - metadata.js (Tags, Favorites)                 │  │
│  │  - cache.js (Performance)                        │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ API Calls
┌────────────────────▼────────────────────────────────────┐
│         MobSF (Docker - Port 8000)                      │
│  - APK Analysis                                         │
│  - Security Scanning                                    │
│  - Report Generation                                    │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

**Upload & Analysis Flow:**
```
User → Frontend → Backend → MobSF API
                    ↓
              Save Report
                    ↓
              Calculate Score
                    ↓
              Send Notification
                    ↓
              Frontend Display
```

**Report Access Flow:**
```
User Request → Backend Check Cache
                    ↓
         Cache Hit? → Return Cached
                    ↓
         Cache Miss → Load from File
                    ↓
              Cache Result
                    ↓
              Return to User
```

---

## File Structure

### Backend Files

**Core Files:**
- `server.js` - Main Express server, API endpoints
- `metadata.js` - Tags, favorites, annotations storage
- `notifications.js` - Email notification system
- `auth.js` - User authentication
- `cache.js` - Performance caching

**Configuration & Data:**
- `notifications-config.json` - Email settings
- `data/mobsf-ui.db` - SQLite database (users, metadata, shareable links)
- `.env` - Environment variables

**Storage:**
- `reports/json/` - JSON reports
- `reports/pdf/` - PDF reports
- `tmp/` - Temporary uploads
- `cache/` - Cache files

### Frontend Files

**Components:**
- `App.js` - Main application, routing
- `NavBar.js` - Navigation bar
- `UploadCard.js` - APK upload interface
- `ScansCard.js` - Recent scans list
- `ReportPanel.js` - Report display container
- `HumanReport.js` - MobSF summary view
- `DetailedReport.js` - Unified report view
- `NotificationsSettings.js` - Email configuration
- `Login.js` - Authentication
- `TagManager.js` - Tag management
- `AnnotationsPanel.js` - Notes and comments

**Utilities:**
- `api.js` - API client functions
- `ThemeContext.js` - Dark/Light mode

---

## API Endpoints

### Core Endpoints

**Upload & Analysis:**
- `POST /api/upload` - Upload APK file
- `POST /api/scan` - Start analysis
- `POST /api/scan_logs` - Get scan progress
- `GET /api/unified_report` - Get unified report

**Reports:**
- `GET /api/scans` - List all scans
- `GET /api/report_json` - Get JSON report
- `GET /api/download_pdf/save` - Get PDF report
- `DELETE /api/reports/:hash` - Delete report
- `POST /api/reports/bulk-delete` - Bulk delete

**Management:**
- `POST /api/reports/:hash/archive` - Archive report
- `POST /api/reports/:hash/unarchive` - Unarchive report
- `POST /api/reports/:hash/tags` - Add tag
- `DELETE /api/reports/:hash/tags/:tag` - Remove tag
- `POST /api/reports/:hash/favorite` - Toggle favorite
- `POST /api/reports/:hash/annotations` - Add annotation
- `DELETE /api/reports/:hash/annotations/:id` - Delete annotation
- `GET /api/reports/:hash/metadata` - Get metadata

**Notifications:**
- `GET /api/notifications/config` - Get settings
- `POST /api/notifications/config` - Update settings
- `POST /api/notifications/test-email` - Test email
- `POST /api/notifications/send-report` - Send report via email

**Authentication:**
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/change-password` - Change password

---

## Configuration

### Environment Variables (`.env`)

```env
MOBSF_URL=http://localhost:8000
MOBSF_API_KEY=your-api-key-here
PORT=4000
SONAR_HOST=                    # Optional
SONAR_TOKEN=                   # Optional
```

### Notification Configuration

**File:** `mobsf-ui-backend/notifications-config.json`

```json
{
  "email": {
    "enabled": true,
    "from": "sender@example.com",
    "to": ["recipient@example.com"],
    "smtp": {
      "host": "smtp.gmail.com",
      "port": 587,
      "secure": false,
      "auth": {
        "user": "your-email@gmail.com",
        "pass": "your-password"
      }
    }
  },
  "emailService": {
    "type": "smtp",
    "sendgridApiKey": ""
  },
  "alerts": {
    "scanComplete": true,
    "criticalVulnerabilities": true
  }
}
```

---

## Key Algorithms

### Security Score Calculation

```javascript
function calculateSecurityScore(findings, dangerousPerms) {
  const highCount = findings.filter(f => 
    f.severity.toLowerCase().includes('high') || 
    f.severity.toLowerCase().includes('critical')
  ).length;
  
  const mediumCount = findings.filter(f => 
    f.severity.toLowerCase().includes('medium') || 
    f.severity.toLowerCase().includes('warning')
  ).length;
  
  const infoCount = findings.filter(f => 
    !['high', 'critical', 'medium', 'warning'].some(s => 
      f.severity.toLowerCase().includes(s)
    )
  ).length;
  
  const weightedPenalty = 
    (highCount * 10) + 
    (mediumCount * 5) + 
    (infoCount * 1) + 
    (dangerousPerms * 8);
  
  const totalItems = findings.length + dangerousPerms;
  const maxPenalty = Math.max(totalItems * 10, 1);
  
  return Math.max(0, Math.round(100 - (weightedPenalty / maxPenalty) * 100));
}
```

### Report Merging Algorithm

```javascript
function mergeReports(mobsfReport, sonarReport) {
  const unified = {
    findings: [],
    summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
  };
  
  // Extract MobSF findings
  mobsfReport.manifest_analysis?.manifest_findings?.forEach(f => {
    unified.findings.push({
      tool: 'MobSF',
      category: 'Manifest Analysis',
      title: f.title,
      severity: f.severity,
      description: f.description,
      location: f.path,
      remediation: f.remediation
    });
    updateSummary(unified.summary, f.severity);
  });
  
  // Extract SonarQube findings
  sonarReport.issues?.forEach(issue => {
    unified.findings.push({
      tool: 'SonarQube',
      category: issue.type,
      title: issue.rule,
      severity: mapSonarSeverity(issue.severity),
      description: issue.message,
      location: issue.component
    });
    updateSummary(unified.summary, issue.severity);
  });
  
  return unified;
}
```

---

## Testing Approach

### Manual Testing
- Upload various APK files
- Test email notifications
- Verify report persistence
- Test authentication
- Check report management features

### Integration Testing
- Backend API endpoints
- Frontend-backend communication
- MobSF integration
- Email delivery
- File storage operations

---

## Deployment

### Local Development
```bash
# Start MobSF
cd mobsf-ui-backend
docker-compose up -d

# Start Backend
npm run dev

# Start Frontend
cd ../mobsf-frontend
npm start
```

### Production
- Backend: Deploy to Heroku, Railway, or VPS
- Frontend: Deploy to Vercel, Netlify, or static hosting
- MobSF: Keep running in Docker or deploy separately

---

## Future Enhancements

Potential additions:
- Database integration (PostgreSQL/MongoDB)
- Real-time scan progress via WebSockets
- Advanced report templates
- Integration with CI/CD pipelines
- Mobile app for viewing reports
- Automated remediation suggestions

---

## Conclusion

The Static Analysis Framework has evolved from a simple MobSF UI wrapper to a comprehensive security analysis platform with enterprise features. The latest cleanup removed unnecessary features while retaining core functionality, making it more focused and maintainable.

**Current State:**
- ✅ Core analysis functionality
- ✅ Email notifications with PDF attachments
- ✅ Report management
- ✅ Multi-user authentication
- ✅ Performance optimizations
- ✅ Clean, focused UI

**Key Achievements:**
- One-click setup for new users
- Comprehensive security reporting
- Professional email notifications
- Scalable architecture
- Well-documented codebase

---

**Last Updated:** Latest cleanup phase (removed analytics, comparison, filters, webhook, CSV export, scheduled scans, shareable links)

**Version:** 2.0 (Streamlined)

