import React from 'react';

interface EmailFieldProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  error?: string;
  autoComplete?: string;
}

const EmailField: React.FC<EmailFieldProps> = ({
  id,
  name,
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder = "Enter your email",
  required = true,
  error,
  autoComplete = "email"
}) => {
  const baseClasses = "mt-1 block h-9 sm:h-10 w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed";
  const errorClasses = error ? "border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500" : "";

  return (
    <div>
      <label htmlFor={id} className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
        Email address
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type="email"
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        className={`${baseClasses} ${errorClasses}`}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};

export default EmailField;