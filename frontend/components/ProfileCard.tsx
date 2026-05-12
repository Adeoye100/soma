import React from 'react';
import { StyledWrapper } from './ProfileCard.styles';
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

export default ProfileCard;
