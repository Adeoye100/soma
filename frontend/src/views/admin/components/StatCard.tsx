import React from 'react';
import * as LucideIcons from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, change, trend, icon, color }) => {
  const IconComponent = (LucideIcons as any)[icon] || LucideIcons.Activity;

  const getColorClasses = (c: string) => {
    switch (c) {
      case 'indigo': return 'text-indigo-500 bg-indigo-500/10';
      case 'blue': return 'text-blue-500 bg-blue-500/10';
      case 'success': return 'text-green-500 bg-green-500/10';
      case 'warning': return 'text-amber-500 bg-amber-500/10';
      case 'danger': return 'text-red-500 bg-red-500/10';
      case 'info': return 'text-blue-400 bg-blue-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  return (
    <div className="bg-[#1a1d27] rounded-xl p-6 border border-[#2a2d3e] hover:border-[#3a3d4e] transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[#94a3b8] text-sm font-medium mb-1">{label}</p>
          <p className="text-3xl font-bold text-[#f1f5f9] tracking-tight">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${getColorClasses(color)}`}>
          <IconComponent size={24} />
        </div>
      </div>
      
      {change !== undefined && (
        <div className="flex items-center mt-2">
          <span className={`flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
            trend === 'up' ? 'text-green-500 bg-green-500/10' : 
            trend === 'down' ? 'text-red-500 bg-red-500/10' : 
            'text-slate-400 bg-slate-400/10'
          }`}>
            {trend === 'up' && <LucideIcons.ArrowUpRight size={12} className="mr-1" />}
            {trend === 'down' && <LucideIcons.ArrowDownRight size={12} className="mr-1" />}
            {Math.abs(change)}%
          </span>
          <span className="text-[#475569] text-xs ml-2">vs last week</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
