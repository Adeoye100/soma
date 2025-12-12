
import React from 'react';
import { User } from '@supabase/supabase-js';
import { BookOpenIcon, LogoutIcon } from './icons';
import Switch from './Switch';
import { Avatar, AvatarImage, AvatarFallback } from './Avatar';

// Add a new prop for opening profile settings
interface HeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  user: User;
  onLogout: () => void;
  onOpenProfileSettings: () => void; // New prop
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, user, onLogout, onOpenProfileSettings }) => {
  const userName = user.user_metadata.full_name || user.email;
  const userGender = user.user_metadata.gender || 'male';
  const customAvatarUrl = user.user_metadata.avatar_url; // Check for custom avatar URL
  const avatarUrl = customAvatarUrl || `https://api.dicebear.com/8.x/${userGender === 'other' ? 'micah' : userGender}/svg?seed=${userName}`; // Prioritize custom, then generated
  const fallbackName = (userName || 'A').slice(0, 2).toUpperCase();


  return (
    <header className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10 shadow-md shadow-slate-200/10 dark:shadow-slate-800/10">
      <div className="container mx-auto px-3 sm:px-4 md:px-8 py-3 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <BookOpenIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-500 animated-book flex-shrink-0" />
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold animated-gradient-text truncate">
            Soma
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarUrl} alt={userName} />
              <AvatarFallback>{fallbackName}</AvatarFallback>
            </Avatar>
          {/* Theme Toggle Switch */}
          <Switch isChecked={theme === 'dark'} onToggle={toggleTheme} />
           <button
            onClick={onLogout}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 flex-shrink-0"
            aria-label="Logout"
            title="Logout?"
          >
            <LogoutIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
