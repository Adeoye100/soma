import React from 'react';
import { Server, Database, Shield, Zap, Globe, Cpu } from 'lucide-react';

export const SystemInfo: React.FC = () => {
  const sections = [
    {
      title: 'Node.js Runtime',
      icon: <Cpu className="text-indigo-500" size={20} />,
      items: [
        { label: 'Version', value: 'v20.11.0' },
        { label: 'Platform', value: 'linux' },
        { label: 'Architecture', value: 'x64' },
        { label: 'Process ID', value: '1240' }
      ]
    },
    {
      title: 'Application',
      icon: <Zap className="text-amber-500" size={20} />,
      items: [
        { label: 'Environment', value: 'production' },
        { label: 'Port', value: '3000' },
        { label: 'Upload Path', value: '/uploads' },
        { label: 'Max File Size', value: '10MB' }
      ]
    },
    {
      title: 'Database',
      icon: <Database className="text-blue-500" size={20} />,
      items: [
        { label: 'Provider', value: 'Supabase' },
        { label: 'Region', value: 'eu-central-1' },
        { label: 'Tables', value: '12' },
        { label: 'Status', value: 'Connected' }
      ]
    },
    {
      title: 'Infrastructure',
      icon: <Shield className="text-green-500" size={20} />,
      items: [
        { label: 'Redis', value: 'Disabled', badge: 'Memory fallback' },
        { label: 'Gemini API', value: 'Configured', badge: 'Active' },
        { label: 'Rate Limiting', value: 'Active', badge: 'Redis+Memory' },
        { label: 'File Upload', value: 'v2.1.1', badge: 'Multer' }
      ]
    }
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Infrastructure Details</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {sections.map((section) => (
          <div key={section.title} className="bg-[#1a1d27] rounded-xl border border-[#2a2d3e] overflow-hidden">
            <div className="p-6 border-b border-[#2a2d3e] flex items-center space-x-3 bg-[#1e2235]">
              {section.icon}
              <h3 className="font-bold">{section.title}</h3>
            </div>
            <div className="p-6 space-y-4">
              {section.items.map((item) => (
                <div key={item.label} className="flex justify-between items-center py-1">
                  <span className="text-slate-400 text-sm">{item.label}</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm text-slate-200">{item.value}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-500 text-[10px] font-bold uppercase border border-[#2a2d3e]">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemInfo;
