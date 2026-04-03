import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, Activity, Heart, Zap, Server, 
  Bell, Settings, List, MessageSquare, RefreshCw, 
  Menu, X, User
} from 'lucide-react';
import { useAdminStream } from '../../../hooks/useAdminStream';
import { LiveIndicator } from './LiveIndicator';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, badge, active }) => (
  <Link
    to={to}
    className={`flex items-center px-4 py-3 transition-colors relative group ${
      active 
        ? 'bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500' 
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-l-4 border-transparent'
    }`}
  >
    <span className="mr-3">{icon}</span>
    <span className="font-medium">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
        {badge}
      </span>
    )}
  </Link>
);

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const { data: liveData, connected } = useAdminStream();

  const getInitials = (email?: string) => {
    if (!email) return 'AD';
    return email.substring(0, 2).toUpperCase();
  };

  const navItems = [
    { to: '/admin', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/admin/monitoring', icon: <Activity size={20} />, label: 'Monitoring' },
    { to: '/admin/system-health', icon: <Heart size={20} />, label: 'System Health' },
    { to: '/admin/automation', icon: <Zap size={20} />, label: 'Automation' },
    { to: '/admin/system-info', icon: <Server size={20} />, label: 'System Info' },
    { to: '/admin/alerts', icon: <Bell size={20} />, label: 'Alerts', badge: liveData?.status === 'critical' ? 1 : 0 },
    { to: '/admin/configuration', icon: <Settings size={20} />, label: 'Configuration' },
    { to: '/admin/queues', icon: <List size={20} />, label: 'Queues' },
    { to: '/admin/feedback', icon: <MessageSquare size={20} />, label: 'Feedback' },
  ];

  return (
    <div className="flex h-screen bg-[#0f1117] text-[#f1f5f9] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed lg:relative z-50 w-60 h-full bg-[#1a1d27] border-r border-[#2a2d3e] transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6">
            <h1 className="text-xl font-bold text-indigo-500 flex items-center">
              <Zap className="mr-2" size={24} fill="currentColor" />
              Soma Admin
            </h1>
          </div>

          <nav className="flex-1 mt-4 overflow-y-auto">
            {navItems.map((item) => (
              <NavItem 
                key={item.to}
                {...item}
                active={location.pathname === item.to}
              />
            ))}
          </nav>

          <div className="p-4 border-t border-[#2a2d3e] bg-[#1a1d27]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white">
                {getInitials('adeoyeopeyemi951@gmail.com')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">Opeyemi Adeoye</p>
                <p className="text-xs text-slate-500 truncate">adeoyeopeyemi951@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-[#1a1d27] border-b border-[#2a2d3e] flex items-center justify-between px-8 z-10">
          <div className="flex items-center">
            <button 
              className="lg:hidden mr-4 p-2 text-slate-400 hover:text-white"
              onClick={() => setSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div>
              <h2 className="text-lg font-semibold capitalize">
                {location.pathname.split('/').pop() || 'Dashboard'}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center text-sm text-slate-400">
              <LiveIndicator connected={connected} />
              <span className="ml-2">{connected ? 'Live Sync' : 'Reconnecting...'}</span>
            </div>
            
            <div className="text-sm text-slate-500 flex items-center">
              <RefreshCw size={14} className="mr-2" />
              Last updated: {liveData ? new Date(liveData.timestamp).toLocaleTimeString() : 'Never'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <Outlet />
        </div>
      </main>

      {/* Overlay for mobile */}
      {!isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(true)}
        />
      )}
    </div>
  );
};

export default AdminLayout;
