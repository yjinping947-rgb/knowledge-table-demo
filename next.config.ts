import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // 允许使用 127.0.0.1 打开开发服务时加载 Next 的 HMR/client 资源。
  // 否则页面静态 HTML 能显示，但 React hydration 会被跨源保护阻断，按钮没有事件。
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
