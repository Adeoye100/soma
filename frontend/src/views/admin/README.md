# Admin Panel - Quick Start

## Access Admin Panel

1. **Login** with: `adeoyeopeyemi951@gmail.com`
2. **Navigate** to: `http://localhost:5173/admin`
3. **Dashboard** loads with 8 admin pages available

## Files Overview

```
admin/
├── AdminProtectedRoute.tsx           # Route guard for admin access
├── components/
│   ├── AdminLayout.tsx               # Page wrapper with header & sidebar
│   ├── AdminSidebar.tsx              # Navigation menu
│   └── StatCard.tsx                  # Reusable metric card
└── pages/
    ├── AdminDashboard.tsx            # Overview & quick actions
    ├── SystemHealth.tsx              # System metrics (CPU, memory, disk)
    ├── Monitoring.tsx                # Performance & request metrics
    ├── Automation.tsx                # Workflow management
    ├── Queues.tsx                    # Queue status & controls
    ├── Configuration.tsx             # Environment settings
    ├── Alerts.tsx                    # Alert management
    └── SystemInfo.tsx                # System & app information
```

## Key Components

### AdminLayout
Wrapper component that provides:
- Dark theme styling
- Header with logout button
- Sidebar navigation
- Responsive mobile menu

### AdminSidebar
Navigation menu with 8 items:
- 📊 Dashboard
- ❤️ System Health
- 📈 Monitoring
- ⚙️ Automation
- 📦 Queues
- ⚡ Configuration
- 🚨 Alerts
- ℹ️ System Info

## API Integration

All pages use `AdminApiService` for backend calls:

```typescript
import { AdminApiService } from '../../../services/admin/adminApiService';

// Example usage
const data = await AdminApiService.getDashboard();
const health = await AdminApiService.getSystemHealth();
```

## Styling

- **Theme**: Dark (slate-900/950 backgrounds)
- **Accents**: Blue-600 for primary, green for success, red for errors
- **Icons**: Emoji for simplicity (no external dependencies)
- **Responsive**: Works on mobile with collapsible sidebar

## Adding New Pages

1. Create `YourPage.tsx` in `pages/`
2. Import and use `AdminLayout` component
3. Add route in `App.tsx`
4. Add menu item in `AdminSidebar.tsx`

## Mock Data

Pages include fallback mock data for development testing without a full backend.

## For Questions

See `../../../ADMIN_PANEL_SETUP.md` for full documentation.
