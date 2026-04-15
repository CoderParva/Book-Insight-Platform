/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: 'books.toscrape.com' }],
  },
}
module.exports = nextConfig
