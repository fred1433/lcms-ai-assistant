/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals.push('pdf-parse');
    return config;
  },
};

export default nextConfig;
