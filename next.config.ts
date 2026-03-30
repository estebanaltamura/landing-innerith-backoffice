import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/_docs',
        destination: '/_docs/index.html',
      },
    ]
  },
}

export default nextConfig
