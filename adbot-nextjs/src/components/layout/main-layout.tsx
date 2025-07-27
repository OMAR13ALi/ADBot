import { Sidebar } from './sidebar';
import { UserInfoComponent } from '@/components/auth/user-info';
import { ThemeToggle } from '@/components/theme-toggle';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main content */}
        <div className="flex-1 lg:ml-0">
          {/* Header */}
          <header className="bg-card shadow-sm border-b border-border">
            <div className="px-6 py-4 flex justify-between items-center">
              <h1 className="text-2xl font-semibold text-foreground">AD Bot Management</h1>
              <div className="flex items-center gap-4">
                <ThemeToggle />
                <UserInfoComponent />
              </div>
            </div>
          </header>
          
          <main className="min-h-screen">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
} 