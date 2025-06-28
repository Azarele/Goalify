import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  icon,
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  const baseClasses = 'block px-3 py-2 border rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 transition-colors';
  const errorClasses = error ? 'border-red-500/50 bg-red-500/5' : 'border-purple-500/30 bg-slate-700/50';
  const widthClass = fullWidth ? 'w-full' : '';
  const iconPadding = icon ? 'pl-10' : '';
  
  const inputClasses = `
    ${baseClasses}
    ${errorClasses}
    ${widthClass}
    ${iconPadding}
    ${className}
  `.trim();

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-purple-200 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400">
            {icon}
          </div>
        )}
        
        <input
          ref={ref}
          className={inputClasses}
          {...props}
        />
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-purple-400">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';