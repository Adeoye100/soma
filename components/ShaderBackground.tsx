import React from 'react';

interface ShaderBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

const ShaderBackground: React.FC<ShaderBackgroundProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white/50 dark:bg-slate-800/30 backdrop-blur-2xl rounded-2xl shadow-lg ${className}`}>
      <div className="rounded-[15px] h-full w-full">
        {children}
      </div>
    </div>
  );
};

export default ShaderBackground;
