# Admin Panel Setup & Architecture

## Overview

The Admin Panel for Soma Study Partner is a comprehensive management interface accessible only to designated administrators. It provides system monitoring, workflow management, queue operations, configuration management, and alert handling.

## Directory Structure

```
frontend/
├── src/
│   └── views/
│       └── admin/
│           ├── AdminProtectedRoute.tsx       # Protected route component for admin access
│           ├── components/
│           │   ├── AdminLayout.tsx           # Main layout wrapper with sidebar
│           │   ├── AdminSidebar.tsx          # Navigation sidebar
│           │   └── StatCard.tsx              # Reusable stat card component
│           └── pages/
│               ├── AdminDashboard.tsx        # Main dashboard overview
│               ├── SystemHealth.tsx          # System health & metrics
│               ├── Monitoring.tsx            # Real-time monitoring
│               ├── Automation.tsx            # Workflow management
│               ├── Queues.tsx                # Queue management
│               ├── Configuration.tsx         # System configuration
│               ├── Alerts.tsx                # Alert management
│               └── SystemInfo.tsx            # System information
├── services/
│   └── admin/
│       ├── adminAuthService.ts               # Admin authentication & authorization
│       └── adminApiService.ts                # API calls to backend
└── App.tsx                                   # Updated with admin routes
```

## Access Control

### Admin Whitelist

Admins are controlled via email whitelist in `frontend/services/admin/adminAuthService.ts`:

```typescript
const ADMIN_EMAILS = ['adeoyeopeyemi951@gmail.com'];
```

To add new admins, update the `ADMIN_EMAILS` array or implement database-backed admin management.

### Protected Routes

All admin routes are protected by `AdminProtectedRoute` which:
1. Verifies user is authenticated (logged in)
2. Checks if user email is in admin whitelist
3. Redirects non-admins to dashboard
4. Shows loading state during verification

## Admin Pages

### 1. Dashboard (`/admin`)
- System overview with key metrics
- Total users, active exams, completed exams
- System status, uptime, response time
- Recent activities log
- Quick action buttons

### 2. System Health (`/admin/system-health`)
- Real-time CPU, memory, disk usage
- Service status (Database, Cache, API)
- Detailed metrics with progress bars
- Auto-refresh every 30 seconds

### 3. Monitoring (`/admin/monitoring`)
- Request timeline and throughput
- Error distribution and rates
- Performance metrics
- SLA tracking

### 4. Automation (`/admin/automation`)
- Workflow management interface
- Create, view, and manage workflows
- Execution history and statistics
- Workflow status indicators

### 5. Queues (`/admin/queues`)
- Queue status and statistics
- Pending, processed, failed counts
- Pause/resume queue operations
- Clean queue functionality

### 6. Configuration (`/admin/configuration`)
- Environment variable management
- Edit configuration values
- Type validation (string, number, boolean)
- Read-only sensitive configurations

### 7. Alerts (`/admin/alerts`)
- Alert management and filtering
- Severity indicators (critical, warning, info)
- Status tracking (active, acknowledged, resolved)
- Batch actions for alerts

### 8. System Info (`/admin/system-info`)
- Application version and environment
- System architecture and platform info
- Database and cache status
- Dependency versions

## Backend API Integration

The admin panel communicates with backend endpoints via `AdminApiService`:

```typescript
// Example API calls
const dashboard = await AdminApiService.getDashboard();
const health = await AdminApiService.getSystemHealth();
const workflows = await AdminApiService.getWorkflows();
const queues = await AdminApiService.getQueues();
```

### Required Backend Routes

```
GET  /api/admin/dashboard          - Dashboard data
GET  /api/admin/system-health      - System health metrics
GET  /api/admin/monitoring         - Monitoring data
GET  /api/admin/workflows          - List workflows
GET  /api/admin/queues             - List queues
POST /api/admin/queue/:id/pause    - Pause queue
POST /api/admin/queue/:id/resume   - Resume queue
POST /api/admin/queue/:id/clean    - Clean queue
GET  /api/admin/configuration      - Get config
PUT  /api/admin/configuration/:key - Update config
GET  /api/admin/alerts             - List alerts
POST /api/admin/alert/:id/acknowledge - Acknowledge alert
POST /api/admin/alert/:id/resolve  - Resolve alert
GET  /api/admin/system-info        - System info
```

## Styling & Theme

All admin components use:
- **Color Scheme**: Dark theme with slate-900/950 backgrounds
- **Accent Colors**: Blue-600 for primary actions, green for success, red for errors/warnings
- **Typography**: System fonts with consistent sizing
- **Icons**: Emoji icons for simplicity (no external icon library required)

## Authentication Flow

1. User logs in via main app
2. User navigates to `/admin`
3. `AdminProtectedRoute` intercepts the route
4. Checks if user session exists
5. Calls `AdminAuthService.isAdmin(user)` to verify whitelist
6. If admin: renders `Outlet` with admin pages
7. If not admin: redirects to `/dashboard`
8. If not logged in: redirects to `/`

## Adding New Admin Pages

To add a new admin page:

1. **Create the page component**:
   ```typescript
   // frontend/src/views/admin/pages/NewPage.tsx
   import React from 'react';
   import AdminLayout from '../components/AdminLayout';
   
   const NewPage: React.FC = () => {
     return (
       <AdminLayout title="New Page" subtitle="Description">
         {/* Page content */}
       </AdminLayout>
     );
   };
   
   export default NewPage;
   ```

2. **Add route in App.tsx**:
   ```typescript
   import NewPage from './src/views/admin/pages/NewPage';
   
   // Inside Routes
   <Route element={<AdminProtectedRoute />}>
     <Route path="/admin/new-page" element={<NewPage />} />
   </Route>
   ```

3. **Add to sidebar menu** in `AdminSidebar.tsx`:
   ```typescript
   const ADMIN_MENU_ITEMS = [
     // ...existing items...
     { label: 'New Page', path: '/admin/new-page', icon: '📄' },
   ];
   ```

## Error Handling

All admin pages include:
- Try/catch blocks for API calls
- Mock data fallbacks for development
- User-friendly error messages
- Loading states during data fetch

## Performance Considerations

- Auto-refresh intervals are configurable (typically 30-60 seconds)
- Data is cached client-side to avoid excessive API calls
- Charts and tables use optimized rendering
- Sidebar is mobile-responsive

## Future Enhancements

- [ ] Role-based access control (RBAC)
- [ ] Admin activity logging
- [ ] Advanced filtering and search
- [ ] Custom dashboard widgets
- [ ] Export reports (CSV, PDF)
- [ ] Real-time notifications via WebSocket
- [ ] Two-factor authentication for admin login
- [ ] Audit trail for configuration changes

## Troubleshooting

### Admin pages not loading
- Verify user email is in `ADMIN_EMAILS` whitelist
- Check browser console for import/path errors
- Ensure backend API endpoints are running

### Missing data
- Backend endpoints may not be implemented
- Check `AdminApiService` for endpoint definitions
- Verify API response format matches expected types

### Styling issues
- Check Tailwind CSS is properly configured
- Verify utility classes are available
- Look for conflicting CSS from other components

## Environment Variables

No additional environment variables required for admin panel. Uses existing:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Backend API endpoint (configured in vite.config.ts proxy)
