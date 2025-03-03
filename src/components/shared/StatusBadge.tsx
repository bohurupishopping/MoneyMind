import React from 'react';

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'default';

const statusStyles = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  default: 'bg-gray-100 text-gray-800'
};

type StatusBadgeProps = {
  label: string;
  type?: StatusType;
  className?: string;
};

export function StatusBadge({ label, type = 'default', className = '' }: StatusBadgeProps) {
  return (
    <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${statusStyles[type]} ${className}`}>
      {label}
    </span>
  );
}