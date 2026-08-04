/** @type {import('next').NextConfig} */

// The app is served from a sub-path because the target server has no sub-domain
// to spare — e.g. http://host:3000/cms instead of http://cms.host.
//
// basePath is inlined into the client bundle at build time, so changing it requires
// a rebuild (not just a restart). Override it at build time with NEXT_PUBLIC_BASE_PATH;
// set that to an empty string to serve the app from the domain root instead.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/cms";

const nextConfig = {
  reactCompiler: true,
  basePath,
  // Re-export the same value so client code (NextAuth's SessionProvider) builds its
  // URLs from one source of truth rather than a second, drifting copy.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
