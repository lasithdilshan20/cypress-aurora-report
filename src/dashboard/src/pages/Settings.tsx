import React from 'react';
import { useTheme } from '../providers/ThemeProvider';
import { useDashboardStore } from '../store';
import { Card } from '../components/ui/Card';

export const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { realTimeEnabled, setRealTimeEnabled } = useDashboardStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your Aurora Reporter dashboard preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance Settings */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Appearance</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Theme
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Real-time Settings */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Real-time Updates</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">
                  Enable Real-time Updates
                </label>
                <p className="text-sm text-muted-foreground">
                  Receive live updates when tests are running
                </p>
              </div>
              <button
                onClick={() => setRealTimeEnabled(!realTimeEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  realTimeEnabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    realTimeEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};