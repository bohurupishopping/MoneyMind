import React from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

type EmptyStateProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  actionLabel?: string;
  actionLink?: string;
  onActionClick?: () => void;
};

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  actionLink,
  onActionClick
}: EmptyStateProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-8 text-center">
      <div className="mx-auto w-16 h-16 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-full mb-4">
        {icon}
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {description}
      </p>
      
      {(actionLabel && actionLink) || onActionClick ? (
        actionLink ? (
          <Link
            to={actionLink}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            {actionLabel}
          </Link>
        ) : (
          <button
            onClick={onActionClick}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            {actionLabel}
          </button>
        )
      ) : null}
    </div>
  );
}