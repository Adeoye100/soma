import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Bell, Calendar, ChevronDown, Command,
  Clock
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const dateRanges = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'custom', label: 'Custom Range' },
] as const;

export function Topbar() {
  const { 
    dateRange, 
    setDateRange, 
    alerts,
    searchQuery,
    setSearchQuery,
  } = useDashboardStore();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  const alertList = alerts?.alerts || [];
  const unreadCount = alertList.length;

  return (
    <header className="h-16 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Left - Live Status */}
      <div className="flex items-center gap-4">
        <motion.div 
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
          </span>
          <span className="text-xs font-medium text-success">LIVE</span>
        </motion.div>
        
        {/* Search */}
        <div className="relative">
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Search...</span>
            <kbd className="ml-2 px-1.5 py-0.5 text-[10px] bg-muted rounded">⌘K</kbd>
          </button>
          
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-32"
                onClick={() => setShowSearch(false)}
              >
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <Search className="w-5 h-5 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Navigate pages..."
                        className="flex-1 border-0 bg-transparent focus-visible:ring-0 text-white placeholder:text-muted-foreground"
                        autoFocus
                      />
                      <kbd 
                        className="px-2 py-1 text-xs bg-muted rounded cursor-pointer hover:bg-muted/80"
                        onClick={() => setShowSearch(false)}
                      >
                        ESC
                      </kbd>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground mb-2">Quick Navigation</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['Overview', 'Users', 'Analytics', 'Settings'].map((item) => (
                        <button
                          key={item}
                          onClick={() => setShowSearch(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left"
                        >
                          <Command className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-white">{item}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Right - Actions */}
      <div className="flex items-center gap-3">
        {/* Date Range Picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="gap-2 bg-muted border-border hover:bg-muted/80"
            >
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                {dateRanges.find(r => r.id === dateRange)?.label}
              </span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-white/[0.07]">
            {dateRanges.map((range) => (
              <DropdownMenuItem
                key={range.id}
                onClick={() => setDateRange(range.id)}
                className={cn(
                  "cursor-pointer",
                  dateRange === range.id && "bg-primary/10 text-primary"
                )}
              >
                {range.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Alerts */}
        <div className="relative">
          <Button
            variant="outline"
            size="icon"
            className="relative bg-muted border-border hover:bg-muted/80"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger rounded-full text-[10px] font-medium text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
          
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50"
              >
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-white">System Alerts</h3>
                  <span className="text-xs text-muted-foreground">{unreadCount} active</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {alertList.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">No alerts</div>
                  ) : alertList.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="p-4 border-b border-border hover:bg-muted transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                          alert.severity === 'critical' && "bg-danger",
                          alert.severity === 'warning' && "bg-warning",
                          alert.severity === 'info' && "bg-primary",
                        )} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{alert.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Admin Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">A</span>
          </div>
          <span className="text-sm font-medium text-primary">Admin</span>
        </div>
      </div>
    </header>
  );
}
