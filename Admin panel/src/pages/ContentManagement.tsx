import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Search, Filter, Edit, Trash2, Eye,
  FileText, BookOpen, HelpCircle, Video, Image as ImageIcon
} from 'lucide-react';

const contentItems = [
  { id: 1, title: 'WAEC Mathematics Prep', type: 'course', subject: 'Mathematics', status: 'published', views: 12500 },
  { id: 2, title: 'English Grammar Guide', type: 'article', subject: 'English', status: 'published', views: 8400 },
  { id: 3, title: 'Biology: Cell Structure', type: 'video', subject: 'Biology', status: 'draft', views: 0 },
  { id: 4, title: 'Chemistry Formulas', type: 'reference', subject: 'Chemistry', status: 'published', views: 6200 },
  { id: 5, title: 'Physics Problem Set', type: 'quiz', subject: 'Physics', status: 'published', views: 9800 },
  { id: 6, title: 'Economics Basics', type: 'course', subject: 'Economics', status: 'review', views: 0 },
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'course': return BookOpen;
    case 'article': return FileText;
    case 'video': return Video;
    case 'quiz': return HelpCircle;
    case 'reference': return ImageIcon;
    default: return FileText;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'published': return 'bg-success/10 text-success border-success/20';
    case 'draft': return 'bg-muted text-muted-foreground';
    case 'review': return 'bg-warning/10 text-warning border-warning/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

export function ContentManagement() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Content Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage courses, quizzes, and learning materials.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Content
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'Total Content', value: '156', icon: FileText },
          { label: 'Published', value: '128', icon: BookOpen, color: 'text-success' },
          { label: 'In Review', value: '18', icon: Eye, color: 'text-warning' },
          { label: 'Drafts', value: '10', icon: Edit, color: 'text-muted-foreground' },
        ].map((stat) => (
          <div key={stat.label} className="card-surface p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10">
                <stat.icon className={`w-5 h-5 ${stat.color || 'text-primary'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap items-center gap-4"
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            className="pl-10 bg-white/5 border-white/[0.07]"
          />
        </div>
        <Button variant="outline" className="gap-2 bg-white/5 border-white/[0.07]">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </motion.div>

      {/* Content Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card-surface overflow-hidden"
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/5">
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Content</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Type</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Subject</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Views</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contentItems.map((item, index) => {
              const TypeIcon = getTypeIcon(item.type);
              return (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className="border-b border-white/[0.05] hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/10">
                        <TypeIcon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-white">{item.title}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-muted-foreground capitalize">{item.type}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-white">{item.subject}</span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-white">
                      {item.views > 0 ? item.views.toLocaleString() : '--'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Trash2 className="w-4 h-4 text-danger" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
