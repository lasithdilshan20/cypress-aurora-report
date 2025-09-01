import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter,
  Download,
  Search,
  Calendar,
} from 'lucide-react';
import { useDashboardStore } from '../store';
import { apiClient } from '../services/api';
import { TestRun } from '../types';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const TestRuns: React.FC = () => {
  const { 
    testRuns, 
    setTestRuns, 
    testRunsLoading, 
    setTestRunsLoading,
    searchQuery,
  } = useDashboardStore();

  const [filteredRuns, setFilteredRuns] = useState<TestRun[]>([]);

  useEffect(() => {
    loadTestRuns();
  }, []);

  useEffect(() => {
    // Filter runs based on search query
    if (searchQuery.trim()) {
      const filtered = testRuns.filter(run => 
        run.browserName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        run.specFiles.some((spec: string) => spec.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredRuns(filtered);
    } else {
      setFilteredRuns(testRuns);
    }
  }, [testRuns, searchQuery]);

  const loadTestRuns = async () => {
    try {
      setTestRunsLoading(true);
      const response = await apiClient.getTestRuns({ limit: 50 });
      
      if (response.success) {
        setTestRuns(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load test runs:', error);
    } finally {
      setTestRunsLoading(false);
    }
  };

  const getStatusIcon = (run: TestRun) => {
    switch (run.status) {
      case 'completed':
        return run.failed > 0 ? 
          <XCircle className="w-5 h-5 text-red-500" /> : 
          <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'running':
        return <Play className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (run: TestRun) => {
    switch (run.status) {
      case 'completed':
        return run.failed > 0 ? 'Failed' : 'Passed';
      case 'running':
        return 'Running';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  if (testRunsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading test runs..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Test Runs</h1>
          <p className="text-muted-foreground">
            View and manage your test execution history
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            className="flex items-center px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
          
          <button
            className="flex items-center px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          
          <button
            onClick={loadTestRuns}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Play className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Runs</p>
              <p className="text-2xl font-bold">{testRuns.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Successful</p>
              <p className="text-2xl font-bold">
                {testRuns.filter(run => run.status === 'completed' && run.failed === 0).length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold">
                {testRuns.filter(run => run.status === 'failed' || run.failed > 0).length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Avg Duration</p>
              <p className="text-2xl font-bold">
                {testRuns.length > 0 
                  ? formatDuration(testRuns.reduce((acc, run) => acc + (run.duration || 0), 0) / testRuns.length)
                  : '0s'
                }
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Test Runs List */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Test Runs</h3>
          
          {filteredRuns.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No test runs found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try adjusting your search query' : 'No test runs have been executed yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRuns.map((run, index) => (
                <motion.div
                  key={run.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={`/test-runs/${run.id}`}
                    className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(run)}
                        
                        <div>
                          <h4 className="font-medium">
                            {run.browserName} {run.browserVersion}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {run.specFiles.length} spec files • {run.totalTests} tests
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>{run.passed}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span>{run.failed}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{run.duration ? formatDuration(run.duration) : 'N/A'}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{new Date(run.startTime).toLocaleDateString()}</span>
                        </div>
                        
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          getStatusText(run) === 'Passed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : getStatusText(run) === 'Failed'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        }`}>
                          {getStatusText(run)}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};