import React from 'react';
import styled from 'styled-components';

interface StyledButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  loading?: boolean;
}

const StyledButton: React.FC<StyledButtonProps> = ({ children, loading, ...props }) => {
  return (
    <StyledWrapper>
      <button className="button" {...props} disabled={props.disabled || loading}>
        <span className="label">{children}</span>
        <span className="gradient-container">
          <span className="gradient" />
        </span>
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .button {
    border: none;
    outline: none;
    background-color: #3a3a3a;
    width: 100%; /* Button fills its container */
    height: 48px; /* Reduced height */
    font-size: 18px;
    color: #fff;
    font-weight: 600;
    border-radius: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    position: relative;
    transition: all 0.3s;
  }

  .button:disabled {
    cursor: not-allowed;
    background-color: #555;
    color: #999;
  }

  .button:disabled .gradient-container {
    display: none;
  }

  .button::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
    width: 106%;
    height: 120%;
    z-index: -1;
    border-radius: inherit;
    transition: all 0.3s;
  }

  .gradient-container {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 106%;
    height: 115%;
    overflow: hidden;
    border-radius: inherit;
    z-index: -2;
    filter: blur(10px);
    transition: all 0.3s;
  }

  .gradient {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 110%;
    aspect-ratio: 1;
    border-radius: 100%; /* Circular gradient */
    transition: all 0.3s;
    background-image: linear-gradient(
      90deg,
      hsl(226, 81%, 64%),
      hsl(271, 81%, 64%),
      hsl(316, 81%, 64%),
      hsl(1, 81%, 64%),
      hsl(46, 81%, 64%),
      hsl(91, 81%, 64%),
      hsl(136, 81%, 64%),
      hsl(181, 81%, 64%)
    );
    animation: none; /* No animation by default */
    filter: blur(8px); /* Initial blur for the gradient */
  }

  .label {
    width: calc(100% - 2rem); /* Adjust width to account for padding/gap */
    height: 38px; /* Adjusted to fit inside 48px button with some padding */
    text-align: center; /* Center text */
    line-height: 38px; /* Vertically center text */
    border-radius: 8px;
    background-color: rgba(43, 43, 43, 1);
    background-image: linear-gradient(
      180deg,
      rgb(43, 43, 43) 0%,
      rgb(68, 68, 68) 100%
    );
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .button:hover .gradient-container {
    transform: translate(-50%, -50%) scale(0.98); /* Slight scale on hover */
    filter: blur(5px); /* Less blur on hover */
  }

  .button:hover .gradient { /* Apply animation to the gradient on hover */
    animation: rotate 2s linear infinite;
    filter: blur(5px); /* Less blur on hover */
  }

  @keyframes rotate {
    0% {
      transform: translate(-50%, -50%) rotate(0deg);
    }
    100% {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  }`;

export default StyledButton;
