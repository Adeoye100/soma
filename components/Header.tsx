import React from 'react';
import { User } from 'firebase/auth';
import { BookOpenIcon, UserCircleIcon, LogoutIcon } from './icons';
import Switch from './Switch';

interface HeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  user: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, user, onLogout }) => {
  return (
    <header className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10 shadow-md shadow-slate-200/10 dark:shadow-slate-800/10">
      <div className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <BookOpenIcon className="h-8 w-8 text-primary-500 animated-book" />
          <h1 className="text-xl md:text-2xl font-bold animated-gradient-text">
            Soma
          </h1>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
                <UserCircleIcon className="h-6 w-6 text-slate-500" />
                <span className="hidden sm:inline font-medium text-slate-700 dark:text-slate-300">
                    {user.displayName || user.email}
                </span>
            </div>
          {/* Theme Toggle Switch */}
          <Switch isChecked={theme === 'dark'} onToggle={toggleTheme} />
           <button
            onClick={onLogout}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Logout"
          >
            <LogoutIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
