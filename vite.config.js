import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: ['.js', '.jsx'],
  },
  build: {
    target: ['es2020', 'edge90', 'firefox88', 'chrome90', 'safari14'],
    minify: 'esbuild',
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split Firebase into separate chunks
          'firebase-auth': ['firebase/auth'],
          'firebase-firestore': ['firebase/firestore'],
          'firebase-functions': ['firebase/functions'],
          'firebase-app': ['firebase/app'],
          // Split vendor libraries
          'react-vendor': ['react', 'react-dom'],
          'lucide-react': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB to reduce warnings
  },
}));
