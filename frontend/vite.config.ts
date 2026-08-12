import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El frontend habla con el backend directamente (CORS habilitado en NestJS).
// La URL base de la API y del WebSocket se configuran por variables VITE_*.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
