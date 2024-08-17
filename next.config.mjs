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

  // Specify custom import aliases (if using a custom import alias)
  // Uncomment and modify the following lines if needed
  // experimental: {
  //   modularizeImports: {
  //     '@components': {
  //       transform: '@components/{{member}}',
  //     },
  //   },
  // },

  // Internationalization settings (optional)
  // i18n: {
  //   locales: ['en', 'fr'],
  //   defaultLocale: 'en',
  // },

  // Enable TypeScript strict mode (if using TypeScript)
  typescript: {
    ignoreBuildErrors: false,
  },

  // Allow images from external domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'seasonsskateshop.com',
        port: '',
        pathname: '/cdn/**',
      },
    ],
  },

  // Other custom settings can be added here
};

export default nextConfig;
