import { useState } from 'react';
import { motion } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Bell, Send, CheckCircle, AlertTriangle, 
  Info, XCircle, Mail, MessageSquare, Smartphone,
  Clock, Users, Trash2, Plus
} from 'lucide-react';

export function Notifications() {
  const { notifications, markNotificationRead } = useDashboardStore();
  const [activeTab, setActiveTab] = useState('feed');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('all');

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-success" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'error': return <XCircle className="w-5 h-5 text-danger" />;
      case 'info': return <Info className="w-5 h-5 text-primary" />;
      default: return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-success/10 border-success/20';
      case 'warning': return 'bg-warning/10 border-warning/20';
      case 'error': return 'bg-danger/10 border-danger/20';
      case 'info': return 'bg-primary/10 border-primary/20';
      default: return 'bg-white/5';
    }
  };

  const alertRules = [
    { id: 1, name: 'Pass Rate Drop', condition: 'Pass rate < 60%', enabled: true },
    { id: 2, name: 'Server Error Spike', condition: '5xx errors > 5%', enabled: true },
    { id: 3, name: 'New User Milestone', condition: '100+ new users/day', enabled: false },
    { id: 4, name: 'Exam Completion', condition: '1000+ exams/day', enabled: true },
    { id: 5, name: 'Low Engagement', condition: 'Active users < 500', enabled: false },
  ];

  const scheduledMessages = [
    { id: 1, title: 'Weekly Report', target: 'All Admins', scheduled: '2024-01-15 09:00', status: 'pending' },
    { id: 2, title: 'Maintenance Notice', target: 'All Users', scheduled: '2024-01-20 02:00', status: 'pending' },
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
          <h1 className="text-3xl font-bold text-white">Notifications & Alerts</h1>
          <p className="text-muted-foreground mt-1">
            Manage system alerts, broadcasts, and notification settings.
          </p>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5">
          <TabsTrigger value="feed">Alert Feed</TabsTrigger>
          <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
          <TabsTrigger value="rules">Alert Rules</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-4"
        >
          {/* Alert Feed */}
          {activeTab === 'feed' && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    <Bell className="w-3 h-3 mr-1" />
                    {notifications.filter(n => !n.read).length} Unread
                  </Badge>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-2 bg-white/5 border-white/[0.07]"
                  onClick={() => notifications.forEach(n => markNotificationRead(n.id))}
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark All Read
                </Button>
              </div>

              <div className="space-y-3">
                {notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-xl border ${getNotificationColor(notification.type)} ${
                      !notification.read ? 'border-l-4 border-l-primary' : ''
                    }`}
                    onClick={() => markNotificationRead(notification.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-white/10">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-white">{notification.title}</h4>
                          <span className="text-xs text-muted-foreground">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {/* Broadcast */}
          {activeTab === 'broadcast' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card-surface p-5">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Send Broadcast Message
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Target Audience</label>
                    <Select value={broadcastTarget} onValueChange={setBroadcastTarget}>
                      <SelectTrigger className="bg-white/5 border-white/[0.07]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="students">Students Only</SelectItem>
                        <SelectItem value="admins">Admins Only</SelectItem>
                        <SelectItem value="active">Active Users (7d)</SelectItem>
                        <SelectItem value="inactive">Inactive Users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Message</label>
                    <Textarea
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Type your message here..."
                      className="bg-white/5 border-white/[0.07] min-h-[120px]"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch id="email" />
                      <label htmlFor="email" className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        Email
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="push" defaultChecked />
                      <label htmlFor="push" className="text-sm text-muted-foreground flex items-center gap-1">
                        <Smartphone className="w-4 h-4" />
                        Push
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="inapp" defaultChecked />
                      <label htmlFor="inapp" className="text-sm text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        In-App
                      </label>
                    </div>
                  </div>

                  <Button className="w-full gap-2">
                    <Send className="w-4 h-4" />
                    Send Broadcast
                  </Button>
                </div>
              </div>

              <div className="card-surface p-5">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Scheduled Messages
                </h3>
                
                <div className="space-y-3">
                  {scheduledMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{msg.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {msg.target}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {msg.scheduled}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-warning/10 text-warning">
                          {msg.status}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="w-4 h-4 text-danger" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="outline" className="w-full mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Schedule New Message
                </Button>
              </div>
            </div>
          )}

          {/* Alert Rules */}
          {activeTab === 'rules' && (
            <div className="card-surface p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Alert Rules</h3>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Rule
                </Button>
              </div>

              <div className="space-y-3">
                {alertRules.map((rule, index) => (
                  <motion.div
                    key={rule.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{rule.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        When: {rule.condition}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch checked={rule.enabled} />
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Trash2 className="w-4 h-4 text-danger" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card-surface p-5">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Email Notifications
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'New User Registrations', desc: 'When a new user signs up', enabled: true },
                    { label: 'Exam Completions', desc: 'When a student completes an exam', enabled: true },
                    { label: 'System Alerts', desc: 'Server errors and warnings', enabled: true },
                    { label: 'Weekly Reports', desc: 'Summary of weekly activity', enabled: false },
                    { label: 'Security Alerts', desc: 'Suspicious login attempts', enabled: true },
                  ].map((setting) => (
                    <div key={setting.label} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{setting.label}</p>
                        <p className="text-xs text-muted-foreground">{setting.desc}</p>
                      </div>
                      <Switch defaultChecked={setting.enabled} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-surface p-5">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Push Notifications
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'Real-time Activity', desc: 'Live user activity updates', enabled: true },
                    { label: 'Milestone Alerts', desc: 'When platform reaches milestones', enabled: true },
                    { label: 'Performance Drops', desc: 'When metrics fall below threshold', enabled: true },
                    { label: 'Maintenance Notices', desc: 'Scheduled maintenance alerts', enabled: true },
                    { label: 'Feature Updates', desc: 'New features and improvements', enabled: false },
                  ].map((setting) => (
                    <div key={setting.label} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{setting.label}</p>
                        <p className="text-xs text-muted-foreground">{setting.desc}</p>
                      </div>
                      <Switch defaultChecked={setting.enabled} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </Tabs>
    </div>
  );
}
