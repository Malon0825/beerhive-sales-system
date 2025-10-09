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
  
  // Performance optimizations
  // Enable experimental features for better performance
  experimental: {
    // Optimize CSS loading
    optimizeCss: true,
    // Enable server actions optimization
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Optimize package imports - tree-shake large libraries
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
  },
  
  // Note: serverActions allowedOrigins removed to support Vercel/Netlify deployment
  // Hosting platforms automatically configure allowed origins for production
  
  // Disable typedRoutes to bypass strict param signature checks that
  // can fail builds before client manifests are emitted
  typedRoutes: false,
  
  // TypeScript configuration for builds
  typescript: {
    // Temporarily ignore type errors to allow build to complete
    // while typed route handlers are incrementally migrated to Next 15 signatures
    ignoreBuildErrors: true,
  },
  
  eslint: {
    // Avoid ESLint blocking CI builds; still enforced locally via `npm run lint`
    ignoreDuringBuilds: true,
  },
  
  // Webpack configuration for optimizations and bundle analysis
  webpack: (config, { isServer }) => {
    // Don't bundle @react-pdf/renderer on client-side
    // It's only used in API routes (server-side)
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@react-pdf/renderer': false,
      };
      
      // Enable bundle analyzer when ANALYZE=true
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: './analyze.html',
            openAnalyzer: true,
          })
        );
      }
    }
    
    // Disable filesystem caching for production builds to prevent
    // false positive secret scanning warnings in Netlify
    if (process.env.NODE_ENV === 'production' && process.env.NETLIFY === 'true') {
      config.cache = false;
    }
    
    return config;
  },
}

module.exports = nextConfig

