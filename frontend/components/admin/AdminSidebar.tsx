import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  Gauge,
  Zap,
  Settings,
  Bell,
  BarChart3,
  Server,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
}

const AdminSidebar: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { label: 'System Health', path: '/admin/system-health', icon: <Activity size={20} /> },
    { label: 'Monitoring', path: '/admin/monitoring', icon: <BarChart3 size={20} /> },
    { label: 'Automation', path: '/admin/automation', icon: <Zap size={20} /> },
    { label: 'Queues', path: '/admin/queues', icon: <Gauge size={20} /> },
    { label: 'Configuration', path: '/admin/configuration', icon: <Settings size={20} /> },
    { label: 'Alerts', path: '/admin/alerts', icon: <Bell size={20} />, badge: 'New' },
    { label: 'System Info', path: '/admin/system-info', icon: <Server size={20} /> },
  ];

  const isActive = (path: string) => location.pathname === path;

  const NavContent = () => (
    <nav className="flex-1 px-4 py-6 space-y-2">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          onClick={() => setIsMobileOpen(false)}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${
            isActive(item.path)
              ? 'bg-blue-600 text-white'
              : 'text-slate-300 hover:bg-slate-700/50'
          }`}
        >
          {item.icon}
          <span className="flex-1 font-medium text-sm">{item.label}</span>
          {item.badge && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {item.badge}
            </span>
          )}
          <ChevronRight
            size={16}
            className={`opacity-0 group-hover:opacity-100 transition-opacity ${
              isActive(item.path) ? 'opacity-100' : ''
            }`}
          />
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed bottom-4 right-4 z-40 lg:hidden bg-blue-600 text-white p-3 rounded-lg"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-800 border-r border-slate-700 min-h-screen sticky top-0">
        <div className="px-6 py-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          <p className="text-slate-400 text-xs mt-1">Soma Control Center</p>
        </div>
        <NavContent />
        <div className="px-4 py-4 border-t border-slate-700">
          <a
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-colors text-sm font-medium"
          >
            ← Back to Dashboard
          </a>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden bg-black/50">
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
            <div className="px-6 py-6 border-b border-slate-700">
              <h1 className="text-xl font-bold text-white">Admin Panel</h1>
              <p className="text-slate-400 text-xs mt-1">Soma Control Center</p>
            </div>
            <NavContent />
            <div className="px-4 py-4 border-t border-slate-700">
              <a
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-colors text-sm font-medium"
              >
                ← Back to Dashboard
              </a>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default AdminSidebar;
