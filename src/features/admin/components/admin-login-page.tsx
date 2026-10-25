import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, LockKeyhole } from 'lucide-react';
import { useAuthStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Cong admin rieng. Khong co mat khau hay UID hardcode trong frontend. */
export function AdminLoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (username.trim().toLowerCase() !== 'admin') {
      setError('Cổng quản trị chỉ dành cho tài khoản admin.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await login('admin', password, false);
      setPassword('');
      navigate('/', { replace: true });
    } catch {
      setError('Không đăng nhập được. Kiểm tra email Admin đã cấu hình, mật khẩu và trạng thái Firebase Auth.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-xl space-y-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-9 w-9 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">VanTien Admin</h1>
            <p className="text-sm text-muted-foreground">Quản trị cá nhân · Firebase Spark</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Tên đăng nhập</span>
            <Input value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" required maxLength={30} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Mật khẩu</span>
            <Input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required />
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            <LockKeyhole className="mr-2 h-4 w-4" />{busy ? 'Đang đăng nhập...' : 'Đăng nhập quản trị'}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">Sau khi đăng nhập, bạn vào trang học tập. Chỉ Owner mới có mục Quản trị trong menu.</p>
        <Link className="block text-sm text-primary hover:underline" to="/login">Quay về trang đăng nhập học tập</Link>
      </section>
    </main>
  );
}
