import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Replit uses dynamic subdomains under *.replit.dev.
// `allowedHosts` lets the dev server accept those requests.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on 0.0.0.0
    port: Number(process.env.PORT) || 5000, // works with Replit workflow
    allowedHosts: [".replit.dev", "localhost"],
    hmr: {
      clientPort: 443, // so HMR works behind Replit's HTTPS proxy
    },
  },
  preview: {
    host: true,
    port: Number(process.env.PORT) || 5000,
    allowedHosts: [".replit.dev", "localhost"],
  },
});
