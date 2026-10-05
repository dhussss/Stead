import type { NextConfig } from "next";

const config: NextConfig = {
  // The core ships as TypeScript source; Next compiles it with the app.
  transpilePackages: ["@stead/core"],
};

export default config;
