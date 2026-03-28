import React from 'react';

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'error' | 'warning' | 'pending' | 'success';
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'md' }) => {
  const baseStyles = 'inline-flex items-center gap-2 rounded-full font-medium';

  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }[size];

  const statusStyles = {
    active: 'bg-green-900/30 text-green-300 border border-green-800/50',
    inactive: 'bg-slate-700/30 text-slate-300 border border-slate-700/50',
    error: 'bg-red-900/30 text-red-300 border border-red-800/50',
    warning: 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50',
    pending: 'bg-blue-900/30 text-blue-300 border border-blue-800/50',
    success: 'bg-green-900/30 text-green-300 border border-green-800/50',
  }[status];

  const dotColor = {
    active: 'bg-green-400',
    inactive: 'bg-slate-400',
    error: 'bg-red-400',
    warning: 'bg-yellow-400',
    pending: 'bg-blue-400',
    success: 'bg-green-400',
  }[status];

  return (
    <span className={`${baseStyles} ${sizeStyles} ${statusStyles}`}>
      <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
      {label}
    </span>
  );
};

export default StatusBadge;
