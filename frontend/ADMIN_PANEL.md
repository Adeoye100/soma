# Soma Admin Panel Documentation

## Overview

The Soma Admin Panel is a comprehensive control center for system administrators and technical staff to monitor, manage, and control the Soma platform. Built with React and TypeScript, it provides real-time insights into system health, automation workflows, task queues, configuration management, and alerts.

## Access Control

**Admin Email Whitelist:**
- `adeoyeopeyemi951@gmail.com`

To add additional admin emails, edit the `ADMIN_EMAILS` array in `frontend/services/admin/adminAuthService.ts`.

## Features

### 1. Dashboard (`/admin`)
Main overview of system status with key metrics:
- System health status
- CPU and memory usage
- Request rates
- Active workflows count
- Queue statistics
- Quick action buttons for navigation

### 2. System Health (`/admin/system-health`)
Detailed system resource monitoring:
- Real-time CPU usage with breakdown (user/system)
- Memory usage with visual indicators
- System uptime
- Service dependency status
- System information (PID, platform, architecture, Node.js version)

### 3. Monitoring (`/admin/monitoring`)
Performance metrics and trace tracking:
- SLA metrics (uptime, response time, error rate)
- Metrics history table
- Traces table with status indicators
- Query metrics and traces with time filters
- Real-time data refresh every 30 seconds

### 4. Automation (`/admin/automation`)
Workflow management and execution:
- List all workflows with status
- View workflow details and execution history
- Execute workflows manually
- Track execution status (success/error/pending)
- Success rate calculations
- Pagination for large datasets

### 5. Queues (`/admin/queues`)
Task queue management:
- Overview of all queues with status
- Job count per queue
- Failed job count tracking
- Pause/resume queue operations
- Clean queue functionality for failed jobs
- Processing rate visualization

### 6. Configuration (`/admin/configuration`)
Environment variable and settings management:
- View configurations per environment
- Edit settings with real-time validation
- Configuration history tracking
- Reload all configurations globally
- Support for boolean, number, and string values

### 7. Alerts (`/admin/alerts`)
Alert management and notifications:
- View active alerts with severity levels (critical/warning/info)
- Acknowledge alerts
- Resolve alerts
- Filter by status and severity
- Alert guidelines for different severity levels

### 8. System Info (`/admin/system-info`)
Detailed system information:
- Process ID and uptime
- Memory breakdown (RSS, heap, external)
- CPU usage statistics
- Service dependencies with connection status
- Memory usage visualization

## Architecture

### Directory Structure

```
frontend/
├── components/
│   └── admin/
│       ├── AdminLayout.tsx          # Main admin layout wrapper
│       ├── AdminSidebar.tsx         # Navigation sidebar
│       ├── StatCard.tsx             # Reusable stat display card
│       └── StatusBadge.tsx          # Status indicator badge
├── pages/
│   └── admin/
│       ├── AdminDashboard.tsx       # Dashboard page
│       ├── SystemHealth.tsx         # System health page
│       ├── Monitoring.tsx           # Monitoring page
│       ├── Automation.tsx           # Automation page
│       ├── Queues.tsx               # Queues page
│       ├── Configuration.tsx        # Configuration page
│       ├── Alerts.tsx               # Alerts page
│       └── SystemInfo.tsx           # System info page
├── services/
│   └── admin/
│       ├── adminAuthService.ts      # Admin authentication logic
│       └── adminApiService.ts       # Admin API calls
├── components/
│   └── AdminProtectedRoute.tsx      # Admin route protection
└── src/hooks/
    └── useAdminData.ts              # Custom hooks for admin data
```

### Authentication Flow

1. User logs in via Supabase
2. `AdminProtectedRoute` component checks admin status
3. `AdminAuthService.isAdmin()` validates email against whitelist
4. Access granted to `/admin/*` routes if authorized
5. API calls include JWT token from Supabase session

### API Integration

All admin endpoints are protected by backend middleware requiring:
- Valid JWT token in `Authorization` header
- User role of 'admin' in token claims

Endpoints are prefixed with `/api/admin/` and include:
- Health & monitoring endpoints
- Automation management endpoints
- Queue management endpoints
- Configuration management endpoints
- System information endpoints
- Alert management endpoints

## Components

### AdminLayout
Wrapper component providing:
- Sidebar navigation
- Header with user info and logout
- Main content area
- Responsive design for mobile/desktop

### AdminSidebar
Navigation sidebar with:
- All 8 admin page links
- Active page highlighting
- Badge indicators (e.g., new alerts)
- Mobile-responsive menu toggle
- Back to dashboard link

### StatCard
Reusable metric card displaying:
- Label and value
- Optional icon
- Change indicator (positive/negative/neutral)
- Subtext information

