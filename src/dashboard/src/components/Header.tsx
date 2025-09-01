import React from 'react';
import { Menu, Search, Bell, Moon, Sun, Monitor } from 'lucide-react';
import { useDashboardStore } from '../store';
import { useTheme } from '../providers/ThemeProvider';
import { Theme } from '../types';

export const Header: React.FC = () => {
  const {
    sidebarOpen,
    setSidebarOpen,
    searchQuery,
    setSearchQuery,
    realTimeEnabled,
    setRealTimeEnabled,
  } = useDashboardStore();
  
  const { theme, setTheme, isDark } = useTheme();

  const handleThemeChange = () => {
    const themes: Theme[] = [Theme.LIGHT, Theme.DARK, Theme.AUTO];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <header className="bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-accent lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tests, runs, errors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-64 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-2">
          {/* Real-time toggle */}
          <button
            onClick={() => setRealTimeEnabled(!realTimeEnabled)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              realTimeEnabled
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}
            title={realTimeEnabled ? 'Disable real-time updates' : 'Enable real-time updates'}
          >
            Real-time {realTimeEnabled ? 'ON' : 'OFF'}
          </button>

          {/* Theme toggle */}
          <button
            onClick={handleThemeChange}
            className="p-2 rounded-md hover:bg-accent"
            title={`Theme: ${theme} (click to change)`}
          >
            {getThemeIcon()}
          </button>

          {/* Notifications */}
          <button
            className="p-2 rounded-md hover:bg-accent relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {/* Notification badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  );
};