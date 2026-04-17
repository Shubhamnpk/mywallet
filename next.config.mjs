import withSerwistInit from "@serwist/next";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const emptyCanvasPath = join(__dirname, "lib", "empty-canvas.js");

/** Set once when Next loads this config (`next dev` vs `next build`), not from `.env.local`. */
const isNextDevelopment = process.env.NODE_ENV === "development"

const withSerwist = withSerwistInit({
  swSrc: "worker/sw.ts",
  swDest: "public/sw.js",
  disable: isNextDevelopment,
  // Replicating some of the old pwa config or using Serwist defaults
  reloadOnOnline: true,
  additionalPrecacheEntries: [
    { url: "/", revision: null },
    { url: "/?source=pwa", revision: null },
    { url: "/settings", revision: null },
    { url: "/settings/", revision: null },
    { url: "/offline.html", revision: null },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    /** Inlined at build time so dev-only UI cannot leak into production bundles. */
    NEXT_PUBLIC_APP_DEV_TOOLS: isNextDevelopment ? "1" : "0",
  },
  images: { unoptimized: true },
  // Force webpack as Serwist uses it for SW bundling
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: emptyCanvasPath,
    };
    return config;
  },
  // Keep turbopack alias for future-proofing
  turbopack: {
    resolveAlias: {
      canvas: emptyCanvasPath,
    },
  },
};

export default withSerwist(nextConfig);