### StatusBadge
Visual status indicator with:
- Status types: active, inactive, error, warning, pending, success
- Size variants: sm, md, lg
- Color-coded styling
- Animated status dot

## Custom Hooks

### useSystemHealth
```typescript
const { data, loading, error, refetch } = useSystemHealth({
  refetchInterval: 30000, // ms
  onError: (error) => { /* handle error */ }
});
```

### useMonitoringStatus
```typescript
const { data, loading, error, refetch } = useMonitoringStatus();
```

### useWorkflows
```typescript
const { data, loading, error, refetch } = useWorkflows();
```

### useQueues
```typescript
const { data, overview, loading, error, refetch } = useQueues();
```

### useAlerts
```typescript
const { data, loading, error, refetch } = useAlerts();
```

### useSystemInfo
```typescript
const { data, loading, error, refetch } = useSystemInfo();
```

## API Service Methods

### AdminApiService

**Health & Monitoring:**
- `getSystemHealth()` - Overall system health
- `getMonitoringStatus()` - Monitoring status
- `queryMetrics(params)` - Query metrics with filters
- `queryTraces(params)` - Query traces with filters
- `getSLAMetrics()` - SLA metrics

**Automation:**
- `getAutomationOverview()` - Overview statistics
- `getWorkflows()` - List all workflows
- `getWorkflow(id)` - Get specific workflow
- `executeWorkflow(id, payload)` - Execute workflow
- `getExecutions(params)` - Query executions
- `getExecution(id)` - Get execution details
- `cancelExecution(id)` - Cancel running execution

**Queues:**
- `getQueueOverview()` - Queue statistics
- `getQueueInfo(name)` - Specific queue info
- `pauseQueue(name)` - Pause queue
- `resumeQueue(name)` - Resume queue
- `cleanQueue(name, status, grace)` - Clean failed jobs

**Configuration:**
- `getAllConfigurations()` - All environment configs
- `getEnvironments()` - List environments
- `getEnvironmentConfiguration(env)` - Get config
- `updateEnvironmentConfiguration(env, config)` - Update config
- `reloadConfigurations()` - Reload all configs
- `getConfigurationHistory(params)` - Config change history

**System:**
- `getSystemInfo()` - System information
- `getDependencies()` - Service dependency status

**Alerts:**
- `getAlerts(params)` - Query alerts
- `acknowledgeAlert(id)` - Acknowledge alert
- `resolveAlert(id)` - Resolve alert

## Styling

The admin panel uses:
- **Colors:** Slate-based dark theme (slate-50, slate-200, slate-800, slate-900)
- **Accents:** Blue (primary), Green (success), Red (error), Yellow (warning)
- **Framework:** Tailwind CSS
- **Icons:** Lucide React

## Security Considerations

1. **Email Whitelist:** Only whitelisted emails can access admin panel
2. **JWT Tokens:** All API requests require valid JWT tokens
3. **Backend Validation:** Server validates admin status on each request
4. **Protected Routes:** React Router prevents unauthorized navigation
5. **HTTPS Only:** Deployed with HTTPS enforcement
6. **Session Management:** Sessions managed by Supabase Auth

## Adding New Admin Pages

1. Create page component in `frontend/pages/admin/PageName.tsx`
2. Import in `App.tsx`
3. Add route in admin routes section
4. Add navigation item in `AdminSidebar.tsx`
5. Use `AdminLayout` wrapper for consistency
6. Fetch data using `AdminApiService` or custom hooks

## Extending Admin Features

### Adding a New API Endpoint

1. Add backend endpoint in `backend/src/routes/admin.ts`
2. Add method in `AdminApiService` class
3. Create custom hook in `useAdminData.ts` if needed
4. Use in admin pages

### Adding a New Admin Page

1. Create component file in `frontend/pages/admin/`
2. Use `AdminLayout` for wrapper
3. Implement data fetching with error handling
4. Add route in `App.tsx`
5. Add sidebar navigation link

## Troubleshooting

### Admin Access Denied
- Verify email is in `ADMIN_EMAILS` whitelist
- Clear browser cache and re-login
- Check user role in Supabase JWT token

### API Errors
- Check backend admin routes are mounted
- Verify JWT token is valid
- Check network tab for failed requests

### Data Not Loading
- Check browser console for errors
- Verify API endpoint URLs
- Check backend service availability

## Future Enhancements

- [ ] Real-time WebSocket updates
- [ ] Advanced analytics and reporting
- [ ] User management interface
- [ ] Audit logging dashboard
- [ ] Custom metrics and alerts
- [ ] Role-based access control (RBAC)
- [ ] Multi-factor authentication (MFA)
- [ ] Backup and disaster recovery management

## Support

For issues or questions about the admin panel, contact the development team or refer to backend documentation for API details.
