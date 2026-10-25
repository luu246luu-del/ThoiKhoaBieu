import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, LogIn, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores';
import { isFirebaseConfigured } from '@/services/firebase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const { login, loginWithGoogle, loginWithDemo, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const requestedFrom = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
  const from = requestedFrom.startsWith('/admin') ? '/' : requestedFrom;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!username.trim()) {
      toast.error('Vui lòng nhập tên đăng nhập');
      return;
    }
    if (!password) {
      toast.error('Vui lòng nhập mật khẩu');
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password, rememberMe);
      toast.success('Đăng nhập thành công! Chào mừng trở lại.');
      navigate(username.trim().toLowerCase() === 'admin' ? '/admin' : from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập không thành công';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Đăng nhập với Google thành công!');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập Google không thành công';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    clearError();
    loginWithDemo();
    toast.success('Đang truy cập bằng Chế độ Demo an toàn (Không cần mật khẩu).');
    navigate(from, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Đăng nhập hệ thống
        </h2>
        <p className="text-xs text-muted-foreground">
          Quản lý thời gian, thời khóa biểu và lộ trình học tập cá nhân
        </p>
      </div>

      {!isFirebaseConfigured && (
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-3.5 text-xs text-foreground/90 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Thông báo môi trường phát triển:</span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Firebase Project chưa được điền trong <code className="text-primary font-mono">.env.local</code>. Để kiểm thử đầy đủ các chức năng nghiệp vụ ngay mà không cần mật khẩu, bạn có thể chọn Chế độ Demo bên dưới.
          </p>
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={handleDemoLogin}
            className="w-full text-xs font-semibold py-1.5 h-8"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Vào ngay bằng Chế độ Demo
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/15 border border-destructive/30 p-3 text-xs text-destructive animate-fade-in">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="username">Tên đăng nhập</Label>
          <Input
            id="username"
            type="text"
            placeholder="vd: quyenvan"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            startIcon={<User className="h-4 w-4" />}
            autoComplete="username"
            autoFocus
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Mật khẩu</Label>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            startIcon={<Lock className="h-4 w-4" />}
            endIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="hover:text-foreground transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
            autoComplete="current-password"
          />
        </div>

        {/* Remember me */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            />
            <Label
              htmlFor="remember"
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Ghi nhớ phiên đăng nhập trên thiết bị
            </Label>
          </div>
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={loading}
        >
          <LogIn className="mr-2 h-4 w-4" />
          Đăng nhập
        </Button>
      </form>

      {/* Google Login Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/80" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase">
          <span className="bg-surface px-3 text-muted-foreground">
            Hoặc đăng nhập bằng
          </span>
        </div>
      </div>

      {/* Google button */}
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={handleGoogleLogin}
        disabled={loading}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        Tài khoản Google
      </Button>

      <p className="text-center text-xs text-muted-foreground"><Link to="/reviews" className="text-primary hover:underline">Xem đánh giá & phản hồi công khai</Link></p>

      {/* Register link */}
      <div className="text-center text-xs text-muted-foreground pt-2">
        Chưa có tài khoản?{' '}
        <Link
          to="/register"
          className="text-primary hover:underline font-semibold"
        >
          Đăng ký tài khoản mới
        </Link>
      </div>
    </div>
  );
}
