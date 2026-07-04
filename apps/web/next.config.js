/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',           // Docker için standalone build
  transpilePackages: ['@intern-tracker/shared'],
  images: {
    domains: ['i.pravatar.cc'],
  },
};

module.exports = nextConfig;
