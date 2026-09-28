import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data available',
  message = 'There are currently no records in the database.',
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-stone-300 bg-stone-50/50 my-4">
      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 mb-3">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h4 className="text-base font-medium text-stone-800">{title}</h4>
      <p className="text-sm text-stone-500 max-w-md mt-1 mb-4">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
