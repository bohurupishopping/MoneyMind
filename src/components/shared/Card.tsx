import React from 'react';

type CardProps = {
  title?: string;
  className?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function Card({ title, className = '', children, footer }: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {title && (
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-medium text-gray-800">{title}</h3>
        </div>
      )}
      
      <div className="px-6 py-4">
        {children}
      </div>
      
      {footer && (
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  );
}