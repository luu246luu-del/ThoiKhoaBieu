import { Outlet } from 'react-router-dom';
import { BrandMark } from './brand-mark';
import { Toaster } from '@/components/ui/sonner';

export function AuthLayout() {
  return (
    <div className="vt-auth-shell relative min-h-screen w-full flex items-center justify-center bg-background px-4 py-8 overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-accent/10 blur-[100px] pointer-events-none" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-8">
          <BrandMark className="vt-logo h-16 w-16 mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-gradient">
            VANTIEN STUDY
          </h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase font-mono tracking-wider">
            Your personal study workspace
          </p>
        </div>

        {/* Outlet for Login or Register */}
        <div className="vt-auth-card rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          <Outlet />
        </div>

        {/* Footer info */}
        <p className="mt-8 text-center text-xs text-muted-foreground/60">
          Process Engineer • Semiconductor OSAT • Language Roadmap
        </p>
      </div>

      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
