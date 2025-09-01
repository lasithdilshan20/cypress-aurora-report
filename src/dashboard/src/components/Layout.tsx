import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useDashboardStore } from '../store';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { sidebarOpen, setSidebarOpen } = useDashboardStore();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};