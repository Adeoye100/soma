import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useDashboardStore } from '@/store/dashboardStore';
import { cn } from '@/lib/utils';
import { 
  User, Lock, Bell, Globe, Palette, Shield,
  Mail, Smartphone, Moon, Sun, Save, Key,
  Fingerprint, Eye, EyeOff, Check
} from 'lucide-react';

const accentColors = [
  { color: '#6C63FF', name: 'indigo', label: 'Indigo' },
  { color: '#22C55E', name: 'green', label: 'Green' },
  { color: '#3B82F6', name: 'blue', label: 'Blue' },
  { color: '#F59E0B', name: 'amber', label: 'Amber' },
  { color: '#EF4444', name: 'red', label: 'Red' },
] as const;

export function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const { theme, setTheme, accentColor, setAccentColor } = useDashboardStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences.
        </p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="w-4 h-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="w-4 h-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <div className="card-surface p-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-foreground mb-6">Profile Information</h3>
              
              <div className="flex items-center gap-4 mb-6">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin"
                  alt="Profile"
                  className="w-20 h-20 rounded-full bg-primary/20"
                />
                <div>
                  <Button variant="outline" size="sm" className="gap-2">
                    Change Avatar
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG or GIF. Max 2MB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">First Name</Label>
                  <Input 
                    defaultValue="Adeoye" 
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Last Name</Label>
                  <Input 
                    defaultValue="Opeyemi" 
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <Input 
                    defaultValue="adeoyeopeyemi951@gmail.com" 
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm text-muted-foreground">Role</Label>
                  <Input 
                    defaultValue="Senior Administrator" 
                    disabled
                    className="bg-muted border-border opacity-50"
                  />
                </div>
              </div>

              <Separator className="my-6 bg-border" />

              <div className="flex justify-end">
                <Button className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6 max-w-2xl">
              <div className="card-surface p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">Change Password</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Current Password</Label>
                    <div className="relative">
                      <Input 
                        type={showPassword ? 'text' : 'password'}
                        className="bg-muted border-border pr-10"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">New Password</Label>
                    <Input 
                      type="password"
                      className="bg-muted border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Confirm New Password</Label>
                    <Input 
                      type="password"
                      className="bg-muted border-border"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button className="gap-2">
                    <Key className="w-4 h-4" />
                    Update Password
                  </Button>
                </div>
              </div>

              <div className="card-surface p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Fingerprint className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={twoFactorEnabled}
                    onCheckedChange={setTwoFactorEnabled}
                  />
                </div>
              </div>

              <div className="card-surface p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-muted">
                      <Shield className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Active Sessions</h4>
                      <p className="text-sm text-muted-foreground">
                        Manage your active login sessions
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Sessions
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="card-surface p-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-foreground mb-6">Notification Preferences</h3>
              
              <div className="space-y-6">
                {[
                  { 
                    label: 'Email Notifications', 
                    desc: 'Receive updates via email',
                    icon: Mail,
                    enabled: true 
                  },
                  { 
                    label: 'Push Notifications', 
                    desc: 'Receive push notifications on your device',
                    icon: Smartphone,
                    enabled: true 
                  },
                  { 
                    label: 'System Alerts', 
                    desc: 'Critical system notifications',
                    icon: Shield,
                    enabled: true 
                  },
                  { 
                    label: 'Weekly Reports', 
                    desc: 'Weekly summary of platform activity',
                    icon: Globe,
                    enabled: false 
                  },
                ].map((setting) => (
                  <div key={setting.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <setting.icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{setting.label}</p>
                        <p className="text-sm text-muted-foreground">{setting.desc}</p>
                      </div>
                    </div>
                    <Switch defaultChecked={setting.enabled} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          {activeTab === 'appearance' && (
            <div className="card-surface p-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-foreground mb-6">Appearance</h3>
              
              <div className="space-y-6">
                <div>
                  <Label className="text-sm text-muted-foreground mb-3 block">Theme</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setTheme('dark')}
                      className={cn(
                        "p-4 rounded-xl border flex items-center gap-3 transition-all",
                        theme === 'dark'
                          ? 'bg-primary/10 border-primary/50'
                          : 'bg-muted border-transparent hover:border-border'
                      )}
                    >
                      <Moon className={cn(
                        "w-5 h-5",
                        theme === 'dark' ? 'text-primary' : 'text-muted-foreground'
                      )} />
                      <span className={theme === 'dark' ? 'text-foreground' : 'text-muted-foreground'}>
                        Dark
                      </span>
                    </button>
                    <button 
                      onClick={() => setTheme('light')}
                      className={cn(
                        "p-4 rounded-xl border flex items-center gap-3 transition-all",
                        theme === 'light'
                          ? 'bg-primary/10 border-primary/50'
                          : 'bg-muted border-transparent hover:border-border'
                      )}
                    >
                      <Sun className={cn(
                        "w-5 h-5",
                        theme === 'light' ? 'text-primary' : 'text-muted-foreground'
                      )} />
                      <span className={theme === 'light' ? 'text-foreground' : 'text-muted-foreground'}>
                        Light
                      </span>
                    </button>
                  </div>
                </div>

                <Separator className="bg-border" />

                <div>
                  <Label className="text-sm text-muted-foreground mb-3 block">Accent Color</Label>
                  <div className="flex flex-wrap gap-3">
                    {accentColors.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setAccentColor(c.name)}
                        className={cn(
                          "w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center",
                          accentColor === c.name
                            ? 'border-primary scale-110'
                            : 'border-transparent hover:scale-105'
                        )}
                        style={{ backgroundColor: c.color }}
                        title={c.label}
                      >
                        {accentColor === c.name && (
                          <Check className="w-5 h-5 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Selected: {accentColors.find(c => c.name === accentColor)?.label}
                  </p>
                </div>

                <Separator className="bg-border" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Compact Mode</p>
                    <p className="text-sm text-muted-foreground">Reduce spacing and padding</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Animations</p>
                    <p className="text-sm text-muted-foreground">Enable UI animations</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </Tabs>
    </div>
  );
}
