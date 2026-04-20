import { defineConfig } from "vite";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  // Serve firmware images directly from the existing binaries folder.
  publicDir: "binaries",
  plugins: [cloudflare()],
});