import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  TestTube, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Calendar,
} from 'lucide-react';
import { useDashboardStore } from '../store';
import { apiClient } from '../services/api';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface DashboardStats {
  totalRuns: number;
  totalTests: number;
  passRate: number;
  averageDuration: number;
  recentRuns: number;
  flakyTests: number;
}

interface TrendData {
  date: string;
  passed: number;
  failed: number;
  total: number;
  duration: number;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6b7280'];

export const Dashboard: React.FC = () => {
  const { statistics, setStatistics } = useDashboardStore();
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [statusData, setStatusData] = useState([
    { name: 'Passed', value: 0, color: '#10b981' },
    { name: 'Failed', value: 0, color: '#ef4444' },
    { name: 'Skipped', value: 0, color: '#f59e0b' },
    { name: 'Pending', value: 0, color: '#6b7280' },
  ]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load overview statistics
      const statsResponse = await apiClient.getOverviewStatistics();
      if (statsResponse.success) {
        setStatistics(statsResponse.data);
      }

      // Load trend data
      const trendResponse = await apiClient.getTrendData(30);
      if (trendResponse.success) {
        setTrendData(trendResponse.data || []);
      }

      // Load status distribution (mock data for now)
      // In a real implementation, this would come from the API
      setStatusData([
        { name: 'Passed', value: 85, color: '#10b981' },
        { name: 'Failed', value: 10, color: '#ef4444' },
        { name: 'Skipped', value: 3, color: '#f59e0b' },
        { name: 'Pending', value: 2, color: '#6b7280' },
      ]);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: { value: number; isPositive: boolean };
    color?: string;
  }> = ({ title, value, icon, trend, color = 'primary' }) => (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <p className={`text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="inline w-4 h-4 mr-1" />
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}/10`}>
          {icon}
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your test runs and results
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <StatCard
            title="Total Test Runs"
            value={statistics.totalRuns}
            icon={<Activity className="w-6 h-6 text-blue-600" />}
            trend={{ value: 12, isPositive: true }}
            color="blue"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <StatCard
            title="Total Tests"
            value={statistics.totalTests}
            icon={<TestTube className="w-6 h-6 text-green-600" />}
            trend={{ value: 8, isPositive: true }}
            color="green"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <StatCard
            title="Pass Rate"
            value={`${Math.round(statistics.passRate)}%`}
            icon={<CheckCircle className="w-6 h-6 text-emerald-600" />}
            trend={{ value: 2.5, isPositive: true }}
            color="emerald"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <StatCard
            title="Avg Duration"
            value={`${Math.round(statistics.averageDuration / 1000)}s`}
            icon={<Clock className="w-6 h-6 text-orange-600" />}
            trend={{ value: -5, isPositive: false }}
            color="orange"
          />
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Test Results Trend (30 days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Line
                  type="monotone"
                  dataKey="passed"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Passed"
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Failed"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Status Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Test Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Test Runs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="lg:col-span-2"
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Test Runs</h3>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((_, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Chrome Test Run #{index + 1}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(Date.now() - index * 3600000).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    85/90 passed
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full p-3 text-left rounded-lg border border-border hover:bg-accent transition-colors">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span>Schedule Test Run</span>
                </div>
              </button>
              
              <button className="w-full p-3 text-left rounded-lg border border-border hover:bg-accent transition-colors">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <span>View Flaky Tests</span>
                </div>
              </button>
              
              <button className="w-full p-3 text-left rounded-lg border border-border hover:bg-accent transition-colors">
                <div className="flex items-center space-x-3">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span>Failed Tests Report</span>
                </div>
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};