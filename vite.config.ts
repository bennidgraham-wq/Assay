import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Builds one self-contained HTML file (JS + CSS inlined). data.json ships beside it.
export default defineConfig({ plugins: [react(), viteSingleFile()], base: './' });
