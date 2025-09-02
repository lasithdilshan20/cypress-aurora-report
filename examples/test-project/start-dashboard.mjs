import { startDashboard } from 'cypress-aurora-reporter';

(async () => {
  try {
    const server = await startDashboard({
      outputDir: './aurora-reports',
      dashboardPort: 4200,
      realTimeUpdates: true,
    });

    const info = server.getInfo ? server.getInfo() : { port: 4200 };
    const port = info?.port || 4200;
    console.log(`[Aurora] Dashboard running at http://localhost:${port}`);
  } catch (err) {
    console.error('[Aurora] Failed to start dashboard:', err);
    process.exit(1);
  }
})();