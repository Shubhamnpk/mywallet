import withSerwistInit from "@serwist/next";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const emptyCanvasPath = join(__dirname, "lib", "empty-canvas.js");

const withSerwist = withSerwistInit({
  swSrc: "worker/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
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
