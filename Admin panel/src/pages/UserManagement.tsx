import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockUsers } from '@/data/mockData';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Search, Download, MoreHorizontal, Mail, Ban,
  UserPlus, Shield, Calendar,
  TrendingUp, BookOpen, MapPin
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function UserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showBulkActionDialog, setShowBulkActionDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleAllSelection = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success/20';
      case 'inactive': return 'bg-muted text-muted-foreground';
      case 'banned': return 'bg-danger/10 text-danger border-danger/20';
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const userGrowthData = [
    { month: 'Jan', users: 1200 },
    { month: 'Feb', users: 1850 },
    { month: 'Mar', users: 2400 },
    { month: 'Apr', users: 3200 },
    { month: 'May', users: 4100 },
    { month: 'Jun', users: 5200 },
    { month: 'Jul', users: 6500 },
    { month: 'Aug', users: 7800 },
    { month: 'Sep', users: 9200 },
    { month: 'Oct', users: 10800 },
    { month: 'Nov', users: 12500 },
    { month: 'Dec', users: 15000 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage students, admins, and platform users.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="gap-2 bg-white/5 border-white/[0.07] hover:bg-white/10"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <UserPlus className="w-4 h-4" />
            Add User
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'Total Users', value: '15,000', change: '+12%', color: 'text-primary' },
          { label: 'Active', value: '12,840', change: '+8%', color: 'text-success' },
          { label: 'New (30d)', value: '1,250', change: '+24%', color: 'text-warning' },
          { label: 'Churn Rate', value: '2.4%', change: '-0.5%', color: 'text-danger' },
        ].map((stat) => (
          <div key={stat.label} className="card-surface p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <div className="flex items-end gap-2">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <span className={`text-xs ${stat.change.startsWith('+') ? 'text-success' : 'text-danger'}`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* User Growth Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card-surface p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">User Growth</h3>
            <p className="text-sm text-muted-foreground">
              Cumulative user registrations over time
            </p>
          </div>
          <Badge variant="outline" className="bg-success/10 text-success">
            <TrendingUp className="w-3 h-3 mr-1" />
            +24% this month
          </Badge>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={userGrowthData}>
              <defs>
                <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="month" 
                stroke="rgba(255,255,255,0.3)"
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.3)"
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload) {
                    return (
                      <div className="bg-card border border-white/[0.07] rounded-xl p-3 shadow-xl">
                        <p className="text-sm font-medium text-white">
                          {payload[0].payload.month}
                        </p>
                        <p className="text-lg font-bold text-primary">
                          {payload[0].value?.toLocaleString()} users
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#6C63FF"
                strokeWidth={2}
                fill="url(#growthGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap items-center gap-4"
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="pl-10 bg-white/5 border-white/[0.07]"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] bg-white/5 border-white/[0.07]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>

        {selectedUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedUsers.length} selected
            </span>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-1 bg-white/5 border-white/[0.07]"
              onClick={() => { setBulkAction('suspend'); setShowBulkActionDialog(true); }}
            >
              <Ban className="w-4 h-4" />
              Suspend
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-1 bg-white/5 border-white/[0.07]"
              onClick={() => { setBulkAction('email'); setShowBulkActionDialog(true); }}
            >
              <Mail className="w-4 h-4" />
              Email
            </Button>
          </div>
        )}
      </motion.div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card-surface overflow-hidden"
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/5">
              <th className="py-3 px-4">
                <Checkbox 
                  checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                  onCheckedChange={toggleAllSelection}
                />
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">User</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Role</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Country</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Joined</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Last Active</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredUsers.slice(0, 20).map((user) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="border-b border-white/[0.05] hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 px-4">
                    <Checkbox 
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div 
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => setSelectedUser(user)}
                    >
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-full bg-primary/20"
                      />
                      <div>
                        <p className="text-sm font-medium text-white">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className={getStatusColor(user.status)}>
                      {user.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm text-white capitalize">{user.role}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-muted-foreground">{user.country}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-muted-foreground">
                      {new Date(user.joinedAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-muted-foreground">
                      {new Date(user.lastActive).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Mail className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Ban className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </motion.div>

      {/* User Detail Modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg bg-card border-white/[0.07]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              User Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  className="w-16 h-16 rounded-full bg-primary/20"
                />
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedUser.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={getStatusColor(selectedUser.status)}>
                      {selectedUser.status}
                    </Badge>
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      {selectedUser.role}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs">Country</span>
                  </div>
                  <p className="text-sm font-medium text-white">{selectedUser.country}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">Joined</span>
                  </div>
                  <p className="text-sm font-medium text-white">
                    {new Date(selectedUser.joinedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-xs">Exams</span>
                  </div>
                  <p className="text-sm font-medium text-white">{selectedUser.examsCompleted}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs">Pass Rate</span>
                  </div>
                  <p className="text-sm font-medium text-white">{selectedUser.passRate}%</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" className="gap-2">
                  <Mail className="w-4 h-4" />
                  Send Email
                </Button>
                <Button variant="destructive" className="gap-2">
                  <Ban className="w-4 h-4" />
                  Suspend
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={showBulkActionDialog} onOpenChange={setShowBulkActionDialog}>
        <DialogContent className="bg-card border-white/[0.07]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Confirm Bulk Action
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              You are about to {bulkAction} {selectedUsers.length} users. 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkActionDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant={bulkAction === 'suspend' ? 'destructive' : 'default'}
              onClick={() => {
                setShowBulkActionDialog(false);
                setSelectedUsers([]);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
