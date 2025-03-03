import React from 'react';
import { AlertCircle } from 'lucide-react';

type FormRowProps = {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
  hint?: string;
};

export function FormRow({ 
  label, 
  htmlFor, 
  error, 
  required = false, 
  className = '', 
  children,
  hint 
}: FormRowProps) {
  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      {children}
      
      {hint && !error && (
        <p className="mt-1 text-sm text-gray-500">{hint}</p>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
    </div>
  );
}