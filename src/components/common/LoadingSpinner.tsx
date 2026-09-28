import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  className = 'py-12',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-stone-500 ${className}`}>
      <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-2" />
      <span className="text-xs uppercase tracking-widest font-medium">{message}</span>
    </div>
  );
};
