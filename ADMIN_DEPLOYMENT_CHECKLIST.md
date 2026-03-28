# Admin Panel - Deployment Checklist

## Pre-Deployment

### Frontend Setup
- [ ] Verify `frontend/src/views/admin/` folder exists with all files
- [ ] Check `frontend/services/admin/` has both service files
- [ ] Confirm `App.tsx` imports are from correct paths
- [ ] Run `npm install` or `pnpm install`
- [ ] Run `npm run dev` - should start without errors
- [ ] Navigate to `/admin` - should redirect to login if not authenticated
- [ ] Login with `adeoyeopeyemi951@gmail.com` - should access admin panel

### Database/Backend Setup
- [ ] Backend is running on `http://localhost:3000`
- [ ] Backend has `/api/admin/` endpoint structure ready
- [ ] CORS is configured to allow frontend requests
- [ ] Authentication middleware is in place

## Backend API Endpoints Required

### Essential Endpoints
- [ ] `GET /api/admin/dashboard` - Dashboard overview data
- [ ] `GET /api/admin/system-health` - System metrics
- [ ] `GET /api/admin/verify` - Verify admin access
- [ ] `GET /api/admin/alerts` - List alerts
- [ ] `GET /api/admin/queues` - List queues

### Additional Endpoints (for full functionality)
- [ ] `GET /api/admin/monitoring` - Monitoring metrics
- [ ] `GET /api/admin/workflows` - Workflow list
- [ ] `POST /api/admin/queue/:id/pause` - Pause queue
- [ ] `POST /api/admin/queue/:id/resume` - Resume queue
- [ ] `POST /api/admin/queue/:id/clean` - Clean queue
- [ ] `GET /api/admin/configuration` - Get config
- [ ] `PUT /api/admin/configuration/:key` - Update config
- [ ] `POST /api/admin/alert/:id/acknowledge` - Acknowledge alert
- [ ] `POST /api/admin/alert/:id/resolve` - Resolve alert
- [ ] `GET /api/admin/system-info` - System information

## Testing Steps

### Access Control
- [ ] Unauthenticated user cannot access `/admin`
- [ ] Non-admin email is denied access to `/admin`
- [ ] Admin email (`adeoyeopeyemi951@gmail.com`) can access `/admin`
- [ ] Logout from admin panel works correctly

### Page Loading
- [ ] Admin Dashboard (`/admin`) loads successfully
- [ ] System Health (`/admin/system-health`) loads
- [ ] Monitoring (`/admin/monitoring`) loads
- [ ] Automation (`/admin/automation`) loads
- [ ] Queues (`/admin/queues`) loads
- [ ] Configuration (`/admin/configuration`) loads
- [ ] Alerts (`/admin/alerts`) loads
- [ ] System Info (`/admin/system-info`) loads

### Sidebar Navigation
- [ ] All 8 menu items appear in sidebar
- [ ] Active page highlighted correctly
- [ ] Navigation between pages works
- [ ] Mobile sidebar toggle works (on small screens)

### Data Display
- [ ] Dashboard shows metrics (with mock data if no backend)
- [ ] System Health shows CPU/Memory/Disk usage
- [ ] Monitoring shows request metrics
- [ ] Automation shows workflow list
- [ ] Queues shows queue status
- [ ] Configuration shows config items
- [ ] Alerts shows alert list
- [ ] System Info shows version and system details

### UI/UX
- [ ] Dark theme displays correctly
- [ ] Colors are consistent (blue, green, red accents)
- [ ] Responsive on mobile devices
- [ ] Buttons are clickable and functional
- [ ] Forms can be filled (Configuration page)

### Error Handling
- [ ] Backend errors show user-friendly messages
- [ ] Network errors are handled gracefully
- [ ] Loading states appear during data fetch
- [ ] Mock data displays if backend endpoints missing

## Performance Checklist

- [ ] Page load time is reasonable (< 2 seconds)
- [ ] No console errors on admin pages
- [ ] No memory leaks (check DevTools)
- [ ] API calls are debounced (auto-refresh doesn't spam)
- [ ] Charts and tables render smoothly

## Security Checklist

- [ ] Email whitelist is properly configured
- [ ] JWT tokens are validated on backend
- [ ] API endpoints require authentication
- [ ] Sensitive data is not logged in console
- [ ] CORS headers are properly set
- [ ] CSP (Content Security Policy) allows admin UI

## Deployment Steps

### Development Deployment
1. [ ] Run tests (if any)
2. [ ] Run `npm run build` - should complete without errors
3. [ ] Run `npm run preview` - should load correctly
4. [ ] Test all admin pages in preview mode

### Production Deployment
1. [ ] Update environment variables in production
2. [ ] Ensure backend API URL is correct
3. [ ] Run build: `npm run build`
4. [ ] Deploy to Vercel/hosting
5. [ ] Run smoke tests on production
6. [ ] Monitor for errors in production

### Post-Deployment
- [ ] Verify admin panel is accessible
- [ ] Test with real admin account
- [ ] Monitor API response times
- [ ] Check error tracking (if configured)
- [ ] Update documentation if needed

## Rollback Plan

If issues arise:
1. [ ] Keep previous deployment backed up
2. [ ] Have rollback script ready
3. [ ] Monitor error tracking service
4. [ ] Notify users if necessary
5. [ ] Fix issues and redeploy

## Documentation

- [ ] Share `ADMIN_PANEL_SETUP.md` with team
- [ ] Share `ADMIN_PANEL_MIGRATION.md` with team
- [ ] Update README if needed
- [ ] Document any customizations made
- [ ] Document new admin email additions

## Team Handoff

- [ ] Admin panel overview presentation
- [ ] Show how to access admin panel
- [ ] Demonstrate each admin page
- [ ] Explain how to add new features
- [ ] Provide support contact info

## Monitoring

After deployment, monitor:
- [ ] Admin page load times
- [ ] API endpoint response times
- [ ] Error rates
- [ ] User access patterns
- [ ] Performance metrics

## Sign-Off

- [ ] Frontend Lead: _____ Date: _____
- [ ] Backend Lead: _____ Date: _____
- [ ] QA Lead: _____ Date: _____
- [ ] DevOps Lead: _____ Date: _____

---

**Admin Panel Version**: 1.0.0
**Deployment Date**: _______________
**Status**: Ready for Production ✅
