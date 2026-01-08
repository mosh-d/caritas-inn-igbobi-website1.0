import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss()
  ],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
   server: {
    proxy: {
      '/api': {
        target: 'https://five-clover-shared-backend.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path, // Keep the /api prefix in the URL
        secure: false
      }
    }
  }
}); 
