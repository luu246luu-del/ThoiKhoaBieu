import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'success'
    | 'warning'
    | 'engineer'
    | 'korean'
    | 'english'
    | 'university'
    | 'personal';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantClasses = {
    default: 'bg-primary/15 text-primary border-primary/20',
    secondary: 'bg-surface-elevated text-muted-foreground border-border',
    destructive: 'bg-destructive/15 text-destructive border-destructive/20',
    outline: 'text-foreground border-border',
    success: 'bg-success/15 text-accent border-accent/20',
    warning: 'bg-warning/15 text-warning border-warning/20',
    engineer: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    korean: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
    english: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    university: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    personal: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  }[variant];

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors select-none',
        variantClasses,
        className
      )}
      {...props}
    />
  );
}

export { Badge };
