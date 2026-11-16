import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API runs on :8080; requests to /api are proxied so cookies stay same-origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: process.env.VITE_API_PROXY || 'http://localhost:8080', changeOrigin: true } },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          livekit: ['livekit-client', '@livekit/components-react'],
        },
      },
    },
  },
});
