import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const ADMIN_MENU_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: '📊' },
  { label: 'System Health', path: '/admin/system-health', icon: '❤️' },
  { label: 'Monitoring', path: '/admin/monitoring', icon: '📈' },
  { label: 'Automation', path: '/admin/automation', icon: '⚙️' },
  { label: 'Queues', path: '/admin/queues', icon: '📦' },
  { label: 'Configuration', path: '/admin/configuration', icon: '⚡' },
  { label: 'Alerts', path: '/admin/alerts', icon: '🚨' },
  { label: 'System Info', path: '/admin/system-info', icon: 'ℹ️' },
];

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();

  return (
    <>
      <button
        onClick={onToggle}
        className="hidden md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 text-slate-50"
      >
        ☰
      </button>

      <aside
        className={`${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed md:relative w-64 h-screen bg-slate-900 border-r border-slate-800 transition-transform duration-300 z-40`}
      >
        <div className="p-6 border-b border-slate-800">
          <div className="text-2xl font-bold text-slate-50">SOMA Admin</div>
          <p className="text-xs text-slate-400 mt-1">Management Panel</p>
        </div>

        <nav className="p-4">
          {ADMIN_MENU_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-black/50 md:hidden z-30"
        />
      )}
    </>
  );
};

export default AdminSidebar;
