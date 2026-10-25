import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, UserPlus, Smile, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores';
import { isFirebaseConfigured } from '@/services/firebase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RegisterPage() {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, error, clearError, loginWithDemo } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername) {
      toast.error('Vui lòng nhập tên đăng nhập');
      return;
    }
    if (cleanUsername.length < 3) {
      toast.error('Tên đăng nhập tối thiểu 3 ký tự');
      return;
    }
    if (!/^[a-z0-9_.]+$/.test(cleanUsername)) {
      toast.error('Tên đăng nhập chỉ chứa chữ cái thường, số, dấu gạch dưới (_) hoặc dấu chấm (.)');
      return;
    }
    if (!password) {
      toast.error('Vui lòng nhập mật khẩu');
      return;
    }
    if (password.length < 6) {
      toast.error('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không trùng khớp');
      return;
    }

    setLoading(true);
    try {
      await register({
        username: cleanUsername,
        password,
        displayName: displayName.trim() || cleanUsername,
      });
      toast.success('Đăng ký tài khoản thành công! Chào mừng bạn đến với VanTien Study.');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng ký thất bại';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Tạo tài khoản VanTien Study
        </h2>
        <p className="text-xs text-muted-foreground">
          Bắt đầu hệ điều hành học tập & quản lý thời gian cá nhân
        </p>
      </div>

      {!isFirebaseConfigured && (
        <div className="rounded-xl bg-warning/10 border border-warning/30 p-3.5 text-xs text-foreground/90 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-warning">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Chưa liên kết Firebase Cloud:</span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Để tạo tài khoản thật lưu trên Cloud, hãy thêm thông tin Firebase vào file <code className="text-warning font-mono">.env.local</code>. Hoặc bạn có thể truy cập ngay bằng Chế độ Demo an toàn.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              loginWithDemo();
              navigate('/', { replace: true });
            }}
            className="w-full text-xs font-semibold py-1.5 h-8 border-warning/40 text-warning hover:bg-warning/10"
          >
            Trải nghiệm ngay bằng Chế độ Demo
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/15 border border-destructive/30 p-3 text-xs text-destructive animate-fade-in">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="displayName">Họ và tên hoặc Biệt danh</Label>
          <Input
            id="displayName"
            type="text"
            placeholder="vd: Nguyễn Văn Quyền"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            startIcon={<Smile className="h-4 w-4" />}
            autoFocus
          />
        </div>

        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="username">Tên đăng nhập (Duy nhất)</Label>
          <Input
            id="username"
            type="text"
            placeholder="vd: quyenvan"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
            disabled={loading}
            startIcon={<User className="h-4 w-4" />}
            autoComplete="username"
          />
          <p className="text-[11px] text-muted-foreground">
            Dùng để đăng nhập trực tiếp (chữ cái thường, số, dấu _ hoặc .)
          </p>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Mật khẩu</Label>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Tối thiểu 6 ký tự"
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
            autoComplete="new-password"
          />
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder="Nhập lại mật khẩu"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            startIcon={<Lock className="h-4 w-4" />}
            autoComplete="new-password"
          />
        </div>

        {/* Security Notice */}
        <div className="rounded-lg bg-surface-elevated/70 p-3 border border-border/50 text-[11px] text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground/80">Bảo mật chuẩn:</p>
          <p>
            Mật khẩu được mã hóa an toàn qua Firebase Auth. Hệ thống không bao giờ lưu trữ mật khẩu thuần trên thiết bị.
          </p>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={loading}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Tạo tài khoản mới
        </Button>
      </form>

      {/* Login link */}
      <div className="text-center text-xs text-muted-foreground pt-1">
        Đã có tài khoản?{' '}
        <Link
          to="/login"
          className="text-primary hover:underline font-semibold"
        >
          Đăng nhập ngay
        </Link>
      </div>
    </div>
  );
}
