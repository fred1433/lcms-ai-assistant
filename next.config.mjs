/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.externals.push('pdf-parse');
    }
    return config;
  },
  output: 'standalone',
  experimental: {
    outputFileTracingIncludes: {
      '/api/load-documents': ['./documents/**/*.pdf', './documents/**/*.csv'],
    },
  },
};

export default nextConfig;
