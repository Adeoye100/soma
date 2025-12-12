import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import { useNavigate } from 'react-router-dom';

const gradientAnimation = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const AnimatedGradientText = styled.span`
  background: linear-gradient(to right, #8b5cf6, #fdba74, #8b5cf6);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ${gradientAnimation} 3s linear infinite;
`;

const LandingPage: React.FC = () => {
  const [navigatingTo, setNavigatingTo] = useState<'login' | 'signup' | null>(null);
  const navigate = useNavigate();

  const handleLoginRedirect = () => {
    setNavigatingTo('login');
    setTimeout(() => navigate('/login'), 500);
  };

  const handleSignUpRedirect = () => {
    setNavigatingTo('signup');
    setTimeout(() => navigate('/login', { state: { showSignup: true } }), 500);
  };

  return (
    <PageWrapper>
      <ShaderGradientCanvas style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh' }}>
        <ShaderGradient
          cAzimuthAngle={180}
          cDistance={3.6}
          cPolarAngle={80}
          cameraZoom={9.1}
          color1="#fdba74"
          color2="#8d7dca"
        //   color3="#fa60d9"
          lightType="3d"
          reflection={0.1}
          rotationX={50}
          rotationZ={-60}
          type="waterPlane"
          uDensity={1.5}
          uSpeed={0.2}
          uStrength={1.5}
          wireframe={false}
        />
      </ShaderGradientCanvas>
      <ContentWrapper>
        <Title>
          Welcome to <AnimatedGradientText>Soma™</AnimatedGradientText>.
        </Title>
        <Subtitle>The future of online assessments. Streamlined, secure, and intelligent.</Subtitle>
        <ButtonContainer>
          <LoginButton onClick={handleLoginRedirect} disabled={!!navigatingTo}>
            {navigatingTo === 'login' ? 'Loading...' : 'Proceed to Login'}
                  </LoginButton>

          <SignUpButton onClick={handleSignUpRedirect} disabled={!!navigatingTo}>
            {navigatingTo === 'signup' ? 'Loading...' : 'Sign Up'}
          </SignUpButton>
        </ButtonContainer>
      </ContentWrapper>
    </PageWrapper>
  );
};

const PageWrapper = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  text-align: center;
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  background: rgba(0, 0, 0, 0.2);
  padding: 40px;
  border-radius: 15px;
  backdrop-filter: blur(5px);
  animation: ${fadeIn} 1s ease-in-out;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 15px;
`;

const Title = styled.h1`
  font-size: 3rem;
`;

const Subtitle = styled.p`
  font-size: 1.25rem;
  max-width: 500px;
`;

const LoginButton = styled.button`
  padding: 12px 24px;
  font-size: 1rem;
  border-radius: 8px;
  border: none;
  background-color: #f0f0f0;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: #ddd;
    transform: scale(1.05);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const SignUpButton = styled(LoginButton)`
  background-color: transparent;
  border: 1px solid #f0f0f0;
  color: #f0f0f0;

  &:hover:not(:disabled) {
    background-color: rgba(240, 240, 240, 0.1);
    border-color: #ddd;
    transform: scale(1.05);
  }
`;

export default LandingPage;
