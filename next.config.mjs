/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode for highlighting potential problems in the application
  reactStrictMode: true,

  // Configure custom webpack settings
  webpack: (config, { isServer }) => {
    // Example: Modify the resolve fallback to handle certain modules on the client-side
    if (!isServer) {
      config.resolve.fallback = {
        fs: false, // Prevents issues with modules that use 'fs' on the client side
      };
    }

    return config;
  },

  // Enable TypeScript strict mode (if using TypeScript)
  typescript: {
    ignoreBuildErrors: false,
  },

  // Allow images from external domains
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "seasonsskateshop.com",
        port: "",
        pathname: "/cdn/**",
      },
      {
        protocol: "https",
        hostname: "thepremierstore.com",
        port: "",
        pathname: "/cdn/shop/**",
      },
      {
        protocol: "https",
        hostname: "laborskateshop.com",
        port: "",
        pathname: "/cdn/**",
      },
      {
        protocol: "https",
        hostname: "njskateshop.com", // Add NJ Skateshop here
        port: "",
        pathname: "/cdn/**", // Ensure this covers NJ Skateshop image paths
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        port: "",
        pathname: "/**",
      },
    ],
  },

  // Other custom settings can be added here
};

export default nextConfig;
