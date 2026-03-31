import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Mail, Ban, UserPlus, Shield, RefreshCw } from 'lucide-react';

export function UserManagement() {
  const { users, fetchUsers } = useDashboardStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { fetchUsers(page, searchQuery || undefined); }, [page]);

  const handleSearch = () => { setPage(1); fetchUsers(1, searchQuery || undefined); };

  const userList = users?.users || [];
  const pagination = users?.pagination;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">All registered users from the platform.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => fetchUsers(page, searchQuery || undefined)}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: pagination?.total ?? 0, color: 'text-primary' },
          { label: 'Current Page', value: `${pagination?.page ?? 1}/${pagination?.totalPages ?? 1}`, color: 'text-success' },
          { label: 'Showing', value: userList.length, color: 'text-warning' },
          { label: 'Per Page', value: pagination?.limit ?? 20, color: 'text-muted-foreground' },
        ].map((stat) => (
          <div key={stat.label} className="card-surface p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search users by email or name..." className="pl-10 bg-white/5 border-white/[0.07]" />
        </div>
        <Button onClick={handleSearch}>Search</Button>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card-surface overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/5">
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">User</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Role</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Joined</th>
            </tr>
          </thead>
          <tbody>
            {userList.length === 0 ? (
              <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">No users found</td></tr>
            ) : userList.map((user) => (
              <tr key={user.id} className="border-b border-white/[0.05] hover:bg-white/5 transition-colors">
                <td className="py-3 px-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{user.fullName || user.username || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className="bg-primary/10 text-primary capitalize">{user.role}</Badge>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
