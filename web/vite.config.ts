import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/turn": "http://localhost:8787",
      "/healthz": "http://localhost:8787"
    }
  }
});
