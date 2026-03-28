import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  change: string;
  icon?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, change, icon }) => {
  return (
    <div className="bg-slate-900 rounded-lg p-6 border border-slate-800 hover:border-slate-700 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-slate-400 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-slate-50 mt-2">{value}</p>
        </div>
        {icon && <span className="text-4xl">{icon}</span>}
      </div>
      <p className="text-slate-500 text-sm">{change}</p>
    </div>
  );
};

export default StatCard;
