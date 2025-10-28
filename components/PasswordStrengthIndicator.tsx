import React from 'react';
import { CheckCircleIcon, XCircleIcon } from './icons';

export interface PasswordValidationState {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  specialChar: boolean;
}

interface PasswordStrengthIndicatorProps {
  validation: PasswordValidationState;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ validation }) => {
  const criteria = [
    { text: 'At least 8 characters', met: validation.length },
    { text: 'An uppercase letter', met: validation.uppercase },
    { text: 'A lowercase letter', met: validation.lowercase },
    { text: 'A number', met: validation.number },
    { text: 'A special character', met: validation.specialChar },
  ];

  return (
    <div className="mt-4 space-y-1 animate-fade-in">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Password requirements:</p>
      <ul className="space-y-1 text-sm">
        {criteria.map((criterion, index) => (
          <li
            key={index}
            className={`flex items-center transition-colors duration-300 ${
              criterion.met ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {criterion.met ? (
              <CheckCircleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            ) : (
              <XCircleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            )}
            <span>{criterion.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordStrengthIndicator;
