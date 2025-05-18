/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['server.crm-sb.com', 'localhost'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'server.crm-sb.com',
        port: '32778',
        pathname: '/api/files/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8090',
        pathname: '/api/files/**',
      }
    ],
  },
  // Diğer yapılandırmalar
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
