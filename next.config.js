/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['motion'],
  images: {
    domains: ['picsum.photos']
  }
}
module.exports = nextConfig
