import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TestTube,
  FileText,
  Settings,
  Home,
  Menu,
  X,
  Activity,
} from 'lucide-react';
import { useDashboardStore } from '../store';
import { useSocket } from '../providers/SocketProvider';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Test Runs', href: '/test-runs', icon: BarChart3 },
  { name: 'Test Results', href: '/test-results', icon: TestTube },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { realTimeEnabled } = useDashboardStore();
  const { isConnected } = useSocket();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          x: isOpen ? 0 : '-100%',
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-card border-r border-border
          lg:relative lg:translate-x-0 lg:opacity-100
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">Aurora</span>
            </div>
            
            <button
              onClick={onToggle}
              className="p-1 rounded-md hover:bg-accent lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Real-time status */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  realTimeEnabled && isConnected
                    ? 'bg-green-500 animate-pulse-success'
                    : realTimeEnabled
                    ? 'bg-yellow-500'
                    : 'bg-gray-400'
                }`}
              />
              <span className="text-sm text-muted-foreground">
                {realTimeEnabled && isConnected
                  ? 'Real-time: Connected'
                  : realTimeEnabled
                  ? 'Real-time: Connecting...'
                  : 'Real-time: Disabled'}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      }`
                    }
                    onClick={() => {
                      // Close sidebar on mobile when navigating
                      if (window.innerWidth < 1024) {
                        onToggle();
                      }
                    }}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              Aurora Reporter v1.0.0
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};