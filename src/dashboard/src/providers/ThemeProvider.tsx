import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useDashboardStore } from '../store';
import { Theme } from '../types';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { theme, setTheme } = useDashboardStore();

  const isDark = React.useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    
    // Auto mode - check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (theme !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      // Force re-render to update isDark
      setTheme(Theme.AUTO);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};