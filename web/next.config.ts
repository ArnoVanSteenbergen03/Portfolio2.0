import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Cache Components (Next 16): data is dynamic by default and we opt into
  // caching per-function with `use cache`. This lets the home page prerender a
  // static shell that keeps serving even when the Pi/CMS is unreachable, and
  // lets Payload push updates instantly via revalidateTag instead of waiting
  // out a fixed ISR window.
  cacheComponents: true,

  images: {
    remotePatterns: [
      // Media uploads served by Payload on the Pi, via the Cloudflare tunnel.
      {
        protocol: 'https',
        hostname: 'cms.avsworks.be',
        pathname: '/api/media/**',
      },
      // Same, for local development against a CMS on localhost:3001.
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/api/media/**',
      },
    ],
  },
}

export default nextConfig
