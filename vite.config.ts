import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 3000,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/mermaid/') || id.includes('node_modules/@mermaid-js/')) {
            return 'mermaid';
          }
          if (id.includes('node_modules/highlight.js/')) {
            return 'hljs';
          }
          if (id.includes('node_modules/katex/')) {
            return 'katex';
          }
        },
      },
    },
  },
});
