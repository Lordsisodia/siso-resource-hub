import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from 'rollup-plugin-visualizer';

// Performance optimization configuration
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
      include: '**/*.{jsx,tsx}',
    }),
    // Bundle analysis in development
    mode === 'development' && visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // Use treemap for better visualization
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    cssCodeSplit: true,
    modulePreload: {
      polyfill: true
    },
    reportCompressedSize: true,
    // Optimize chunk size
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-toast', '@radix-ui/react-dialog', '@radix-ui/react-slot'],
          'vendor-utils': ['clsx', 'tailwind-merge', 'lucide-react'],
          'vendor-state': ['zustand', '@tanstack/react-query'],
          
          // Feature chunks
          'feature-auth': [
            '@/store/auth',
            '@/hooks/useAuthSession',
            '@/hooks/useGoogleAuth',
            '@/pages/Auth',
          ],
          'feature-education': [
            '@/pages/SisoEducation',
            '@/pages/EducatorDetail',
            '@/pages/VideoDetail',
          ],
          'feature-economy': [
            '@/pages/Economy',
            '@/pages/CryptoExchange',
            '@/pages/Crypto',
            '@/pages/Leaderboards',
          ],
          
          // UI component chunks
          'ui-core': ['@/components/ui/button', '@/components/ui/input'],
          'ui-feedback': ['@/components/ui/toast', '@/components/ui/alert'],
          'ui-layout': ['@/components/ui/waves-background'],
          'ui-data': ['@/components/ui/virtual-list', '@/components/ui/optimized-image'],
          
          // Performance monitoring
          'perf': ['@/utils/performance', '@/contexts/performance-context'],
        },
        // Chunk naming format
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name === 'index' ? 'main' : chunkInfo.name;
          return mode === 'production' 
            ? `assets/js/${name}.[hash].js`
            : `assets/js/${name}.js`;
        },
        // Asset naming format
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return 'assets/[name].[hash][extname]';
          
          const extType = assetInfo.name.split('.').pop() || '';
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `assets/img/[name].[hash][extname]`;
          }
          return `assets/${extType}/[name].[hash][extname]`;
        },
      },
    },
    // Performance optimizations
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-toast',
      '@radix-ui/react-dialog',
      '@radix-ui/react-slot',
      'clsx',
      'tailwind-merge',
      'lucide-react',
      'zustand',
      '@tanstack/react-query',
    ],
  },
  // Enable source maps in development
  sourcemap: mode === 'development',
}));