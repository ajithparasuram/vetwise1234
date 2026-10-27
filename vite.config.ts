import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Vite mode drives the variant: `vite build --mode client` or `--mode staff`.
// Default (no mode / "production") builds all three entry points for web.
export default defineConfig(({ mode }) => {
  const variant = mode === 'client' || mode === 'staff' ? mode : 'all';

  const input =
    variant === 'client'
      ? { index: fileURLToPath(new URL('./client.html', import.meta.url)) }
      : variant === 'staff'
        ? { index: fileURLToPath(new URL('./staff.html', import.meta.url)) }
        : {
            main: fileURLToPath(new URL('./index.html', import.meta.url)),
            client: fileURLToPath(new URL('./client.html', import.meta.url)),
            staff: fileURLToPath(new URL('./staff.html', import.meta.url)),
          };

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    build: {
      rollupOptions: { input },
    },
  };
});
