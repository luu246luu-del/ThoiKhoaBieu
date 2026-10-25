import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="font-mono text-7xl font-extrabold text-primary">404</div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Trang không tồn tại
      </h1>
      <p className="text-sm text-muted-foreground max-w-md">
        Đường dẫn bạn đang truy cập không tồn tại hoặc đã được di chuyển trong hệ thống VanTien Study.
      </p>

      <div className="flex items-center gap-3 pt-4">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
        <Button onClick={() => navigate('/')}>
          <Home className="mr-2 h-4 w-4" />
          Về Trang chủ
        </Button>
      </div>
    </div>
  );
}
