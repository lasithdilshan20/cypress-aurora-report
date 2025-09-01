import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  hover = false 
}) => {
  return (
    <div
      className={clsx(
        'bg-card border border-border rounded-lg shadow-sm',
        hover && 'hover:shadow-md transition-shadow',
        className
      )}
    >
      {children}
    </div>
  );
};