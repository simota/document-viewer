import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  globalSetup: './tests/setup.ts',
  use: {
    baseURL: 'http://localhost:4001',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node server.mjs /tmp/md-test-docs --port 4001',
    cwd: __dirname,
    url: 'http://localhost:4001',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
