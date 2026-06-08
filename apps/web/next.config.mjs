/** @type {import('next').NextConfig} */
const distDir = process.env.NEXT_DIST_DIR ?? '.next';

const nextConfig = {
  distDir,
  transpilePackages: ['@shelby-protocol/sdk', '@aptos-labs/ts-sdk'],
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 10,
  },
  webpack: (config, { dev }) => {
    if (dev && config.cache && typeof config.cache === 'object') {
      config.cache = {
        ...config.cache,
        compression: false,
      };
    }

    return config;
  },
};

export default nextConfig;
