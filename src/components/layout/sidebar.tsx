import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  Calendar,
  CheckSquare,
  Timer,
  BarChart3,
  Map,
  Target,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Inbox,
  User,
  Sun,
  Moon,
  ShieldCheck,
  MessageSquareText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOwnerAccess } from '@/features/admin/hooks/use-owner-access';
import { useAuthStore, useThemeStore } from '@/stores';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BrandMark } from './brand-mark';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

const mainNavItems: NavItem[] = [
  { title: 'Tổng quan', href: '/', icon: LayoutDashboard },
  { title: 'Hôm nay', href: '/today', icon: CalendarCheck },
  { title: 'Thời khóa biểu', href: '/calendar', icon: Calendar },
  { title: 'Công việc', href: '/tasks', icon: CheckSquare },
  { title: 'Tồn đọng', href: '/backlog', icon: Inbox },
  { title: 'Focus Studio', href: '/focus', icon: Timer },
  { title: 'Thống kê', href: '/analytics', icon: BarChart3 },
];

const secondaryNavItems: NavItem[] = [
  { title: 'Lộ trình học', href: '/roadmap', icon: Map },
  { title: 'Thói quen', href: '/habits', icon: Target },
  { title: 'Nhật ký học tập', href: '/journal', icon: BookOpen },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
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

  return (
    <aside
      className={cn(
        'vt-sidebar relative hidden lg:flex flex-col h-screen border-r border-border/70 bg-surface select-none transition-all duration-300 z-30',
        isCollapsed ? 'w-[76px]' : 'w-[260px]'
      )}
    >
      {/* Top Header / Brand */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border/50">
        <div className="vt-brand flex items-center space-x-3 overflow-hidden">
          <BrandMark className="vt-logo h-10 w-10" />
          {!isCollapsed && (
            <div className="flex flex-col animate-fade-in truncate">
              <span className="font-bold text-base tracking-tight text-gradient leading-tight">
                VANTIEN STUDY
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">
                STUDY & PRODUCTIVITY
              </span>
            </div>
          )}
        </div>

        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
          title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Core Workspace */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-3 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
              Không gian học tập
            </p>
          )}
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) =>
                  cn(
                    'vt-nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
                    isActive
                      ? 'bg-primary/15 text-primary font-semibold shadow-sm'
                      : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'h-5 w-5 shrink-0 transition-colors',
                        isActive
                          ? 'text-primary'
                          : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />
                    {!isCollapsed && (
                      <span className="truncate">{item.title}</span>
                    )}
                    {/* Active pill for collapsed state */}
                    {isCollapsed && isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Long-term Tracking */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-3 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
              Mục tiêu dài hạn
            </p>
          )}
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'vt-nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
                    isActive
                      ? 'bg-primary/15 text-primary font-semibold shadow-sm'
                      : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'h-5 w-5 shrink-0 transition-colors',
                        isActive
                          ? 'text-primary'
                          : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />
                    {!isCollapsed && (
                      <span className="truncate">{item.title}</span>
                    )}
                    {isCollapsed && isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 space-y-1 border-t border-border/40 px-3 py-2">
        <NavLink to="/reviews" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-surface-elevated hover:text-foreground">
          <MessageSquareText className="h-5 w-5 shrink-0" />{!isCollapsed && 'Đánh giá & Góp ý'}
        </NavLink>
        {canAdmin && <NavLink to="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-elevated">
          <ShieldCheck className="h-5 w-5 shrink-0" />{!isCollapsed && 'Quản trị website'}
        </NavLink>}
      </div>
      {/* Bottom Profile Section */}
      <div className="p-3 border-t border-border/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 p-2 rounded-xl hover:bg-surface-elevated transition-colors text-left focus:outline-none">
              <Avatar className="h-9 w-9 shrink-0 ring-1 ring-primary/30">
                <AvatarImage src={profile?.avatarUrl || user?.photoURL || undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 truncate">
                  <p className="text-sm font-medium text-foreground truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{username}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="w-56 mb-2"
          >
            <DropdownMenuLabel>Tài khoản cá nhân</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <User className="mr-2 h-4 w-4" />
              <span>Hồ sơ & Lĩnh vực</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Cài đặt hệ thống</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="mr-2 h-4 w-4 text-warning" />
                  <span>Chế độ sáng</span>
                </>
              ) : (
                <>
                  <Moon className="mr-2 h-4 w-4 text-primary" />
                  <span>Chế độ tối</span>
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:bg-destructive/15 focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Đăng xuất</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
