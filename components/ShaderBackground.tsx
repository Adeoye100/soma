import React from 'react';

interface ShaderBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

const ShaderBackground: React.FC<ShaderBackgroundProps> = ({ children, className = '' }) => {
  return (
    <div className={`shader-gradient-background rounded-2xl shadow-lg p-px ${className}`}>
      <div className="bg-white dark:bg-slate-800 rounded-[15px] h-full w-full">
        {children}
      </div>
    </div>
  );
};

export default ShaderBackground;
