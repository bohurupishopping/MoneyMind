import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  backLink?: string;
  actionLabel?: string;
  actionLink?: string;
  actionIcon?: React.ReactNode;
  onActionClick?: () => void;
};

export function PageHeader({
  title,
  subtitle,
  backLink,
  actionLabel,
  actionLink,
  actionIcon = <Plus className="h-4 w-4 mr-1" />,
  onActionClick
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
      <div>
        <div className="flex items-center">
          {backLink && (
            <Link to={backLink} className="mr-2 text-gray-500 hover:text-gray-700">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          )}
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        </div>
        {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
      </div>
      
      {(actionLabel && actionLink) || onActionClick ? (
        <div className="mt-4 sm:mt-0">
          {actionLink ? (
            <Link
              to={actionLink}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium shadow-sm"
            >
              {actionIcon}
              {actionLabel}
            </Link>
          ) : (
            <button
              onClick={onActionClick}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium shadow-sm"
            >
              {actionIcon}
              {actionLabel}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}