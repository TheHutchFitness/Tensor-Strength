const previewHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_BASE_URL
      ? new URL(process.env.NEXT_PUBLIC_BASE_URL).host
      : null;
  } catch {
    return null;
  }
})();

const nextConfig = {
  output: 'standalone',
  // Allow Next.js dev resources (/_next/*, HMR) to load through the Emergent
  // preview proxy. The browser origin is *.emergentagent.com while the proxy
  // rewrites Host to *.emergentcf.cloud, so both must be allowlisted or the
  // client JS is blocked (no hydration -> forms/buttons do nothing).
  allowedDevOrigins: [
    ...(previewHost ? [previewHost] : []),
    '**.emergentagent.com',
    '**.emergentcf.cloud',
  ],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com', pathname: '/**' },
    ],
  },
  // Renamed from experimental.serverComponentsExternalPackages in Next 15
  serverExternalPackages: ['mongodb'],
  webpack(config, { dev }) {
    if (dev) {
      // Reduce CPU/memory from file watching
      config.watchOptions = {
        poll: 2000, // check every 2 seconds
        aggregateTimeout: 300, // wait before rebuilding
        ignored: ['**/node_modules'],
      };
    }
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 10000,
    pagesBufferLength: 2,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self';" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
