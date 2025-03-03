import React from 'react';

type DetailRowProps = {
  label: string;
  value: React.ReactNode;
  className?: string;
};

export function DetailRow({ label, value, className = '' }: DetailRowProps) {
  return (
    <div className={`py-3 ${className}`}>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );
}