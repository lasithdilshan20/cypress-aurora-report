import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './providers/ThemeProvider';
import { SocketProvider } from './providers/SocketProvider';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { TestRuns } from './pages/TestRuns';
import { TestRunDetail } from './pages/TestRunDetail';
import { TestResults } from './pages/TestResults';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';

function App() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/test-runs" element={<TestRuns />} />
            <Route path="/test-runs/:id" element={<TestRunDetail />} />
            <Route path="/test-results" element={<TestResults />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;