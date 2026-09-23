import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Public Supabase Storage buckets (avatars, course-covers) rendered with next/image.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
};

export default nextConfig;
