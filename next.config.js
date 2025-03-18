/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: require.resolve('crypto-browserify'),
      path: require.resolve('path-browserify'),
      http: require.resolve('stream-http'),
      querystring: require.resolve('querystring-es3'),
    };
    return config;
  },
};

module.exports = nextConfig;
