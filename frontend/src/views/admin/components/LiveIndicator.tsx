import React from 'react';

interface LiveIndicatorProps {
  connected: boolean;
}

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({ connected }) => {
  return (
    <div className="relative flex h-3 w-3">
      {connected && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
      )}
      <span className={`relative inline-flex rounded-full h-3 w-3 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
    </div>
  );
};

export default LiveIndicator;
