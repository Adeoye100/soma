import React, { useState, useEffect } from 'react';
import { ThrottlingStatus, ThrottledButton, ThrottlingBanner, ThrottlingProgress } from './components/ui';

const RequestComponent = () => {
  const [isThrottled, setIsThrottled] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [canMakeRequest, setCanMakeRequest] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);

  const handleRequest = async () => {
    setIsLoading(true);
    // Your request logic here
    // On throttle response:
    setIsThrottled(true);
    setRemainingTime(30000); // 30 seconds
    setCanMakeRequest(false);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isThrottled) {
      const interval = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1000) {
            setIsThrottled(false);
            setCanMakeRequest(true);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isThrottled]);

  return (
    <div>
      <ThrottlingStatus
        isThrottled={isThrottled}
        remainingTime={remainingTime}
        canMakeRequest={canMakeRequest}
        reason="rate_limit_exceeded"
        variant="detailed" // 'compact', 'detailed', or 'minimal'
        onDismiss={() => setBannerVisible(false)}
      />
      
      <ThrottledButton
        onClick={handleRequest}
        isThrottled={isThrottled}
        remainingTime={remainingTime}
        loading={isLoading}
        variant="primary"
      >
        Make Request
      </ThrottledButton>

      <ThrottlingBanner
        isVisible={bannerVisible}
        isThrottled={isThrottled}
        remainingTime={remainingTime}
        reason="rate_limit_exceeded"
        onDismiss={() => setBannerVisible(false)}
      />

      <ThrottlingProgress
        remainingTime={remainingTime}
        totalTime={30000}
        isActive={isThrottled}
        size="md" // 'sm', 'md', 'lg'
        showTime={true}
      />
    </div>
  );
};

export default RequestComponent;
