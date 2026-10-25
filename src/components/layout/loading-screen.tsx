import { BrandMark } from './brand-mark';

export function LoadingScreen({ message = 'Đang tải VanTien Study...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-foreground">
      <div className="relative flex flex-col items-center space-y-4">
        {/* Glowing Logo Icon */}
        <div className="relative">
          <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-primary to-accent opacity-25 blur-lg" />
          <BrandMark className="vt-logo relative h-16 w-16" />
        </div>

        {/* Text */}
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight text-gradient">
            VANTIEN STUDY
          </h1>
          <p className="mt-1 text-sm text-muted-foreground animate-pulse">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
