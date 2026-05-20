import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: 'success' | 'warning' | 'error' | 'info' | 'default';
  className?: string;
}

const getColorClasses = (color: BadgeProps['color']) => {
  switch (color) {
    case 'success':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'error':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'info':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

export const Badge = ({ children, color = 'default', className = '' }: BadgeProps) => {
  const colorClasses = getColorClasses(color);
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses} ${className}`}
    >
      {children}
    </span>
  );
};

export type { BadgeProps }; 