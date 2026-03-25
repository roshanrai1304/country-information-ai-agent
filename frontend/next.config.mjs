/** @type {import("next").NextConfig} */
const nextConfig = {
  output: 'standalone',  // required for Docker production image
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
    ],
  },
}
export default nextConfig
