import { defineConfig } from "vite";

export default defineConfig({
  // Serve firmware images directly from the existing binaries folder.
  publicDir: "binaries",
  plugins: [],
});
