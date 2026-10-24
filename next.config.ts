import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: 'security',
  },
  turbopack: {
    resolveAlias: {
      '@payload-config': './payload.config.ts',
    },
  },
}
export default withPayload(nextConfig)
