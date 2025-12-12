import React from 'react';
import styled from 'styled-components';
import { GithubIcon, LinkedinIcon, MailIcon } from './icons';
import GlassCard from './GlassCard';

const ProfileCard = () => {
  return (
    <StyledWrapper>
      <GlassCard className="card">
        <div className="profile-section">
          <div>Developed By</div>
          <img src="/img/devpic.jpeg" alt="Adeoye Opeyemi" className="profile-picture" />
          <div className="name">Adeoye Opeyemi</div>
        </div>
        <ul>
          <li className="iso-pro">
            <span />
            <span />
            <span />
            <a href="https://github.com/adeoye100" target="_blank" rel="noopener noreferrer">
              <GithubIcon className="svg" />
            </a>
            <div className="text">GitHub</div>
          </li>
          <li className="iso-pro">
            <span />
            <span />
            <span />
            <a href="https://www.linkedin.com/in/adeoye-opeyemi-99019b251/" target="_blank" rel="noopener noreferrer">
              <LinkedinIcon className="svg" />
            </a>
            <div className="text">LinkedIn</div>
          </li>
          <li className="iso-pro">
            <span />
            <span />
            <span />
            <a href="mailto:adeoyeopeyemi951@gmail.com">
              <MailIcon className="svg" />
            </a>
            <div className="text">Email</div>
          </li>
        </ul>
      </GlassCard>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .card {
    max-width: fit-content;
    border-radius: 15px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 1.5rem;
    backdrop-filter: blur(15px);
    background: rgba(255, 255, 255, 0.05);
    box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.1),
      inset 0 0 5px rgba(255, 255, 255, 0.2), 0 5px 5px rgba(0, 0, 0, 0.1);
    transition: 0.5s;
  }

  .dark & .card {
    background: rgba(30, 41, 59, 0.2);
  }

  .profile-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .profile-picture {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: 3px solid rgba(255, 174, 0, 0.7);
    object-fit: cover;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }

  /* Responsive sizes: larger avatar on wider screens */
  @media (min-width: 768px) {
    .profile-picture {
      width: 120px;
      height: 120px;
    }
  }

  @media (min-width: 1024px) {
    .profile-picture {
      width: 140px;
      height: 140px;
    }
  }

  .name {
    margin-top: 0.5rem;
    font-weight: bold;
    font-size: 1rem;
    color: #333;
  }

  .dark & .name {
    color: #eee;
  }

  .card ul {
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    list-style: none;
    gap: 1rem;
    align-items: center;
    justify-content: center;
  }

  .card ul li {
    cursor: pointer;
    position: relative;
    flex-shrink: 0;
  }

  .svg {
    transition: all 0.3s;
    padding: 0.6rem;
    height: 40px;
    width: 40px;
    border-radius: 50%;
    color: rgb(255, 174, 0);
    fill: currentColor;
    box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.2),
      inset 0 0 3px rgba(255, 255, 255, 0.4), 0 3px 3px rgba(0, 0, 0, 0.1);
  }

  .text {
    opacity: 0;
    border-radius: 5px;
    padding: 5px 10px;
    transition: all 0.3s;
    color: rgb(255, 174, 0);
    background-color: rgba(0, 0, 0, 0.2);
    position: absolute;
    white-space: nowrap;
    bottom: -30px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    font-size: 12px;
  }

  .iso-pro {
    transition: 0.5s;
  }
  .iso-pro:hover a > .svg {
    transform: translate(10px, -10px);
  }

  .iso-pro:hover .text {
    opacity: 1;
    transform: translate(-50%, 5px);
  }

  .iso-pro span {
    opacity: 0;
    position: absolute;
    background: linear-gradient(to right,
      #8b5cf6, /* purple-500 */
      #fdba74ff  /* orange-300 */
    );
    border-radius: 50%;
    transition: all 0.3s;
    height: 40px;
    width: 40px;
    z-index: -1;
  }

  .iso-pro:hover span {
    opacity: 1;
  }

  .iso-pro:hover span:nth-child(1) { opacity: 0.2; }
  .iso-pro:hover span:nth-child(2) { opacity: 0.4; transform: translate(5px, -5px); }
  .iso-pro:hover span:nth-child(3) { opacity: 0.6; transform: translate(10px, -10px); }
`;

export default ProfileCard;
