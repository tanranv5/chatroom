import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // 使用 unoptimized 模式，不限制图片域名
    unoptimized: true,
  },
};

export default nextConfig;
