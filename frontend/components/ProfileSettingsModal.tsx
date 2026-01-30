import React from 'react';
import { User } from '@supabase/supabase-js';
import { XCircleIcon } from './icons';
import AvatarUpload from './AvatarUpload';

interface ProfileSettingsModalProps {
  user: User;
  onClose: () => void;
  onAvatarUpdate: (newAvatarUrl: string) => void;
}

const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ user, onClose, onAvatarUpdate }) => {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Profile Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 md:p-8 text-slate-600 dark:text-slate-300 text-base leading-relaxed">
          <AvatarUpload user={user} onAvatarUpdate={onAvatarUpdate} onClose={onClose} />
          {/* Add other profile settings here later if needed */}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsModal;

