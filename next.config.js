/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // Note: serverActions allowedOrigins removed to support Vercel deployment
  // Vercel automatically configures allowed origins for production
  
  // Fix for Vercel build issues with client reference manifests
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig
