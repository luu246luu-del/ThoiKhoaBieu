import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  Calendar,
  Timer,
  CheckSquare,
  Menu,
  LayoutDashboard,
  Inbox,
  BarChart3,
  Map,
  Target,
  BookOpen,
  Settings,
  LogOut,
  Sun,
  Moon,
  ShieldCheck,
  MessageSquareText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOwnerAccess } from '@/features/admin/hooks/use-owner-access';
import { useAuthStore, useThemeStore } from '@/stores';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export function BottomNav() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { user, profile, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();
  const canAdmin = useOwnerAccess();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const displayName = profile?.displayName || user?.displayName || profile?.username || 'Học viên';
  const username = profile?.username || 'user';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleNavigate = (path: string) => {
    setSheetOpen(false);
    navigate(path);
  };

  return (
    <>
      <nav className="vt-mobile-nav fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border/80 bg-surface/95 backdrop-blur-md pb-safe">
        <div className="flex h-16 items-center justify-around px-2">
          {/* Hôm nay */}
          <NavLink
            to="/today"
            className={({ isActive }) =>
              cn(
                'vt-mobile-link flex flex-col items-center justify-center w-14 h-full text-[10px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <CalendarCheck className={cn('h-5 w-5 mb-1', isActive && 'text-primary stroke-[2.5]')} />
                <span>Hôm nay</span>
              </>
            )}
          </NavLink>

          {/* Lịch */}
          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              cn(
                'vt-mobile-link flex flex-col items-center justify-center w-14 h-full text-[10px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Calendar className={cn('h-5 w-5 mb-1', isActive && 'text-primary stroke-[2.5]')} />
                <span>Lịch</span>
              </>
            )}
          </NavLink>

          {/* Center Focus Action Button */}
          <div className="relative -top-3 flex items-center justify-center">
            <NavLink
              to="/focus"
              className={({ isActive }) =>
                cn(
                  'flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-accent shadow-lg shadow-primary/30 transition-transform active:scale-95',
                  isActive && 'ring-4 ring-primary/30 scale-105'
                )
              }
            >
              <Timer className="h-6 w-6 text-white stroke-[2.2]" />
            </NavLink>
          </div>

          {/* Công việc */}
          <NavLink
            to="/tasks"
            className={({ isActive }) =>
              cn(
                'vt-mobile-link flex flex-col items-center justify-center w-14 h-full text-[10px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <CheckSquare className={cn('h-5 w-5 mb-1', isActive && 'text-primary stroke-[2.5]')} />
                <span>Nhiệm vụ</span>
              </>
            )}
          </NavLink>

          {/* More Menu */}
          <button
            onClick={() => setSheetOpen(true)}
            className="flex flex-col items-center justify-center w-14 h-full text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="h-5 w-5 mb-1" />
            <span>Thêm</span>
          </button>
        </div>
      </nav>

      {/* More Bottom Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto px-4 pb-8">
          <SheetHeader className="text-left pb-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-11 w-11 ring-2 ring-primary/30">
                <AvatarImage src={profile?.avatarUrl || user?.photoURL || undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-base font-bold text-foreground">
                  {displayName}
                </SheetTitle>
                <p className="text-xs text-muted-foreground">@{username}</p>
              </div>
            </div>
          </SheetHeader>

          <div className="grid grid-cols-2 gap-2 py-3">
            <button
              onClick={() => handleNavigate('/')}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border/60 text-sm font-medium hover:bg-surface-elevated text-left"
            >
              <LayoutDashboard className="h-4 w-4 text-primary" />
              <span>Tổng quan</span>
            </button>
            <button
              onClick={() => handleNavigate('/backlog')}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border/60 text-sm font-medium hover:bg-surface-elevated text-left"
            >
              <Inbox className="h-4 w-4 text-warning" />
              <span>Tồn đọng</span>
            </button>
            <button
              onClick={() => handleNavigate('/analytics')}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border/60 text-sm font-medium hover:bg-surface-elevated text-left"
            >
              <BarChart3 className="h-4 w-4 text-accent" />
              <span>Thống kê</span>
            </button>
            <button
              onClick={() => handleNavigate('/roadmap')}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border/60 text-sm font-medium hover:bg-surface-elevated text-left"
            >
              <Map className="h-4 w-4 text-purple-400" />
              <span>Lộ trình học</span>
            </button>
            <button
              onClick={() => handleNavigate('/habits')}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border/60 text-sm font-medium hover:bg-surface-elevated text-left"
            >
              <Target className="h-4 w-4 text-pink-400" />
              <span>Thói quen</span>
            </button>
            <button
              onClick={() => handleNavigate('/journal')}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border/60 text-sm font-medium hover:bg-surface-elevated text-left"
            >
              <BookOpen className="h-4 w-4 text-blue-400" />
              <span>Nhật ký</span>
            </button>
          </div>

          <Separator className="my-3" />

          <div className="space-y-1">
            <button onClick={() => handleNavigate('/reviews')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-surface">
              <MessageSquareText className="h-4 w-4 text-primary" /><span>Đánh giá & Góp ý công khai</span>
            </button>
            {canAdmin && <button onClick={() => handleNavigate('/admin')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:bg-surface">
              <ShieldCheck className="h-4 w-4" /><span>Quản trị website</span>
            </button>}
            <button
              onClick={() => handleNavigate('/settings')}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-surface"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span>Cài đặt & Lĩnh vực học</span>
            </button>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-surface"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 text-warning" />
                  <span>Đổi sang Chế độ sáng</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-primary" />
                  <span>Đổi sang Chế độ tối</span>
                </>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
