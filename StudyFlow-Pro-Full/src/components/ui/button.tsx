import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?:
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'ghost'
    | 'link'
    | 'accent'
    | 'glow';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    const variantClasses = {
      default:
        'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20',
      secondary:
        'bg-surface-elevated text-foreground hover:bg-muted border border-border/60',
      destructive:
        'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm shadow-destructive/20',
      outline:
        'border border-border bg-transparent hover:bg-muted hover:text-foreground text-foreground',
      ghost:
        'hover:bg-muted/70 hover:text-foreground text-muted-foreground',
      link: 'text-primary underline-offset-4 hover:underline p-0 h-auto',
      accent:
        'bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm shadow-accent/20 font-semibold',
      glow: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/40 ring-1 ring-primary/50',
    }[variant];

    const sizeClasses = {
      default: 'h-10 px-4 py-2 text-sm',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-12 rounded-lg px-6 text-base font-medium',
      icon: 'h-10 w-10 p-0 flex items-center justify-center',
    }[size];

    return (
      <Comp
        className={cn(
          'vt-button inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:scale-[0.98]',
          variantClasses,
          sizeClasses,
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" />}
        {children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button };
