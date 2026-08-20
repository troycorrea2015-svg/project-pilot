/** @type {import("next").NextConfig} */
const nextConfig = {
  eslint: {
    // Vercel production builds should not fail because of a lint-config resolution issue.
    // ESLint is still available through `npm run lint` as a separate quality check.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
