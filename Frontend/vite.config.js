import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Force reload for .env changes
  plugins: [react(), tailwindcss()],

  server: {
    port: 5173, // ensure consistent port for proxying
    proxy: {
      "/api": {
        // target: "https://furniture.qtechx.com", 
        target: "http://localhost:5000", // Backend server URL

        changeOrigin: true,
        secure: false,
      },
    },
  },
});
