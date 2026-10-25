import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { Toaster } from '@/components/ui/sonner';
import { ReminderWatcher } from '@/features/reminders/components/reminder-watcher';

export function AppLayout() {
  return (
    <div className="vt-app-shell flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="vt-app-main flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden relative">
        <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      <ReminderWatcher />

      {/* Toast Notification Container */}
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
