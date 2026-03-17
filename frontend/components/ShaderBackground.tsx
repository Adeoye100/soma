import React from 'react';

interface ShaderBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

const ShaderBackground: React.FC<ShaderBackgroundProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-slate-800/30 backdrop-blur-3xl rounded-2xl shadow-lg transition-colors duration-300 ${className}`}>
      <div className="rounded-[15px] h-full w-full">
        {children}
      </div>
    </div>
  );
};

export default ShaderBackground;
