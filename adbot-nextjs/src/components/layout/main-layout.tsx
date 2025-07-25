import { Sidebar } from './sidebar';
import { UserInfoComponent } from '@/components/auth/user-info';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main content */}
        <div className="flex-1 lg:ml-0">
          {/* Header */}
          <header className="bg-white shadow-sm border-b">
            <div className="px-6 py-4 flex justify-between items-center">
              <h1 className="text-2xl font-semibold text-gray-900">AD Bot Management</h1>
              <UserInfoComponent />
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